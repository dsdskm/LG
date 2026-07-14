import { Injectable, Logger } from '@nestjs/common';
import { assertAzureOpenaiConfig, loadAzureOpenaiConfig } from './azure-openai.config';
import { AzureOpenaiClient } from './azure-openai.client';
import { type LlmPayload, type LlmLogLine } from '@ai-log/shared-contracts';
import { safeStringify, truncate } from '../../utils/utils';
import { ConfigManagerApi } from '../../api/config-manager.api';

@Injectable()
export class AzureOpenaiService {
    private readonly logger = new Logger(AzureOpenaiService.name);

    /** 환경변수 기반 설정 로딩 (앱 시작 시 1회) */
    private readonly cfg = loadAzureOpenaiConfig();

    /**
     * Azure OpenAI 호출 전용 클라이언트
     * - 책임: URL 생성, HTTP 호출, 응답 파싱/로깅
     */
    private readonly client = new AzureOpenaiClient({
        log: (msg: string) => this.logger.log(msg),
        debug: (msg: string) => this.logger.debug(msg),
        error: (msg: string) => this.logger.error(msg),
    });

    constructor(private readonly configManagerApi: ConfigManagerApi) { }

    /**
     * LLM 로그 분석 요청 처리
     * - 입력: { logs: [{ index, level, message }] }
     */
    async analyzeLogs(req: LlmPayload) {
        // (0) 필수 설정 검증
        try {
            assertAzureOpenaiConfig(this.cfg);
        } catch (e: any) {
            this.logger.error(`[llm_gateway] analyzeLogs received invalid config: ${e?.message ?? 'Unknown error'}`);
            return { ok: false, error: e?.message ?? 'Invalid config', status: 500 };
        }

        const startedAt = Date.now();
        const requestId = `azure_req_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

        // (1) 입력 정규화
        const logs: LlmLogLine[] = Array.isArray(req?.logs) ? req.logs : [];

        // Stage2: 공용 + 기능별 프롬프트 + 고정 스키마 합성
        const effectiveInstruction =
            await this.configManagerApi.buildAnalyzeInstruction(
                'azure',
                String(req?.func ?? ''),
                Array.isArray(req?.actions) ? req.actions : [],
            );

        // (2) 프롬프트 생성 (지침은 DB 우선)
        const logText = logs
            .map((log) => `[${log.level}] ${log.message}`)
            .join('\n');

        const prompt = `${effectiveInstruction}\n\n${logText}`;

        // (3) 메시지 포맷 구성
        const messages = [
            {
                role: 'system',
                content: effectiveInstruction,
            },
            {
                role: 'user',
                content: logText,
            },
        ];

        // (4) Azure OpenAI 호출
        const result = await this.client.generateContent({
            endpoint: this.cfg.endpoint,
            apiKey: this.cfg.apiKey,
            apiVersion: this.cfg.apiVersion,
            deployment: this.cfg.deployment,
            messages,
            maxCompletionTokens: this.cfg.maxCompletionTokens,
        });

        const elapsedMs = result.elapsedMs ?? Date.now() - startedAt;
        this.logger.log(`result ${safeStringify(result)}`);
        // ✅ 성공/실패 로깅
        if (result.ok) {
            const text = result.text ?? '';
            this.logger.log(
                `[${requestId}] Azure OpenAI answer preview=${truncate(text, this.cfg.answerPreviewChars)}`,
            );
        } else {
            this.logger.error(
                `[${requestId}] Azure OpenAI failed status=${result.status} rawPreview=${truncate(
                    safeStringify(result.raw),
                    4000,
                )}`,
            );
        }

        // (5) Service 레벨 공통 응답 포맷
        return {
            ok: result.ok,
            status: result.status,
            elapsedMs,
            service: 'azure',
            azure: {
                endpoint: this.cfg.endpoint,
                deployment: this.cfg.deployment,
                model: this.cfg.model,
            },
            request: { logCount: logs.length },
            text: result.text,
            raw: result.raw,
            debug: { url: result.url, responseHeaders: result.responseHeaders },
        };
    }

    /**
     * Stage1: 로그를 func 중 하나로 분류하고 confidence 산출
     */
    async classifyLogs(req: LlmPayload) {
        try {
            assertAzureOpenaiConfig(this.cfg);
        } catch (e: any) {
            return { ok: false, status: 500, error: e?.message ?? 'Invalid config' };
        }

        const startedAt = Date.now();
        const requestId = `azure_classify_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
        const logs: LlmLogLine[] = Array.isArray(req?.logs) ? req.logs : [];

        const classifyInstruction =
            await this.configManagerApi.buildClassifyInstruction();
        const logText = logs
            .map((log) => `[${log.level}] ${log.message}`)
            .join('\n');

        const messages = [
            { role: 'system', content: classifyInstruction },
            { role: 'user', content: logText },
        ];

        const result = await this.client.generateContent({
            endpoint: this.cfg.endpoint,
            apiKey: this.cfg.apiKey,
            apiVersion: this.cfg.apiVersion,
            deployment: this.cfg.deployment,
            messages,
            maxCompletionTokens: this.cfg.maxCompletionTokens,
        });

        const elapsedMs = result.elapsedMs ?? Date.now() - startedAt;
        const parsed = parseJsonFromText(result.text);
        const classify = normalizeAzureClassifyResult(parsed);

        this.logger.log(
            `[${requestId}] azure classify func=${classify.func} confidence=${classify.confidence}`,
        );

        return {
            ok: result.ok,
            status: result.status,
            elapsedMs,
            service: 'azure',
            func: classify.func,
            confidence: classify.confidence,
            reason: classify.reason,
            text: result.text,
            raw: result.raw,
        };
    }

    /**
     * LLM 페이로드로부터 프롬프트 생성
     */
    private buildPromptFromLlmPayload(logs: LlmLogLine[]): string {
        if (logs.length === 0) {
            return 'No logs provided. Please provide logs for analysis.';
        }

        const logText = logs
            .map((log) => `[${log.level}] ${log.message}`)
            .join('\n');

        return logText;
    }
}

/** LLM 응답 텍스트에서 코드블록 제거 후 JSON 파싱 */
function parseJsonFromText(text?: string): any {
    if (typeof text !== 'string') return null;
    let body = text.trim();
    const codeBlockMatch = body.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
        body = codeBlockMatch[1].trim();
    }
    try {
        return JSON.parse(body);
    } catch {
        return null;
    }
}

/** Stage1 LLM 응답을 {func, confidence, reason}로 정규화 */
function normalizeAzureClassifyResult(parsed: any): {
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
