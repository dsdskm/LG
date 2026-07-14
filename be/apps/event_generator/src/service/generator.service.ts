import { Injectable } from '@nestjs/common';
import { McapWriter } from '@mcap/core';
import { FileHandleWritable } from '@mcap/nodejs';
import { open, readFile, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { SendBody } from '../dto/send-body.dto';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

type LogTemplate = {
  subsystem: string;
  node: string;
  level?: LogLevel;
  message: string;
};

type GenConfig = {
  durationMinutes: number;
  logsPerSecond: number;
  errorTemplates: string[];
  errorCount: number;
  robotIdCount: number;
  robotIds: string[];
};

type SendMeta = {
  batchId: string;
  logCount: number;
  bytes: number;
  source: 'event_generator';
  durationMin: number;
  receiverUrl: string;
  receiverStatus: number;
  receiverJson: unknown;
};

type SendResult = {
  meta: SendMeta;
  buffer: Buffer;
};

type NormalizedSendBody = {
  config: Partial<GenConfig>;
  receiverUrl?: string;
};

type RuntimeConfig = GenConfig & {
  receiverUrl: string;
};

const DEFAULT_RECEIVER_URL = 'http://localhost:3001';

// ROS2 노드명 후보
const ROS2_NODES = [
  // navigation / localization
  'nav2_controller',
  'bt_navigator',
  'planner_server',
  'behavior_server',
  'amcl',
  'map_server',
  'waypoint_follower',
  'local_costmap',
  'global_costmap',

  // perception / sensors
  'lidar_driver',
  'camera_front',
  'camera_rear',
  'depth_processor',
  'object_detector',
  'person_tracker',
  'aruco_detector',
  'qr_reader',
  'sensor_fusion',
  'imu_filter',
  'ultrasonic_driver',

  // actuator / base / manipulation
  'motor_controller',
  'base_controller',
  'joint_state_publisher',
  'arm_controller',
  'gripper_controller',
  'lift_controller',
  'door_controller',

  // system / fleet / hri
  'battery_monitor',
  'dock_manager',
  'mission_manager',
  'fleet_adapter',
  'task_allocator',
  'speech_node',
  'hri_panel',
  'robot_state_publisher',
  'diagnostic_aggregator',
  'network_monitor',
  'dds_bridge',
  'system_watchdog',
  'health_monitor',
];

// 정상 로그 템플릿
const ROS2_NORMAL_TEMPLATES: LogTemplate[] = [
  // Navigation
  {
    subsystem: 'navigation',
    node: 'nav2_controller',
    message: '[nav2_controller] Following path, {n} poses remaining',
  },
  {
    subsystem: 'navigation',
    node: 'bt_navigator',
    message: '[bt_navigator] Ticking NavigateToPose -> RUNNING',
  },
  {
    subsystem: 'navigation',
    node: 'planner_server',
    message: '[planner_server] Global path generated: length={path_len}m, poses={poses}',
  },
  {
    subsystem: 'navigation',
    node: 'waypoint_follower',
    message: '[waypoint_follower] Waypoint {waypoint}/{waypoint_total} reached',
  },
  {
    subsystem: 'navigation',
    node: 'behavior_server',
    message: '[behavior_server] Recovery behavior standby: clear_costmap available',
  },
  {
    subsystem: 'navigation',
    node: 'local_costmap',
    message: '[local_costmap] Costmap update rate {hz}Hz, obstacles={obstacles}',
  },
  {
    subsystem: 'navigation',
    node: 'global_costmap',
    message: '[global_costmap] Map received {map_w}x{map_h} @ {resolution}m/px',
  },

  // Localization / TF
  {
    subsystem: 'localization',
    node: 'amcl',
    message: '[amcl] Pose update: x={x} y={y} yaw={yaw}, particles={particles}',
  },
  {
    subsystem: 'localization',
    node: 'robot_state_publisher',
    message: '[robot_state_publisher] Published TF map->odom->base_link->laser',
  },
  {
    subsystem: 'localization',
    node: 'imu_filter',
    message: '[imu_filter] IMU orientation fused, yaw_rate={yaw_rate}rad/s',
  },
  {
    subsystem: 'localization',
    node: 'sensor_fusion',
    message: '[sensor_fusion] IMU+odom fused, est drift {drift}m',
  },

  // Sensors / Perception
  {
    subsystem: 'perception',
    node: 'lidar_driver',
    message: '[lidar_driver] Scan received: {scan_points} points @ {scan_hz}Hz',
  },
  {
    subsystem: 'perception',
    node: 'camera_front',
    message: '[camera_front] Frame captured {image_w}x{image_h}, exposure={exposure}ms',
  },
  {
    subsystem: 'perception',
    node: 'camera_rear',
    message: '[camera_rear] Frame captured {image_w}x{image_h}, fps={fps}',
  },
  {
    subsystem: 'perception',
    node: 'depth_processor',
    message: '[depth_processor] Depth cloud filtered: valid_points={valid_points}, range={range}m',
  },
  {
    subsystem: 'perception',
    node: 'object_detector',
    message: '[object_detector] Detected {objects} objects, latency={latency}ms',
  },
  {
    subsystem: 'perception',
    node: 'person_tracker',
    message: '[person_tracker] Tracking {persons} persons, selected_id={track_id}',
  },
  {
    subsystem: 'perception',
    node: 'aruco_detector',
    message: '[aruco_detector] Marker id={marker_id} detected, distance={distance}m',
  },
  {
    subsystem: 'perception',
    node: 'qr_reader',
    message: '[qr_reader] QR candidate decoded, confidence={confidence}',
  },
  {
    subsystem: 'perception',
    node: 'ultrasonic_driver',
    message: '[ultrasonic_driver] Range front={front_range}m left={left_range}m right={right_range}m',
  },

  // Base / Motor
  {
    subsystem: 'base',
    node: 'motor_controller',
    message: '[motor_controller] Wheel vel L={vl} R={vr} m/s',
  },
  {
    subsystem: 'base',
    node: 'base_controller',
    message: '[base_controller] cmd_vel applied: linear={linear}m/s angular={angular}rad/s',
  },
  {
    subsystem: 'base',
    node: 'joint_state_publisher',
    message: '[joint_state_publisher] Published {joint_count} joint states',
  },

  // Manipulator / Gripper
  {
    subsystem: 'manipulation',
    node: 'arm_controller',
    message: '[arm_controller] Arm trajectory point {traj_idx}/{traj_total} executed',
  },
  {
    subsystem: 'manipulation',
    node: 'arm_controller',
    message: '[arm_controller] Joint target accepted: shoulder={joint_pos}rad elbow={joint_pos2}rad',
  },
  {
    subsystem: 'manipulation',
    node: 'gripper_controller',
    message: '[gripper_controller] Gripper width={grip_width}m force={grip_force}N',
  },
  {
    subsystem: 'manipulation',
    node: 'gripper_controller',
    message: '[gripper_controller] Object grasp check passed, slip={slip_rate}',
  },

  // Battery / Docking
  {
    subsystem: 'power',
    node: 'battery_monitor',
    message: '[battery_monitor] Battery {batt}% ({volt}V), discharging',
  },
  {
    subsystem: 'power',
    node: 'battery_monitor',
    message: '[battery_monitor] Current draw={current}A, estimated_runtime={runtime_min}min',
  },
  {
    subsystem: 'docking',
    node: 'dock_manager',
    message: '[dock_manager] Docking alignment offset={dock_offset}m angle={dock_angle}deg',
  },
  {
    subsystem: 'docking',
    node: 'dock_manager',
    message: '[dock_manager] Charging contact detected, state=CHARGING',
  },

  // Mission / Fleet
  {
    subsystem: 'mission',
    node: 'mission_manager',
    message: '[mission_manager] Mission {mission_id} step {mission_step}/{mission_total} running',
  },
  {
    subsystem: 'mission',
    node: 'task_allocator',
    message: '[task_allocator] Assigned task={task_type} priority={priority}',
  },
  {
    subsystem: 'fleet',
    node: 'fleet_adapter',
    message: '[fleet_adapter] Fleet heartbeat received, queue_size={queue_size}',
  },
  {
    subsystem: 'fleet',
    node: 'fleet_adapter',
    message: '[fleet_adapter] Robot state published: mode={robot_mode}, location={zone_id}',
  },

  // Elevator / Door / Building
  {
    subsystem: 'building',
    node: 'lift_controller',
    message: '[lift_controller] Elevator call requested: floor={floor_from}->floor={floor_to}',
  },
  {
    subsystem: 'building',
    node: 'lift_controller',
    message: '[lift_controller] Elevator door state={door_state}, cabin_ready={bool_state}',
  },
  {
    subsystem: 'building',
    node: 'door_controller',
    message: '[door_controller] Auto-door signal received, open_ratio={open_ratio}',
  },

  // HRI / Speech / UI
  {
    subsystem: 'hri',
    node: 'speech_node',
    message: '[speech_node] TTS request accepted: lang=ko-KR, duration={tts_duration}s',
  },
  {
    subsystem: 'hri',
    node: 'speech_node',
    message: '[speech_node] ASR partial result received, confidence={confidence}',
  },
  {
    subsystem: 'hri',
    node: 'hri_panel',
    message: '[hri_panel] User selected menu={menu_id}, session={session_id}',
  },

  // Network / DDS
  {
    subsystem: 'network',
    node: 'network_monitor',
    message: '[network_monitor] WiFi RSSI={rssi}dBm, packet_loss={packet_loss}%',
  },
  {
    subsystem: 'network',
    node: 'dds_bridge',
    message: '[dds_bridge] DDS peers={dds_peers}, topics={topic_count}, latency={latency}ms',
  },

  // Diagnostics / System
  {
    subsystem: 'diagnostics',
    node: 'diagnostic_aggregator',
    message: '[diagnostic_aggregator] Diagnostics OK: cpu={cpu}% mem={mem}% temp={temp}C',
  },
  {
    subsystem: 'diagnostics',
    node: 'health_monitor',
    message: '[health_monitor] Node alive check passed: {alive_nodes}/{total_nodes} nodes',
  },
  {
    subsystem: 'diagnostics',
    node: 'system_watchdog',
    message: '[system_watchdog] Watchdog tick, loop_jitter={jitter}ms',
  },
];

// 에러 로그 템플릿
const ROS2_ERROR_TEMPLATES = [
  // Navigation / Localization
  '[lidar_driver] Lidar scan timeout: no data on /scan for {ms}ms',
  '[amcl] Localization jump detected: {jump}m / {rad}rad within 100ms',
  '[nav2_controller] Controller failed: no valid control command, aborting goal',
  '[planner_server] Global planning failed: start pose outside known map',
  '[bt_navigator] BehaviorTree returned FAILURE: recovery fallback exhausted',
  '[tf2] Lookup transform failed: "base_link"->"map" extrapolation into the future',
  '[local_costmap] Costmap update missed deadline: expected {hz}Hz, actual {low_hz}Hz',

  // Perception
  '[camera_front] Camera frame drop detected: no image for {ms}ms',
  '[depth_processor] Depth frame invalid: NaN ratio {nan_ratio}% exceeds threshold',
  '[object_detector] Inference timeout: latency={high_latency}ms exceeds budget',
  '[person_tracker] Track lost: selected_id={track_id}, occlusion timeout {ms}ms',
  '[aruco_detector] Marker pose unstable: reprojection_error={reproj_error}px',

  // Base / Motor
  '[motor_controller] Motor 2 overcurrent: {amp}A exceeds 10.0A limit, disabling output',
  '[base_controller] cmd_vel rejected: safety limiter active',
  '[joint_state_publisher] Joint state stale: last update {ms}ms ago',

  // Manipulator
  '[arm_controller] Trajectory aborted: joint limit violation on joint_{joint_id}',
  '[arm_controller] FollowJointTrajectory timeout: error={joint_error}rad',
  '[gripper_controller] Grasp failed: force={grip_force}N, object slip detected',
  '[gripper_controller] Gripper stall detected: current={current}A',

  // Safety
  '[safety] E-STOP engaged: hardware emergency button pressed',
  '[safety] Bumper triggered: front_left contact detected',
  '[safety] Safety zone violation: obstacle distance={front_range}m',
  '[safety] Tilt detected: roll={roll}deg pitch={pitch}deg',

  // Battery / Docking
  '[battery_monitor] Battery critical: {batt}% ({volt}V), forcing return-to-dock',
  '[battery_monitor] Battery temperature high: {temp}C',
  '[dock_manager] Docking failed: contact sensor not detected within {ms}ms',
  '[dock_manager] Charging current unstable: current={current}A',

  // Fleet / Mission
  '[mission_manager] Mission aborted: task={task_type}, reason=precondition_failed',
  '[task_allocator] Task assignment failed: no available robot in zone={zone_id}',
  '[fleet_adapter] Fleet heartbeat lost: no update for {ms}ms',
  '[fleet_adapter] Schedule conflict detected: waypoint={waypoint}',

  // Elevator / Door
  '[lift_controller] Elevator request timeout: floor={floor_from}->floor={floor_to}',
  '[lift_controller] Elevator door blocked for {ms}ms',
  '[door_controller] Door open failed: controller response timeout',

  // Network / DDS
  '[network_monitor] Network unstable: packet_loss={high_packet_loss}% rssi={rssi}dBm',
  '[dds_bridge] DDS discovery failed: peer_count=0 for {ms}ms',
  '[dds_bridge] Topic bridge backlog high: queue_size={large_queue}',

  // HRI / Speech
  '[speech_node] ASR failed: low confidence={confidence}',
  '[speech_node] TTS playback error: audio device unavailable',
  '[hri_panel] Touch input timeout: session={session_id}',

  // System
  '[diagnostic_aggregator] CPU overload: cpu={high_cpu}% for {ms}ms',
  '[diagnostic_aggregator] Memory pressure: mem={high_mem}%',
  '[system_watchdog] Node unresponsive: node={dead_node}, missed_heartbeats={missed}',
  '[health_monitor] Process crash detected: node={dead_node}, exit_code={exit_code}',
];

const DEFAULT_CONFIG: GenConfig = {
  durationMinutes: 1,
  logsPerSecond: 30,
  errorTemplates: ROS2_ERROR_TEMPLATES,
  errorCount: 10,
  robotIdCount: 3,
  robotIds: buildRobotIds(3),
};

// 템플릿의 {placeholder} 를 그럴듯한 난수 값으로 채운다.
function fillTemplate(tpl: string, seq: number): string {
  const baseRand = (salt = 0) =>
    (((seq + salt) * 9301 + 49297) % 233280) / 233280;

  const r = (min: number, max: number, dp = 2, salt = 0) =>
    (min + baseRand(salt) * (max - min)).toFixed(dp);

  const ri = (min: number, max: number, salt = 0) =>
    String(Math.floor(min + baseRand(salt) * (max - min + 1)));

  const pick = <T>(arr: readonly T[], salt = 0): T =>
    arr[Math.floor(baseRand(salt) * arr.length)];

  const map: Record<string, string> = {
    // common navigation
    n: ri(1, 20, 1),
    x: r(-12, 12, 2, 2),
    y: r(-12, 12, 2, 3),
    yaw: r(-3.14, 3.14, 2, 4),
    hz: r(8, 10, 1, 5),
    low_hz: r(1, 4, 1, 6),
    path_len: r(1, 45, 2, 7),
    poses: ri(8, 180, 8),
    waypoint: ri(1, 12, 9),
    waypoint_total: ri(12, 24, 10),
    particles: ri(300, 900, 11),
    drift: r(0, 0.08, 3, 12),
    yaw_rate: r(-0.4, 0.4, 3, 13),
    resolution: pick(['0.03', '0.05', '0.10'], 14),
    map_w: pick(['256', '384', '512', '1024'], 15),
    map_h: pick(['256', '384', '512', '1024'], 16),

    // sensors / perception
    scan_points: pick(['720', '1080', '1440'], 17),
    scan_hz: pick(['10.0', '15.0', '20.0'], 18),
    image_w: pick(['640', '848', '1280', '1920'], 19),
    image_h: pick(['480', '720', '1080'], 20),
    exposure: r(2, 16, 1, 21),
    fps: r(15, 30, 1, 22),
    valid_points: ri(12000, 250000, 23),
    range: r(0.5, 8.0, 2, 24),
    objects: ri(0, 12, 25),
    persons: ri(0, 8, 26),
    track_id: ri(1, 99, 27),
    marker_id: ri(1, 50, 28),
    distance: r(0.4, 5.0, 2, 29),
    confidence: r(0.45, 0.99, 2, 30),
    front_range: r(0.08, 2.5, 2, 31),
    left_range: r(0.1, 3.0, 2, 32),
    right_range: r(0.1, 3.0, 2, 33),
    nan_ratio: r(10, 80, 1, 34),
    high_latency: ri(120, 800, 35),
    reproj_error: r(4, 25, 2, 36),

    // base / motor
    vl: r(0, 0.8, 2, 37),
    vr: r(0, 0.8, 2, 38),
    linear: r(-0.2, 0.8, 2, 39),
    angular: r(-1.2, 1.2, 2, 40),
    joint_count: ri(6, 24, 41),
    amp: r(10, 18, 1, 42),

    // manipulation
    traj_idx: ri(1, 8, 43),
    traj_total: ri(8, 16, 44),
    joint_pos: r(-1.5, 1.5, 2, 45),
    joint_pos2: r(-1.5, 1.5, 2, 46),
    grip_width: r(0.01, 0.08, 3, 47),
    grip_force: r(2, 35, 1, 48),
    slip_rate: r(0, 0.08, 3, 49),
    joint_id: ri(1, 6, 50),
    joint_error: r(0.1, 0.7, 3, 51),

    // power / docking
    batt: ri(3, 100, 52),
    volt: r(21, 29, 1, 53),
    current: r(0.2, 8.0, 1, 54),
    runtime_min: ri(5, 240, 55),
    dock_offset: r(-0.25, 0.25, 3, 56),
    dock_angle: r(-12, 12, 1, 57),

    // mission / fleet
    mission_id: `M-${ri(1000, 9999, 58)}`,
    mission_step: ri(1, 10, 59),
    mission_total: ri(10, 30, 60),
    task_type: pick(['delivery', 'guide', 'inspection', 'patrol', 'pickup'], 61),
    priority: pick(['LOW', 'NORMAL', 'HIGH', 'URGENT'], 62),
    queue_size: ri(0, 50, 63),
    robot_mode: pick(['IDLE', 'MOVING', 'DOCKING', 'PAUSED', 'ERROR_RECOVERY'], 64),
    zone_id: pick(['A-1', 'A-2', 'B-1', 'B-3', 'LOBBY', 'LAB', 'STATION'], 65),

    // building
    floor_from: ri(1, 12, 66),
    floor_to: ri(1, 12, 67),
    door_state: pick(['OPEN', 'CLOSED', 'OPENING', 'CLOSING', 'BLOCKED'], 68),
    bool_state: pick(['true', 'false'], 69),
    open_ratio: r(0, 1, 2, 70),

    // hri
    tts_duration: r(0.5, 6.0, 1, 71),
    menu_id: pick(['home', 'delivery', 'guide', 'help', 'settings'], 72),
    session_id: `S-${ri(10000, 99999, 73)}`,

    // network / system
    rssi: ri(-85, -35, 74),
    packet_loss: r(0, 4, 2, 75),
    high_packet_loss: r(15, 80, 1, 76),
    dds_peers: ri(1, 12, 77),
    topic_count: ri(20, 180, 78),
    latency: r(2, 80, 1, 79),
    cpu: r(8, 75, 1, 80),
    high_cpu: r(85, 99, 1, 81),
    mem: r(20, 80, 1, 82),
    high_mem: r(85, 99, 1, 83),
    temp: r(35, 78, 1, 84),
    alive_nodes: ri(20, 60, 85),
    total_nodes: ri(60, 80, 86),
    jitter: r(0.2, 15, 2, 87),
    ms: ri(200, 3000, 88),
    large_queue: ri(100, 2000, 89),
    dead_node: pick(ROS2_NODES, 90),
    missed: ri(3, 30, 91),
    exit_code: pick(['-6', '-9', '1', '11', '134', '137'], 92),

    // safety
    jump: r(1, 2.5, 2, 93),
    rad: r(0.2, 0.8, 2, 94),
    roll: r(-18, 18, 1, 95),
    pitch: r(-18, 18, 1, 96),
  };

  return tpl.replace(/\{(\w+)\}/g, (_m, k) => map[k] ?? _m);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function randomPick<T>(arr: readonly T[]): T {
  return arr[(Math.random() * arr.length) | 0];
}

function buildRobotIds(count: number) {
  const n = clamp(Number(count || 1), 1, 9999);
  return Array.from({ length: n }, (_, i) => `R-${String(i + 1).padStart(3, '0')}`);
}

function parseStringList(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean);
  }

  return undefined;
}

