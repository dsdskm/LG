import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Robot, type LogEntry } from './robot.model';
import { buildMcap, postMcap, type RobotLogRecord } from './mcap.util';

const DEFAULT_RECEIVER_URL = 'http://localhost:3001';

// .env 공통 설정 (없으면 기본값)
const RECEIVER_URL = process.env.URL_EVENT_RECEIVER ?? DEFAULT_RECEIVER_URL;
const ROBOT_COUNT = clampInt(process.env.SIM_ROBOT_COUNT, 10, 1, 9999);
const FLUSH_SEC = clampInt(process.env.SIM_FLUSH_SEC, 60, 1, 3600);
const STATUS_SEC = clampInt(process.env.SIM_STATUS_SEC, 1, 1, 60);
const TELEMETRY_SEC = clampInt(process.env.SIM_TELEMETRY_SEC, 2, 1, 60);
const MOVE_SEC = clampInt(process.env.SIM_MOVE_SEC, 1, 1, 60);
// 부팅과 동시에 자동으로 주기 전송을 시작할지 여부. 기본 off.
// (앱이 자체적으로 주기 실행하지 않고, 외부 스크립트 scripts/run/gen-loop.sh 로 트리거한다.)
// 굳이 앱 자체 자동시작을 원하면 SIM_AUTOSTART=true.
const AUTOSTART = clampBool(process.env.SIM_AUTOSTART, false);

function clampInt(v: string | undefined, def: number, lo: number, hi: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(hi, Math.max(lo, Math.floor(n)));
}

function clampBool(v: string | undefined, def: boolean): boolean {
  if (v === undefined) return def;
  const s = v.trim().toLowerCase();
  if (['true', '1', 'y', 'yes', 'on'].includes(s)) return true;
  if (['false', '0', 'n', 'no', 'off'].includes(s)) return false;
  return def;
}

type SimStatus = {
  running: boolean;
  robotCount: number;
  receiverUrl: string;
  flushSec: number;
  bufferedLogs: number;
  batchesSent: number;
  lastFlush: string | null;
};

@Injectable()
export class SimulatorService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(SimulatorService.name);

  private robots: Robot[] = [];
  private buffer: RobotLogRecord[] = [];
  private seq = 0;
  private batchNo = 0;
  private batchesSent = 0;
  private lastFlush: number | null = null;

  private timers: NodeJS.Timeout[] = [];
  private running = false;

  start(): SimStatus {
    if (this.running) return this.status();

    this.robots = Array.from({ length: ROBOT_COUNT }, (_, i) =>
      new Robot(`Robot-${String(i + 1).padStart(3, '0')}`),
    );
    this.buffer = [];
    this.seq = 0;
    this.batchNo = 0;
    this.batchesSent = 0;
    this.lastFlush = null;

    // 부팅 로그
    for (const r of this.robots) this.collect(r.id, [r.bootLog()]);

    this.timers = [
      setInterval(() => this.tickStatus(), STATUS_SEC * 1000),
      setInterval(() => this.tickTelemetry(), TELEMETRY_SEC * 1000),
      setInterval(() => this.tickMove(), MOVE_SEC * 1000),
      setInterval(() => void this.flush(), FLUSH_SEC * 1000),
    ];
    this.running = true;
    this.logger.log(
      `simulator started: ${ROBOT_COUNT} robots, flush every ${FLUSH_SEC}s -> ${RECEIVER_URL}/events/ingest/mcap`,
    );
    return this.status();
  }

  async stop(): Promise<SimStatus> {
    if (!this.running) return this.status();
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    this.running = false;
    await this.flush(); // 남은 로그 전송
    this.logger.log('simulator stopped');
    return this.status();
  }

  status(): SimStatus {
    return {
      running: this.running,
      robotCount: this.robots.length,
      receiverUrl: RECEIVER_URL,
      flushSec: FLUSH_SEC,
      bufferedLogs: this.buffer.length,
      batchesSent: this.batchesSent,
      lastFlush: this.lastFlush ? new Date(this.lastFlush).toISOString() : null,
    };
  }

  /**
   * ros2 노드가 부팅과 동시에 recorder 타이머를 켜는 것처럼,
   * 앱 부팅이 끝나면 자동으로 주기 전송을 시작한다. (SIM_AUTOSTART 로 on/off)
   */
  onApplicationBootstrap(): void {
    if (AUTOSTART) {
      this.logger.log('SIM_AUTOSTART 활성 → 부팅과 함께 시뮬레이터 자동 시작');
      this.start();
    } else {
      this.logger.log(
        'SIM_AUTOSTART 비활성 → 수동 시작 대기 (POST /sim/start)',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.running) await this.stop();
  }

  // --- timers ---
  private tickStatus(): void {
    for (const r of this.robots) r.updateStatus();
  }

  private tickTelemetry(): void {
    for (const r of this.robots) this.collect(r.id, r.telemetry());
  }

  private tickMove(): void {
    for (const r of this.robots) this.collect(r.id, r.move());
  }

  private collect(robotId: string, entries: LogEntry[]): void {
    const ts = Date.now();
    for (const e of entries) {
      this.seq += 1;
      this.buffer.push({
        robotId,
        seq: this.seq,
        ts,
        level: e.level,
        // receiver 는 name 필드가 없으므로 컴포넌트를 메시지 앞에 보존
        message: `${e.component}: ${e.message}`,
      });
    }
  }

  /**
   * 한 주기(기본 60초) 구간의 로그를 robotId 별로 그룹핑해 로봇당 MCAP 1개씩 POST.
   * (receiver 는 MCAP 1개당 robotId 하나만 붙이므로 로봇별로 분리한다.)
   */
  private async flush(): Promise<void> {
    const batch = this.buffer;
    this.buffer = [];
    this.lastFlush = Date.now();
    if (batch.length === 0) return;

    this.batchNo += 1;
    const batchNo = this.batchNo;

    const groups = new Map<string, RobotLogRecord[]>();
    for (const rec of batch) {
      const g = groups.get(rec.robotId);
      if (g) g.push(rec);
      else groups.set(rec.robotId, [rec]);
    }

    await Promise.all(
      [...groups.entries()].map(([robotId, recs]) => this.send(robotId, recs, batchNo)),
    );
  }

  private async send(robotId: string, recs: RobotLogRecord[], batchNo: number): Promise<void> {
    const batchId = `ts_${robotId}_${Date.now()}_${String(batchNo).padStart(4, '0')}`;
    try {
      const buffer = await buildMcap(recs);
      const { status, body } = await postMcap(RECEIVER_URL, buffer, {
        'x-batch-id': batchId,
        'x-source': 'event_generator_sim',
        'x-robot-id': robotId,
        'x-log-count': String(recs.length),
      });
      this.batchesSent += 1;
      this.logger.log(`[SIM-TX] ${robotId} ${recs.length} logs ${buffer.length}B -> HTTP ${status} ${body}`);
    } catch (e) {
      this.logger.warn(`[SIM-TX] ${robotId} ${recs.length} logs -> FAILED: ${(e as Error).message}`);
    }
  }
}
