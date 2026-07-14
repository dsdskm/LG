import rclpy
from rclpy.node import Node
from nav_msgs.msg import OccupancyGrid, Odometry
from std_msgs.msg import Header
from visualization_msgs.msg import Marker, MarkerArray
import math
import random
import time

from robot_wanderer.mcap_recorder import ErrorMcapRecorder


MAP_WIDTH = 20
MAP_HEIGHT = 20
MAP_RESOLUTION = 0.1
ROBOT_SPEED = 0.2
WAYPOINT_THRESHOLD = 0.5
NUM_ROBOTS = 10


class Robot:
    def __init__(self, robot_id: str):
        self.id = robot_id
        margin = 2.0
        half = MAP_WIDTH / 2.0 - margin
        self.x = random.uniform(-half, half)
        self.y = random.uniform(-half, half)
        self.yaw = random.uniform(-math.pi, math.pi)
        self.stuck_count = 0
        self.total_distance = 0.0

        # HW 상태
        self.battery_voltage = random.uniform(23.0, 25.2)
        self.battery_percent = (self.battery_voltage - 20.0) / (25.2 - 20.0) * 100.0
        self.motor_temp_left = random.uniform(35.0, 45.0)
        self.motor_temp_right = random.uniform(35.0, 45.0)
        self.cpu_usage = random.uniform(15.0, 30.0)
        self.cpu_temp = random.uniform(45.0, 55.0)
        self.lidar_ok = True
        self.camera_ok = True
        self.imu_ok = True
        self.network_ok = True
        self.can_ok = True
        self.localization_score = random.uniform(0.8, 1.0)

        self._last_log: dict = {}

    def cooldown(self, key, sec=10) -> bool:
        now = time.time()
        k = f'{self.id}_{key}'
        if k not in self._last_log or now - self._last_log[k] > sec:
            self._last_log[k] = now
            return True
        return False

    def update_status(self):
        self.battery_voltage -= random.uniform(0.001, 0.003)
        self.battery_voltage = max(20.0, self.battery_voltage)
        self.battery_percent = (self.battery_voltage - 20.0) / (25.2 - 20.0) * 100.0
        self.motor_temp_left = max(30.0, min(95.0, self.motor_temp_left + random.uniform(-0.3, 0.6)))
        self.motor_temp_right = max(30.0, min(95.0, self.motor_temp_right + random.uniform(-0.3, 0.6)))
        self.cpu_usage = max(10.0, min(100.0, self.cpu_usage + random.uniform(-5.0, 5.0)))
        self.cpu_temp = max(40.0, min(90.0, self.cpu_temp + random.uniform(-0.5, 0.8)))
        self.localization_score = max(0.0, min(1.0, self.localization_score + random.uniform(-0.05, 0.05)))
        if random.random() < 0.008: self.lidar_ok = not self.lidar_ok
        if random.random() < 0.006: self.camera_ok = not self.camera_ok
        if random.random() < 0.003: self.imu_ok = not self.imu_ok
        if random.random() < 0.015: self.network_ok = not self.network_ok
        if random.random() < 0.004: self.can_ok = not self.can_ok


class _ComponentLogger:
    """노드 자체 로거를 감싸 메시지 앞에 고정 프리픽스를 붙이는 얇은 래퍼.
    호출부는 lg.info/warn/error/fatal 을 그대로 쓰되, 출력은 노드 로거(→ /rosout)로 간다."""
    __slots__ = ('_logger', '_prefix')

    def __init__(self, logger, prefix: str):
        self._logger = logger
        self._prefix = prefix

    def info(self, msg):
        self._logger.info(self._prefix + msg)

    def warn(self, msg):
        self._logger.warn(self._prefix + msg)

    def error(self, msg):
        self._logger.error(self._prefix + msg)

    def fatal(self, msg):
        self._logger.fatal(self._prefix + msg)


