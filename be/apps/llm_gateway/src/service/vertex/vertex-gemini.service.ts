import { Injectable, Logger } from '@nestjs/common';
import {
  assertVertexConfig,
  loadVertexGeminiConfig,
} from './vertex-gemini.config';
import { VertexGeminiClient } from './vertex-gemini.client';
import {
  type LlmPayload,
  type LlmLogLine,
  ChatPayload,
} from '@ai-log/shared-contracts';
import { safeStringify, truncate } from '../../utils/utils';
import { ConfigManagerApi } from '../../api/config-manager.api';

@Injectable()
export class VertexGeminiService {
  private readonly logger = new Logger(VertexGeminiService.name);

  /** 환경변수 기반 설정 로딩 (앱 시작 시 1회) */
  private readonly cfg = loadVertexGeminiConfig();

  /**
   * Vertex 호출 전용 클라이언트
   * - 책임: 토큰 발급(ADC), URL 생성, fetch 호출, 응답 파싱/로깅
   */
  private readonly client = new VertexGeminiClient(
    {
      log: (msg: string) => this.logger.log(msg),
      debug: (msg: string) => this.logger.debug(msg),
      error: (msg: string) => this.logger.error(msg),
    },
    this.cfg.googleAuthScope,
    this.cfg.keyFilePath,
  );
  constructor(private readonly configManagerApi: ConfigManagerApi) {}
  /**
   * LLM 로그 분석 요청 처리 (슬림 타입 기준)
   * - 입력: { logs: [{ index, level, message }] }
   */

  readonly defaultResponse = {
    chat_action: 'default',
    text: '아직은 대답할 수 없어요. 다른 화면에서 시도해보세요.',
  };

