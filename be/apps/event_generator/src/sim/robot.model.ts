// ROS2 robot_wanderer 의 로봇 상태 모델 + 로그 생성을 TS 로 포팅(경량판).
// 2D 격자 물리/장애물 회피 대신, 상태 drift + 주기 텔레메트리 + 확률적 이벤트로
// 동일한 종류의 로그(battery/motor/cpu/lidar/amcl/network, 도착/고착/장애물/에러)를 만든다.

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type LogEntry = {
  component: string;
  level: LogLevel;
  message: string;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const chance = (p: number) => Math.random() < p;
const f = (n: number, d = 2) => n.toFixed(d);

const MAP_HALF = 8.0; // 가상 맵 반경(좌표 로그용)

export class Robot {
  readonly id: string;

  x: number;
  y: number;
  yaw: number;
  stuckCount = 0;

  batteryVoltage: number;
  batteryPercent: number;
  motorTempLeft: number;
  motorTempRight: number;
  cpuUsage: number;
  cpuTemp: number;
  lidarOk = true;
  cameraOk = true;
  imuOk = true;
  networkOk = true;
  canOk = true;
  localizationScore: number;

  constructor(id: string) {
    this.id = id;
    this.x = rand(-MAP_HALF, MAP_HALF);
    this.y = rand(-MAP_HALF, MAP_HALF);
    this.yaw = rand(-Math.PI, Math.PI);

    this.batteryVoltage = rand(23.0, 25.2);
    this.batteryPercent = this.calcBatteryPercent();
    this.motorTempLeft = rand(35.0, 45.0);
    this.motorTempRight = rand(35.0, 45.0);
    this.cpuUsage = rand(15.0, 30.0);
    this.cpuTemp = rand(45.0, 55.0);
    this.localizationScore = rand(0.8, 1.0);
  }

  private calcBatteryPercent(): number {
    return ((this.batteryVoltage - 20.0) / (25.2 - 20.0)) * 100.0;
  }

  bootLog(): LogEntry {
    return {
      component: 'bt_navigator',
      level: 'INFO',
      message: `Initialized, starting position x=${f(this.x)} y=${f(this.y)}`,
    };
  }

  /** 1Hz 상태 drift (update_status 포팅). */
  updateStatus(): void {
    this.batteryVoltage = Math.max(20.0, this.batteryVoltage - rand(0.001, 0.003));
    this.batteryPercent = this.calcBatteryPercent();
    this.motorTempLeft = clamp(this.motorTempLeft + rand(-0.3, 0.6), 30.0, 95.0);
    this.motorTempRight = clamp(this.motorTempRight + rand(-0.3, 0.6), 30.0, 95.0);
    this.cpuUsage = clamp(this.cpuUsage + rand(-5.0, 5.0), 10.0, 100.0);
    this.cpuTemp = clamp(this.cpuTemp + rand(-0.5, 0.8), 40.0, 90.0);
    this.localizationScore = clamp(this.localizationScore + rand(-0.05, 0.05), 0.0, 1.0);
    if (chance(0.008)) this.lidarOk = !this.lidarOk;
    if (chance(0.006)) this.cameraOk = !this.cameraOk;
    if (chance(0.003)) this.imuOk = !this.imuOk;
    if (chance(0.015)) this.networkOk = !this.networkOk;
    if (chance(0.004)) this.canOk = !this.canOk;
  }

  /** 2Hz 주기 텔레메트리 (_emit_logs 포팅). */
  telemetry(): LogEntry[] {
    const out: LogEntry[] = [];

    if (this.batteryPercent < 15.0) {
      out.push({ component: 'battery_state', level: 'WARN',
        message: `Low battery ${f(this.batteryVoltage)}V (${f(this.batteryPercent, 1)}%)` });
    } else {
      out.push({ component: 'battery_state', level: 'INFO',
        message: `${f(this.batteryVoltage)}V (${f(this.batteryPercent, 1)}%) current=${f(rand(1.5, 4.0))}A` });
    }

    if (this.motorTempLeft > 70.0) {
      out.push({ component: 'motor_driver', level: 'WARN',
        message: `Left motor temp high ${f(this.motorTempLeft, 1)}C` });
    } else {
      out.push({ component: 'motor_driver', level: 'INFO',
        message: `left=${f(this.motorTempLeft, 1)}C right=${f(this.motorTempRight, 1)}C rpm=${randInt(40, 120)}` });
    }

    if (this.cpuUsage > 75.0) {
      out.push({ component: 'system_monitor', level: 'WARN',
        message: `High CPU ${f(this.cpuUsage, 1)}% temp=${f(this.cpuTemp, 1)}C` });
    } else {
      out.push({ component: 'system_monitor', level: 'INFO',
        message: `cpu=${f(this.cpuUsage, 1)}% temp=${f(this.cpuTemp, 1)}C ram=${f(rand(30, 70), 1)}%` });
    }

    if (this.lidarOk) {
      out.push({ component: 'sick_tim', level: 'INFO',
        message: `scan OK freq=${f(rand(9.8, 10.2), 1)}Hz points=${randInt(800, 900)}` });
    } else {
      out.push({ component: 'sick_tim', level: 'WARN', message: 'scan degraded' });
    }

    if (this.localizationScore < 0.6) {
      out.push({ component: 'amcl', level: 'WARN',
        message: `Low confidence score=${f(this.localizationScore, 3)}` });
    } else {
      out.push({ component: 'amcl', level: 'INFO',
        message: `x=${f(this.x, 3)} y=${f(this.y, 3)} yaw=${f((this.yaw * 180) / Math.PI, 1)}deg score=${f(this.localizationScore, 3)}` });
    }

    if (this.networkOk) {
      out.push({ component: 'rosbridge_server', level: 'INFO',
        message: `Connected, latency=${randInt(1, 20)}ms` });
    } else {
      out.push({ component: 'rosbridge_server', level: 'WARN', message: 'Disconnected' });
    }

    return out;
  }

  /**
   * 경량 모션 + 확률적 주행 이벤트. 위치를 랜덤워크로 갱신하고,
   * 가끔 목표도착/장애물/고착 로그를 낸다. 목표 도착 시 상태진단 에러도 함께.
   */
  move(): LogEntry[] {
    const out: LogEntry[] = [];

    // 랜덤워크 (amcl 좌표 로그가 자연스럽게 변하도록)
    this.yaw += rand(-0.3, 0.3);
    this.x = clamp(this.x + Math.cos(this.yaw) * rand(0.0, 0.4), -MAP_HALF, MAP_HALF);
    this.y = clamp(this.y + Math.sin(this.yaw) * rand(0.0, 0.4), -MAP_HALF, MAP_HALF);

    // 장애물 감지 (WARN)
    if (chance(0.05)) {
      this.stuckCount += 1;
      out.push({ component: 'costmap_2d', level: 'WARN', message: 'Obstacle detected, rerouting...' });
      // 오래 고착되면 ERROR
      if (this.stuckCount > 5) {
        out.push({ component: 'bt_navigator', level: 'ERROR',
          message: `Stuck for ${f(this.stuckCount * 1.0, 1)}s, replanning` });
        this.stuckCount = 0;
      }
    } else {
      this.stuckCount = 0;
    }

    // 목표 도착 (INFO) → 상태진단 에러 동반
    if (chance(0.03)) {
      out.push({ component: 'bt_navigator', level: 'INFO',
        message: `Goal reached at (${f(this.x)}, ${f(this.y)})!` });
      out.push(...this.stateErrors());
    }

    return out;
  }

  /**
   * 실제 상태를 진단해 임계치 위반 항목만 ERROR/경고로 낸다 (_emit_state_errors 포팅).
   * 위반이 없으면 정상 진단 INFO 하나.
   */
  stateErrors(): LogEntry[] {
    const out: LogEntry[] = [];

    if (this.batteryPercent < 5.0) {
      out.push({ component: 'battery_state', level: 'ERROR',
        message: `CRITICAL ${f(this.batteryVoltage)}V (${f(this.batteryPercent, 1)}%). Emergency stop.` });
    } else if (this.batteryPercent < 15.0) {
      out.push({ component: 'battery_state', level: 'WARN',
        message: `Low battery ${f(this.batteryVoltage)}V (${f(this.batteryPercent, 1)}%)` });
    }

    if (this.motorTempLeft > 85.0) {
      out.push({ component: 'motor_driver', level: 'ERROR',
        message: `Left motor overheat ${f(this.motorTempLeft, 1)}C. Throttling.` });
    }
    if (this.motorTempRight > 85.0) {
      out.push({ component: 'motor_driver', level: 'ERROR',
        message: `Right motor overheat ${f(this.motorTempRight, 1)}C. Throttling.` });
    }
    if (this.cpuUsage > 95.0) {
      out.push({ component: 'system_monitor', level: 'ERROR', message: `CPU overload ${f(this.cpuUsage, 1)}%` });
    }
    if (this.cpuTemp > 85.0) {
      out.push({ component: 'system_monitor', level: 'ERROR', message: `CPU thermal throttling ${f(this.cpuTemp, 1)}C` });
    }
    if (!this.lidarOk) {
      out.push({ component: 'sick_tim', level: 'ERROR', message: 'LIDAR connection lost at /dev/ttyUSB0' });
    }
    if (!this.cameraOk) {
      out.push({ component: 'realsense2_camera', level: 'ERROR', message: 'Frame dropped, USB bandwidth exceeded' });
    }
    if (!this.imuOk) {
      out.push({ component: 'imu_filter_madgwick', level: 'ERROR', message: 'IMU timeout, no message received' });
    }
    if (!this.canOk) {
      out.push({ component: 'motor_driver', level: 'ERROR', message: 'CAN bus TX timeout on can0. Motor control lost.' });
    }
    if (!this.networkOk) {
      out.push({ component: 'rosbridge_server', level: 'ERROR', message: 'WebSocket lost. Retrying...' });
    }
    if (this.localizationScore < 0.4) {
      out.push({ component: 'amcl', level: 'ERROR',
        message: `Particle filter diverged score=${f(this.localizationScore, 3)}. Relocalization required.` });
    }

    if (out.length === 0) {
      out.push({ component: 'system_monitor', level: 'INFO', message: 'Self-diagnostics passed, all systems nominal' });
    }
    return out;
  }
}