function parseNodeFromMessage(message: string): string | undefined {
  const nodeMatch = message.match(/^\[([\w/.-]+)\]/);
  return nodeMatch ? nodeMatch[1] : undefined;
}

function inferSubsystemFromNode(node: string): string {
  if (
    [
      'nav2_controller',
      'bt_navigator',
      'planner_server',
      'behavior_server',
      'waypoint_follower',
      'local_costmap',
      'global_costmap',
    ].includes(node)
  ) {
    return 'navigation';
  }

  if (['amcl', 'map_server', 'robot_state_publisher', 'imu_filter', 'sensor_fusion'].includes(node)) {
    return 'localization';
  }

  if (
    [
      'lidar_driver',
      'camera_front',
      'camera_rear',
      'depth_processor',
      'object_detector',
      'person_tracker',
      'aruco_detector',
      'qr_reader',
      'ultrasonic_driver',
    ].includes(node)
  ) {
    return 'perception';
  }

  if (['motor_controller', 'base_controller', 'joint_state_publisher'].includes(node)) {
    return 'base';
  }

  if (['arm_controller', 'gripper_controller'].includes(node)) {
    return 'manipulation';
  }

  if (['battery_monitor'].includes(node)) {
    return 'power';
  }

  if (['dock_manager'].includes(node)) {
    return 'docking';
  }

  if (['mission_manager', 'task_allocator'].includes(node)) {
    return 'mission';
  }

  if (['fleet_adapter'].includes(node)) {
    return 'fleet';
  }

  if (['lift_controller', 'door_controller'].includes(node)) {
    return 'building';
  }

  if (['speech_node', 'hri_panel'].includes(node)) {
    return 'hri';
  }

  if (['network_monitor', 'dds_bridge'].includes(node)) {
    return 'network';
  }

  if (['diagnostic_aggregator', 'system_watchdog', 'health_monitor'].includes(node)) {
    return 'diagnostics';
  }

  if (node === 'safety') {
    return 'safety';
  }

  return 'system';
}