  async analyzeChat(body: ChatPayload): Promise<any> {
    // 오늘 날짜를 명확히 프롬프트에 포함
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD 형식
    let prompt = '';
    if (body.currentPath === '' || body.currentPath === '/') {
      // dashboard
      prompt = [
        `오늘 날짜는 ${today} 기준이야.`,
        '아래 명령을 분석해서, 아래 조건에 따라 반드시 JSON으로만 응답해.',
        '',
        '1. "이슈를 알려달라"는 의미(예: "이슈 보여줘", "이슈 알려줘", "이슈 검색", "이슈 찾아줘" 등)가 포함된 경우:',
        '   - 조건(날짜, func, severity, summary 등)이 명확히 언급된 경우 해당 값을 추출해서 아래 형식으로 리턴해. 값이 없으면 빈 문자열(\"")로 채워.',
        '   - 반드시 아래 예시 형식과 키 순서를 지켜.(키를 생략하거나 이름을 바꾸면 절대 안돼)',
        '   - 예시:',
        '     {',
        '       "chat_action": "event_query",',
        '       "start": "2026-05-01",',
        '       "end": "2026-05-10",',
        '       "func": "navigation",',
        '       "severity": "상",',
        '       "summary": "충전",',
        `       "text": "2026년 5월 1일부터 2026년 5월 10일까지의 navigation이슈,심각도 상, 충전 관련 이슈를 찾아보았습니다."`,
        '     },',
        '',
        '2. 위 조건에 해당하지 않으면 아래처럼 리턴해:',
        '   {',
        '     "chat_action": "default",',
        '     "text": "아직은 대답할 수 없어요. 다른 화면에서 시도해보세요."',
        '   }',
        '',
        `명령: ${body.message}`,
        '',
        '응답은 반드시 JSON만 반환해.',
      ].join('\n');
    } else {
      return this.defaultResponse;
    }
    // 2. LLM 호출
    const location = this.cfg.defaultLocation.trim();
    const modelId = this.cfg.defaultModelId.trim();
    const requestId = `analyzeChat_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const result = await this.client.generateContent({
      projectId: this.cfg.projectId,
      location,
      modelId,
      requestId,
      prompt,
      temperature: this.cfg.defaultTemperature,
      maxOutputTokens: this.cfg.defaultMaxOutputTokens,
      timeoutMs: this.cfg.timeoutMs,
    });
    // 코드블록 감싸짐 제거 및 JSON 파싱
    if (result.ok && typeof result.text === 'string') {
      let text = result.text.trim();
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        text = codeBlockMatch[1].trim();
      }
      try {
        const parsed = JSON.parse(text);
        return parsed;
      } catch (e) {
        this.logger.warn(`[analyzeChat] LLM 응답 파싱 실패: ${e}`);
      }
    }
    // 실패 시 fallback
    return this.defaultResponse;
  }

  async analyzeLogs(req: LlmPayload) {
    // (0) 필수 설정 검증
    try {
      assertVertexConfig(this.cfg);
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Invalid config' };
    }

    const startedAt = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

    // (1) 입력 정규화
    const logs: LlmLogLine[] = Array.isArray(req?.logs) ? req.logs : [];

    // (2) 프롬프트 생성 (Stage2: 공용 + 기능별 프롬프트 + 고정 스키마 합성)
    const effectiveInstruction =
      await this.configManagerApi.buildAnalyzeInstruction(
        'vertex',
        String(req?.func ?? ''),
        Array.isArray(req?.actions) ? req.actions : [],
      );
    const prompt = buildPromptFromLlmPayload(logs, effectiveInstruction);

    // (3) Vertex 호출 파라미터는 cfg 기본값 사용
    const location = this.cfg.defaultLocation.trim();
    const modelId = this.cfg.defaultModelId.trim();

    const result = await this.client.generateContent({
      projectId: this.cfg.projectId,
      location,
      modelId,
      requestId,
      prompt,
      temperature: this.cfg.defaultTemperature,
      maxOutputTokens: this.cfg.defaultMaxOutputTokens,
      timeoutMs: this.cfg.timeoutMs,
    });

    const elapsedMs = result.elapsedMs ?? Date.now() - startedAt;

    // ✅ 성공/실패 로깅 정책 (cfg 기반)
    if (result.ok) {
      const text = result.text ?? '';

      if (this.cfg.logFullAnswer) {
        this.logger.log(`[${requestId}] LLM answer(full)=${text}`);
      } else {
        this.logger.log(
          `[${requestId}] LLM answer preview=${truncate(text, this.cfg.answerPreviewChars)}`,
        );
      }
    } else {
      this.logger.error(
        `[${requestId}] LLM failed status=${result.status} rawPreview=${truncate(
          safeStringify(result.raw),
          4000,
        )}`,
      );
    }

    // (4) Service 레벨 공통 응답 포맷
    return {
      ok: result.ok,
      status: result.status,
      elapsedMs,
      service: 'vertex',
      vertex: { project: this.cfg.projectId, location, modelId },
      request: { logCount: logs.length },
      text: result.text,
      raw: result.raw,
      debug: { url: result.url, responseHeaders: result.responseHeaders },
    };
  }

  /**
   * Stage1: 로그를 func 중 하나로 분류하고 confidence 산출
   * - 입력: { logs: [...] }
   * - 출력: { func, confidence, reason }
   */
  async classifyLogs(req: LlmPayload) {
    try {
      assertVertexConfig(this.cfg);
    } catch (e: any) {
      return { ok: false, status: 500, error: e?.message ?? 'Invalid config' };
    }

    const startedAt = Date.now();
    const requestId = `classify_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const logs: LlmLogLine[] = Array.isArray(req?.logs) ? req.logs : [];

    const classifyInstruction =
      await this.configManagerApi.buildClassifyInstruction();
    const prompt = buildPromptFromLlmPayload(logs, classifyInstruction);

    const result = await this.client.generateContent({
      projectId: this.cfg.projectId,
      location: this.cfg.defaultLocation.trim(),
      modelId: this.cfg.defaultModelId.trim(),
      requestId,
      prompt,
      temperature: this.cfg.defaultTemperature,
      maxOutputTokens: this.cfg.defaultMaxOutputTokens,
      timeoutMs: this.cfg.timeoutMs,
    });

    const elapsedMs = result.elapsedMs ?? Date.now() - startedAt;
    const parsed = this.parseJsonFromText(result.text);
    const classify = normalizeClassifyResult(parsed);

    this.logger.log(
      `[${requestId}] classify func=${classify.func} confidence=${classify.confidence}`,
    );

    return {
      ok: result.ok,
      status: result.status,
      elapsedMs,
      service: 'vertex',
      func: classify.func,
      confidence: classify.confidence,
      reason: classify.reason,
      text: result.text,
      raw: result.raw,
    };
  }

  async mockClassifyLogs(_req: LlmPayload) {
    const startedAt = Date.now();
    const mock = buildRandomMockAnalysis();
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      ok: true,
      status: 200,
      elapsedMs: Date.now() - startedAt,
      service: 'mock',
      func: mock.func,
      confidence: 0.8,
      reason: 'mock 분류 결과입니다.',
      text: JSON.stringify({ func: mock.func, confidence: 0.8, reason: 'mock' }),
      raw: null,
    };
  }

  /** LLM 응답 텍스트에서 코드블록 제거 후 JSON 파싱 */
  private parseJsonFromText(text?: string): any {
    if (typeof text !== 'string') return null;
    let body = text.trim();
    // 코드펜스 제거: 닫는 ``` 가 없어도(응답 잘림) 앞/뒤 펜스를 모두 떼어낸다.
    body = body
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const candidates = [body];
    // 본문 양옆에 잡설이 섞인 경우 대비: 첫 '{' ~ 마지막 '}' 구간도 후보로.
    const first = body.indexOf('{');
    const last = body.lastIndexOf('}');
    if (first >= 0 && last > first) candidates.push(body.slice(first, last + 1));

    for (const c of candidates) {
      try {
        return JSON.parse(c);
      } catch {
        /* 다음 후보 시도 */
      }
    }
    this.logger.warn(`[classify] JSON 파싱 실패 preview=${truncate(body, 500)}`);
    return null;
  }

  async mockAnalyzeLogs(req: LlmPayload) {
    const startedAt = Date.now();
    const mock = buildRandomMockAnalysis();

    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      ok: true,
      status: 200,
      elapsedMs: Date.now() - startedAt,
      service: 'mock',
      vertex: {
        project: 'ailogsystem-493123',
        location: 'us-central1',
        modelId: 'gemini-2.5-flash',
      },
      request: {
        logCount: Array.isArray(req?.logs) ? req.logs.length : 0,
      },
      text: JSON.stringify(mock),
      raw: {
        candidates: [
          {
            content: {
              role: 'model',
              parts: [
                {
                  text: JSON.stringify(mock),
                },
              ],
            },
          },
        ],
      },
    };
  }
}

