import { McapWriter } from '@mcap/core';

export type RobotLogRecord = {
  robotId: string;
  seq: number;
  ts: number; // epoch ms
  level: string;
  message: string;
};

/**
 * @mcap/core 의 IWritable 을 메모리 버퍼로 구현. 임시파일 없이 MCAP 바이너리를 만든다.
 */
class BufferWritable {
  private chunks: Buffer[] = [];
  private len = 0n;

  position(): bigint {
    return this.len;
  }

  async write(data: Uint8Array): Promise<void> {
    const b = Buffer.from(data);
    this.chunks.push(b);
    this.len += BigInt(b.length);
  }

  toBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

// event_receiver(mcap.parser.ts)가 기대하는 RobotLog 스키마와 동일.
const ROBOT_LOG_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    robotId: { type: 'string' },
    seq: { type: 'integer' },
    ts: { type: 'integer' },
    level: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['robotId', 'seq', 'ts', 'level', 'message'],
});

/**
 * 로그 레코드들을 event_generator 가 쓰던 것과 동일한 RobotLog/json/`/rosout` MCAP 으로 직렬화.
 */
export async function buildMcap(records: RobotLogRecord[]): Promise<Buffer> {
  const writable = new BufferWritable();
  const writer = new McapWriter({ writable });

  await writer.start({ profile: 'custom', library: 'event_generator_sim' });

  const schemaId = await writer.registerSchema({
    name: 'RobotLog',
    encoding: 'jsonschema',
    data: new TextEncoder().encode(ROBOT_LOG_SCHEMA),
  });
  const channelId = await writer.registerChannel({
    schemaId,
    topic: '/rosout',
    messageEncoding: 'json',
    metadata: new Map([['source', 'event_generator_sim']]),
  });

  for (const rec of records) {
    const ts = BigInt(rec.ts) * 1_000_000n; // ms -> ns
    await writer.addMessage({
      channelId,
      sequence: rec.seq,
      logTime: ts,
      publishTime: ts,
      data: new TextEncoder().encode(JSON.stringify(rec)),
    });
  }

  await writer.end();
  return writable.toBuffer();
}

/**
 * MCAP 바이너리를 event_receiver 로 POST. 응답 status 와 본문(짧게)을 반환.
 */
export async function postMcap(
  receiverUrl: string,
  buffer: Buffer,
  headers: Record<string, string>,
): Promise<{ status: number; body: string }> {
  const res = await fetch(`${receiverUrl.replace(/\/$/, '')}/events/ingest/mcap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      ...headers,
    },
    body: new Uint8Array(buffer),
  });

  let body = '';
  try {
    body = (await res.text()).slice(0, 200);
  } catch {
    // ignore
  }
  return { status: res.status, body };
}