@Injectable()
export class GeneratorService {
  private readonly defaultReceiverUrl =
    process.env.URL_EVENT_RECEIVER ?? DEFAULT_RECEIVER_URL;

  async handleSend(body: SendBody): Promise<SendResult> {
    const normalized = this.normalizeSendBody(body);
    const runtimeConfig = this.resolveRuntimeConfig(
      normalized.config,
      normalized.receiverUrl,
    );

    const plan = this.buildPlan(runtimeConfig);

    const { batchId, filePath } = this.makeBatchPath();
    const { logCount } = await this.writeMcap({
      config: runtimeConfig,
      filePath,
      startTs: plan.startTs,
      stepMs: plan.stepMs,
      total: plan.total,
      errorIndexSet: plan.errorIndexSet,
    });

    const buf = await readFile(filePath);

    const { receiverStatus, receiverJson } = await this.forwardToReceiver({
      receiverUrl: runtimeConfig.receiverUrl,
      batchId,
      durationMin: runtimeConfig.durationMinutes,
      logCount,
      buffer: buf,
    });

    await rm(filePath, { force: true }).catch(() => {});

    const bytes = buf.length;
    return {
      meta: {
        batchId,
        logCount,
        bytes,
        source: 'event_generator',
        durationMin: runtimeConfig.durationMinutes,
        receiverUrl: runtimeConfig.receiverUrl,
        receiverStatus,
        receiverJson,
      },
      buffer: buf,
    };
  }