type MockAnalysis = {
  summary: string;
  reason: string;
  solutions: string;
  func: string;
  severity: 'low' | 'medium' | 'high';
};

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

/** Stage1 LLM 응답을 {func, confidence, reason}로 정규화 */
function normalizeClassifyResult(parsed: any): {
  func: string;
  confidence: number;
  reason: string;
} {
  const func = String(parsed?.func ?? parsed?.issueFunctionality ?? '').trim();

  const rawConfidence = Number(parsed?.confidence);
  const confidence = Number.isFinite(rawConfidence)
    ? Math.min(1, Math.max(0, Math.round(rawConfidence * 100) / 100))
    : 0;

  const reason = String(parsed?.reason ?? '').trim();

  return { func, confidence, reason };
}

function buildRandomMockAnalysis(): MockAnalysis {
  const scenarios = [
    {
      func: '비상 정지(E-STOP) 인터록',
      severity: 'high' as const,
      summary: '로봇의 비상 정지 버튼이 입력되어 동작이 중단되었습니다.',
      reason:
        '비상 정지 입력 신호가 감지되어 안전 로직이 즉시 동작했습니다. 수동 조작 또는 안전 회로 이상 가능성이 있습니다.',
      solutions:
        '1. 작업 구역 안전을 확인하고 비상 정지 해제 절차를 수행합니다. 2. E-STOP 스위치/배선 접점 상태를 점검합니다. 3. 최근 작업 이력과 충돌 가능 이벤트를 확인합니다.',
    },
    {
      func: '로컬라이제이션',
      severity: 'medium' as const,
      summary: '로봇 위치 추정이 불안정해 localization jump가 발생했습니다.',
      reason:
        '센서 입력 노이즈 증가 또는 맵 불일치로 위치 추정값이 급격히 변동했습니다.',
      solutions:
        '1. LiDAR/IMU 캘리브레이션 상태를 점검합니다. 2. 맵 최신화 여부를 확인합니다. 3. 재초기화 후 경로 재계획을 수행합니다.',
    },
    {
      func: '모터 드라이브',
      severity: 'high' as const,
      summary: '모터 과전류 보호가 작동하여 주행이 중지되었습니다.',
      reason:
        '부하 급증 또는 구동계 저항 증가로 전류 임계치를 초과한 것으로 보입니다.',
      solutions:
        '1. 구동부 걸림/이물 여부를 확인합니다. 2. 모터 드라이버 온도 및 전류 로그를 점검합니다. 3. 재가동 전 부하 테스트를 수행합니다.',
    },
    {
      func: '배터리 관리',
      severity: 'low' as const,
      summary: '배터리 잔량 저하로 절전 모드가 활성화되었습니다.',
      reason: '잔량 임계치 이하로 내려가며 자동 절전 정책이 적용되었습니다.',
      solutions:
        '1. 충전 스테이션 연결 상태를 확인합니다. 2. 배터리 상태(SOH/SOC) 점검을 수행합니다. 3. 비피크 시간대 충전 스케줄을 조정합니다.',
    },
    {
      func: '네트워크 통신',
      severity: 'medium' as const,
      summary: '백엔드와의 통신 지연 증가로 재시도 횟수가 급증했습니다.',
      reason:
        '무선 구간 신호 품질 저하 또는 일시적인 네트워크 혼잡이 감지되었습니다.',
      solutions:
        '1. AP 신호 세기와 채널 간섭을 점검합니다. 2. 타임아웃/재시도 정책을 조정합니다. 3. 네트워크 구간 모니터링을 강화합니다.',
    },
  ] as const;

  return pickOne(scenarios);
}

/**
 * 최소 계약(LlmPayload.logs) 기준 프롬프트 생성
 * - index/level/message만 사용
 * - instruction은 config에서 주입
 */
function buildPromptFromLlmPayload(logs: LlmLogLine[], instruction: string) {
  const lines = logs.map((l) => {
    const idx = Number.isFinite(l.index) ? l.index : -1;
    const lvl = String(l.level ?? 'UNKNOWN')
      .toUpperCase()
      .padEnd(5, ' ');
    const msg = String(l.message ?? '');
    return `[${idx}] ${lvl} ${msg}`;
  });

  return ['### SYSTEM', instruction, '', '### LOGS', ...lines].join('\n');
}