class WandererNode(Node):
    def __init__(self):
        super().__init__('wanderer_node')

        self.map_pub = self.create_publisher(OccupancyGrid, '/map', 1)
        self.odom_pub = self.create_publisher(MarkerArray, '/all_robots', 10)
        self.robot_marker_pub = self.create_publisher(MarkerArray, '/robot_markers', 10)
        self.goal_marker_pub = self.create_publisher(Marker, '/goal_marker', 10)

        self.map_msg = self._build_map()
        self.robots = [Robot(f'Robot-{i+1:03d}') for i in range(NUM_ROBOTS)]

        # 컴포넌트별 로거 래퍼 캐시.
        # NOTE: get_child() 로 만든 child logger 는 ROS2 Humble 에서 /rosout 으로 발행되지 않는다
        # (rosout publisher 는 노드 자체 로거 이름에만 연결됨). 그래서 모든 로그는 노드 자체 로거로
        # 보내 /rosout 에 전부 실리게 하고, 로봇/컴포넌트 식별자는 메시지 본문([Robot-001] amcl: ...)에 담는다.
        self._loggers: dict = {}
        self.fleet_log = _ComponentLogger(self.get_logger(), '[FLEET] ')

        # 공유 목표 (빨간 공)
        self.goal_x, self.goal_y = self._random_free_pos()

        self.create_timer(1.0, self._publish_map)
        self.create_timer(0.05, self._update)
        self.create_timer(1.0, self._update_status)
        self.create_timer(2.0, self._emit_logs)

        # 자기 /rosout 의 ERROR 이상을 10초마다 MCAP 로 묶어 event_receiver 로 전송
        self.recorder = ErrorMcapRecorder(self)

        # 부팅 로그
        for r in self.robots:
            self.log(r, 'bt_navigator').info(f'Initialized, starting position x={r.x:.2f} y={r.y:.2f}')
        self.fleet_log.info(f'All {NUM_ROBOTS} robots online. Shared goal set: ({self.goal_x:.2f}, {self.goal_y:.2f})')

    def log(self, r, component):
        """로봇/컴포넌트별 로거 래퍼 반환. 노드 자체 로거로 보내되 메시지 앞에
        '[Robot-001] amcl: ' 프리픽스를 붙여 /rosout 에 식별자와 함께 실리게 한다."""
        key = f'{r.id}.{component}'
        lg = self._loggers.get(key)
        if lg is None:
            lg = _ComponentLogger(self.get_logger(), f'[{r.id}] {component}: ')
            self._loggers[key] = lg
        return lg

    # ------------------------------------------------------------------ #
    #  Map                                                                 #
    # ------------------------------------------------------------------ #
    def _build_map(self):
        cols = int(MAP_WIDTH / MAP_RESOLUTION)
        rows = int(MAP_HEIGHT / MAP_RESOLUTION)
        data = [0] * (cols * rows)

        def set_rect(x0, y0, x1, y1, val=100):
            for r in range(max(0, y0), min(rows, y1)):
                for c in range(max(0, x0), min(cols, x1)):
                    data[r * cols + c] = val

        set_rect(0, 0, cols, 3)
        set_rect(0, rows - 3, cols, rows)
        set_rect(0, 0, 3, rows)
        set_rect(cols - 3, 0, cols, rows)

        msg = OccupancyGrid()
        msg.header = Header()
        msg.header.frame_id = 'map'
        msg.info.resolution = MAP_RESOLUTION
        msg.info.width = cols
        msg.info.height = rows
        msg.info.origin.position.x = -MAP_WIDTH / 2.0
        msg.info.origin.position.y = -MAP_HEIGHT / 2.0
        msg.data = data
        return msg

    def _publish_map(self):
        self.map_msg.header.stamp = self.get_clock().now().to_msg()
        self.map_pub.publish(self.map_msg)

    def _is_occupied(self, x, y):
        cols = int(MAP_WIDTH / MAP_RESOLUTION)
        rows = int(MAP_HEIGHT / MAP_RESOLUTION)
        cx = int((x + MAP_WIDTH / 2.0) / MAP_RESOLUTION)
        cy = int((y + MAP_HEIGHT / 2.0) / MAP_RESOLUTION)
        if cx < 0 or cx >= cols or cy < 0 or cy >= rows:
            return True
        return self.map_msg.data[cy * cols + cx] > 50

    def _random_free_pos(self):
        margin = 2.0
        half = MAP_WIDTH / 2.0 - margin
        for _ in range(1000):
            x = random.uniform(-half, half)
            y = random.uniform(-half, half)
            if not self._is_occupied(x, y):
                return x, y
        return 0.0, 0.0

    def _is_path_clear(self, x, y, yaw, dist=0.4):
        return not self._is_occupied(
            x + dist * math.cos(yaw),
            y + dist * math.sin(yaw)
        )

    def _find_free_yaw(self, x, y, preferred_yaw):
        for delta in [0.3, -0.3, 0.6, -0.6, 1.0, -1.0, 1.5, -1.5, math.pi]:
            if self._is_path_clear(x, y, preferred_yaw + delta):
                return preferred_yaw + delta
        return preferred_yaw + math.pi

    # ------------------------------------------------------------------ #
    #  Update (20Hz)                                                       #
    # ------------------------------------------------------------------ #
    def _update(self):
        dt = 0.05
        now = self.get_clock().now().to_msg()
        marker_array = MarkerArray()

        for i, r in enumerate(self.robots):
            dx = self.goal_x - r.x
            dy = self.goal_y - r.y
            dist = math.hypot(dx, dy)

            # 목표 도착 — 첫 번째 도착 로봇이 즉시 공 이동
            if dist < WAYPOINT_THRESHOLD:
                self.log(r, 'bt_navigator').info(f'Goal reached at ({r.x:.2f}, {r.y:.2f})!')
                self._emit_state_errors(r)
                # 최소 5m 이상 떨어진 곳으로 이동
                for _ in range(100):
                    nx, ny = self._random_free_pos()
                    if math.hypot(nx - self.goal_x, ny - self.goal_y) > 5.0:
                        self.goal_x, self.goal_y = nx, ny
                        break
                else:
                    self.goal_x, self.goal_y = self._random_free_pos()
                self.fleet_log.info(f'New shared goal: ({self.goal_x:.2f}, {self.goal_y:.2f}). All robots rerouting.')
                for other in self.robots:
                    other.x, other.y = self._random_free_pos()
                    other.yaw = random.uniform(-math.pi, math.pi)
                    other.stuck_count = 0
                    self.log(other, 'bt_navigator').info(f'Repositioned to x={other.x:.2f} y={other.y:.2f}')
                break

            target_yaw = math.atan2(dy, dx)
            yaw_err = target_yaw - r.yaw
            while yaw_err > math.pi: yaw_err -= 2 * math.pi
            while yaw_err < -math.pi: yaw_err += 2 * math.pi

            angular_speed = max(-2.0, min(2.0, yaw_err * 3.0))
            linear_speed = ROBOT_SPEED * max(0.0, 1.0 - abs(yaw_err) / math.pi)

            if not self._is_path_clear(r.x, r.y, r.yaw):
                r.stuck_count += 1
                free_yaw = self._find_free_yaw(r.x, r.y, target_yaw)
                yaw_err = free_yaw - r.yaw
                while yaw_err > math.pi: yaw_err -= 2 * math.pi
                while yaw_err < -math.pi: yaw_err += 2 * math.pi
                angular_speed = max(-2.0, min(2.0, yaw_err * 5.0))
                linear_speed = 0.0
                if r.stuck_count == 1:
                    self.log(r, 'costmap_2d').warn('Obstacle detected, rerouting...')
                if r.stuck_count > 100:
                    self.log(r, 'bt_navigator').error(f'Stuck for {r.stuck_count * dt:.1f}s, replanning')
                    r.stuck_count = 0
            else:
                r.stuck_count = 0

            r.yaw += angular_speed * dt
            nx = r.x + linear_speed * math.cos(r.yaw) * dt
            ny = r.y + linear_speed * math.sin(r.yaw) * dt
            if not self._is_occupied(nx, ny):
                r.total_distance += math.hypot(nx - r.x, ny - r.y)
                r.x = nx
                r.y = ny

            # 로봇 마커 (하체 + 상체)
            for mid, z, sx, sz in [(i*2, 0.2, 0.5, 0.4), (i*2+1, 0.6, 0.3, 0.35)]:
                m = Marker()
                m.header.frame_id = 'map'
                m.header.stamp = now
                m.ns = 'robots'
                m.id = mid
                m.type = Marker.CYLINDER
                m.action = Marker.ADD
                m.pose.position.x = r.x
                m.pose.position.y = r.y
                m.pose.position.z = z
                m.pose.orientation.z = math.sin(r.yaw / 2.0)
                m.pose.orientation.w = math.cos(r.yaw / 2.0)
                m.scale.x = sx
                m.scale.y = sx
                m.scale.z = sz
                m.color.r = 0.2
                m.color.g = 0.6
                m.color.b = 1.0
                m.color.a = 1.0
                marker_array.markers.append(m)

        self.robot_marker_pub.publish(marker_array)
        self._publish_goal_marker(now)

    # ------------------------------------------------------------------ #
    #  Periodic logs (2Hz)                                                 #
    # ------------------------------------------------------------------ #
    def _emit_logs(self):
        for r in self.robots:
            # 배터리
            if r.battery_percent < 15.0:
                self.log(r, 'battery_state').warn(f'Low battery {r.battery_voltage:.2f}V ({r.battery_percent:.1f}%)')
            else:
                self.log(r, 'battery_state').info(f'{r.battery_voltage:.2f}V ({r.battery_percent:.1f}%) current={random.uniform(1.5,4.0):.2f}A')

            # 모터
            if r.motor_temp_left > 70.0:
                self.log(r, 'motor_driver').warn(f'Left motor temp high {r.motor_temp_left:.1f}C')
            else:
                self.log(r, 'motor_driver').info(f'left={r.motor_temp_left:.1f}C right={r.motor_temp_right:.1f}C rpm={random.randint(40,120)}')

            # CPU
            if r.cpu_usage > 75.0:
                self.log(r, 'system_monitor').warn(f'High CPU {r.cpu_usage:.1f}% temp={r.cpu_temp:.1f}C')
            else:
                self.log(r, 'system_monitor').info(f'cpu={r.cpu_usage:.1f}% temp={r.cpu_temp:.1f}C ram={random.uniform(30,70):.1f}%')

            # LIDAR
            if r.lidar_ok:
                self.log(r, 'sick_tim').info(f'scan OK freq={random.uniform(9.8,10.2):.1f}Hz points={random.randint(800,900)}')
            else:
                self.log(r, 'sick_tim').warn('scan degraded')

            # AMCL
            if r.localization_score < 0.6:
                self.log(r, 'amcl').warn(f'Low confidence score={r.localization_score:.3f}')
            else:
                self.log(r, 'amcl').info(f'x={r.x:.3f} y={r.y:.3f} yaw={math.degrees(r.yaw):.1f}deg score={r.localization_score:.3f}')

            # 네트워크
            if r.network_ok:
                self.log(r, 'rosbridge_server').info(f'Connected, latency={random.randint(1,20)}ms')
            else:
                self.log(r, 'rosbridge_server').warn('Disconnected')

    def _emit_state_errors(self, r):
        """로봇의 실제 상태를 진단해, 임계치를 위반한 항목만 해당 컴포넌트 로거로 에러/경고를 낸다.
        random.choice 로 가짜 에러를 뽑던 방식과 달리 로그가 노드 상태와 항상 일치한다."""
        emitted = 0

        # 배터리
        if r.battery_percent < 5.0:
            self.log(r, 'battery_state').error(f'CRITICAL {r.battery_voltage:.2f}V ({r.battery_percent:.1f}%). Emergency stop.')
            emitted += 1
        elif r.battery_percent < 15.0:
            self.log(r, 'battery_state').warn(f'Low battery {r.battery_voltage:.2f}V ({r.battery_percent:.1f}%)')
            emitted += 1

        # 모터 온도
        if r.motor_temp_left > 85.0:
            self.log(r, 'motor_driver').error(f'Left motor overheat {r.motor_temp_left:.1f}C. Throttling.')
            emitted += 1
        if r.motor_temp_right > 85.0:
            self.log(r, 'motor_driver').error(f'Right motor overheat {r.motor_temp_right:.1f}C. Throttling.')
            emitted += 1

        # CPU
        if r.cpu_usage > 95.0:
            self.log(r, 'system_monitor').error(f'CPU overload {r.cpu_usage:.1f}%')
            emitted += 1
        if r.cpu_temp > 85.0:
            self.log(r, 'system_monitor').error(f'CPU thermal throttling {r.cpu_temp:.1f}C')
            emitted += 1

        # 센서/통신 상태 플래그
        if not r.lidar_ok:
            self.log(r, 'sick_tim').error('LIDAR connection lost at /dev/ttyUSB0')
            emitted += 1
        if not r.camera_ok:
            self.log(r, 'realsense2_camera').error('Frame dropped, USB bandwidth exceeded')
            emitted += 1
        if not r.imu_ok:
            self.log(r, 'imu_filter_madgwick').error('IMU timeout, no message received')
            emitted += 1
        if not r.can_ok:
            self.log(r, 'motor_driver').error('CAN bus TX timeout on can0. Motor control lost.')
            emitted += 1
        if not r.network_ok:
            self.log(r, 'rosbridge_server').error('WebSocket lost. Retrying...')
            emitted += 1

        # 위치추정
        if r.localization_score < 0.4:
            self.log(r, 'amcl').error(f'Particle filter diverged score={r.localization_score:.3f}. Relocalization required.')
            emitted += 1

        if emitted == 0:
            self.log(r, 'system_monitor').info('Self-diagnostics passed, all systems nominal')
        return emitted

    def _publish_goal_marker(self, stamp):
        m = Marker()
        m.header.frame_id = 'map'
        m.header.stamp = stamp
        m.ns = 'goal'
        m.id = 0
        m.type = Marker.SPHERE
        m.action = Marker.ADD
        m.pose.position.x = self.goal_x
        m.pose.position.y = self.goal_y
        m.pose.position.z = 0.3
        m.pose.orientation.w = 1.0
        m.scale.x = m.scale.y = m.scale.z = 0.6
        m.color.r = 1.0
        m.color.g = 0.0
        m.color.b = 0.0
        m.color.a = 0.9
        self.goal_marker_pub.publish(m)

    # ------------------------------------------------------------------ #
    #  Status update (1Hz)                                                 #
    # ------------------------------------------------------------------ #
    def _update_status(self):
        for r in self.robots:
            r.update_status()

def main(args=None):
    rclpy.init(args=args)
    node = WandererNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()