  private normalizeSendBody(body: SendBody): NormalizedSendBody {
    const errorTemplates = parseStringList(body.errorTemplates);
    const robotIds = parseStringList(body.robotIds);

    return {
      receiverUrl: body.receiverUrl,
      config: {
        durationMinutes: body.durationMinutes,
        logsPerSecond: body.logsPerSecond,
        errorCount: body.errorCount,
        errorTemplates,
        robotIdCount: body.robotIdCount,
        robotIds,
      },
    };
  }

  private resolveRuntimeConfig(
    partial: Partial<GenConfig>,
    receiverUrl?: string,
  ): RuntimeConfig {
    let resolvedReceiverUrl = this.defaultReceiverUrl;

    if (receiverUrl) {
      const candidate = receiverUrl.trim();
      const isLoopback =
        /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(
          candidate,
        );
      if (!isLoopback) {
        resolvedReceiverUrl = candidate;
      }
    }

    const durationMinutes = clamp(
      Number(partial.durationMinutes ?? DEFAULT_CONFIG.durationMinutes),
      1,
      60,
    );

    const logsPerSecond = clamp(
      Number(partial.logsPerSecond ?? DEFAULT_CONFIG.logsPerSecond),
      1,
      500,
    );

    const errorCount = clamp(
      Number(partial.errorCount ?? DEFAULT_CONFIG.errorCount),
      0,
      100000,
    );

    const errorTemplates = (
      partial.errorTemplates ?? DEFAULT_CONFIG.errorTemplates
    ).filter(Boolean);

    const robotIdCount = clamp(
      Number(partial.robotIdCount ?? DEFAULT_CONFIG.robotIdCount),
      1,
      9999,
    );

    const robotIds =
      partial.robotIds && partial.robotIds.filter(Boolean).length > 0
        ? partial.robotIds.filter(Boolean)
        : buildRobotIds(robotIdCount);

    return {
      durationMinutes,
      logsPerSecond,
      errorTemplates,
      errorCount,
      robotIdCount,
      robotIds,
      receiverUrl: resolvedReceiverUrl,
    };
  }

  private buildPlan(config: GenConfig) {
    // 너무 큰 MCAP 생성을 피하기 위해 실제 생성 로그 수는 10~100 사이 랜덤 유지.
    // 대신 errorCount는 최대 total의 40%까지만 반영한다.
    const total = 10 + Math.floor(Math.random() * 91); // 10..100

    const desiredErrorCount = clamp(
      Number(config.errorCount ?? 0),
      0,
      Math.max(0, Math.floor(total * 0.4)),
    );

    const errorIndexSet = new Set<number>();

    if (desiredErrorCount > 0) {
      // 에러는 뒤쪽 40%에 더 많이 배치해서 에러 직전 컨텍스트가 생기도록 함.
      const minErrorPos = Math.max(0, Math.ceil(total * 0.6));
      const errorRange = Math.max(1, total - minErrorPos);

      while (errorIndexSet.size < desiredErrorCount) {
        const idx = minErrorPos + Math.floor(Math.random() * errorRange);
        errorIndexSet.add(clamp(idx, 0, total - 1));
      }
    }

    const endTs = Date.now();
    const startTs = endTs - config.durationMinutes * 60_000;
    const stepMs = total > 1 ? Math.floor((endTs - startTs) / (total - 1)) : 0;

    return { total, startTs, stepMs, errorIndexSet };
  }

  private makeBatchPath() {
    const endTs = Date.now();
    const batchId = `b_${endTs}_${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`;
    const filePath = path.join(os.tmpdir(), `${batchId}.mcap`);
    return { batchId, filePath };
  }

  private async forwardToReceiver(args: {
    receiverUrl: string;
    batchId: string;
    durationMin: number;
    logCount: number;
    buffer: Buffer;
  }) {
    const res = await fetch(`${args.receiverUrl}/events/ingest/mcap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-batch-id': args.batchId,
        'x-source': 'event_generator',
        'x-duration-min': String(args.durationMin),
        'x-log-count': String(args.logCount),
      },
      body: new Uint8Array(args.buffer),
    });

    let receiverJson: unknown = {};
    try {
      receiverJson = await res.json();
    } catch {
      try {
        receiverJson = { text: await res.text() };
      } catch {
        receiverJson = {};
      }
    }

    return { receiverStatus: res.status, receiverJson };
  }

  private async writeMcap(opts: {
    config: GenConfig;
    filePath: string;
    startTs: number;
    stepMs: number;
    total: number;
    errorIndexSet: Set<number>;
  }) {
    const fh = await open(opts.filePath, 'w');
    const writer = new McapWriter({
      writable: new FileHandleWritable(fh),
    });

    let started = false;
    let written = 0;

    try {
      await writer.start({
        profile: 'custom',
        library: 'event_generator_mcap',
      });

      started = true;

      const schemaId = await writer.registerSchema({
        name: 'RobotLog',
        encoding: 'jsonschema',
        data: new TextEncoder().encode(
          JSON.stringify({
            type: 'object',
            properties: {
              robotId: { type: 'string' },
              subsystem: { type: 'string' },
              node: { type: 'string' },
              seq: { type: 'integer' },
              ts: { type: 'integer' },
              level: { type: 'string' },
              message: { type: 'string' },
            },
            required: [
              'robotId',
              'subsystem',
              'node',
              'seq',
              'ts',
              'level',
              'message',
            ],
          }),
        ),
      });

      const channelId = await writer.registerChannel({
        schemaId,
        topic: '/rosout',
        messageEncoding: 'json',
        metadata: new Map([['source', 'event_generator']]),
      });

      const normalLevels: LogLevel[] = ['DEBUG', 'INFO', 'WARN'];
      const robotIds = opts.config.robotIds.length
        ? opts.config.robotIds
        : ['R-001'];

      for (let i = 0; i < opts.total; i++) {
        const ts = opts.startTs + i * opts.stepMs;
        const isErr = opts.errorIndexSet.has(i);

        let level: LogLevel;
        let rawMessage: string;
        let node: string;
        let subsystem: string;

        if (isErr) {
          level = 'ERROR';

          rawMessage = randomPick(
            opts.config.errorTemplates.length
              ? opts.config.errorTemplates
              : ROS2_ERROR_TEMPLATES,
          );

          const parsedNode = parseNodeFromMessage(rawMessage);
          node = parsedNode ?? randomPick(ROS2_NODES);
          subsystem = inferSubsystemFromNode(node);
        } else {
          const tpl = randomPick(ROS2_NORMAL_TEMPLATES);

          level = tpl.level ?? randomPick(normalLevels);
          rawMessage = tpl.message;
          node = tpl.node;
          subsystem = tpl.subsystem;
        }

        const message = fillTemplate(rawMessage, i + 1);
        const robotId = randomPick(robotIds);

        const obj = {
          robotId,
          subsystem,
          node,
          seq: i + 1,
          ts,
          level,
          message,
        };

        const data = new TextEncoder().encode(JSON.stringify(obj));

        await writer.addMessage({
          channelId,
          sequence: i + 1,
          logTime: BigInt(ts) * 1_000_000n,
          publishTime: BigInt(ts) * 1_000_000n,
          data,
        });

        written++;
      }

      await writer.end();

      return { logCount: written };
    } finally {
      if (started) {
        await fh.sync().catch(() => {});
      }

      await fh.close().catch(() => {});
    }
  }
}
``