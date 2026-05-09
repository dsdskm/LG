import { Injectable, Logger } from '@nestjs/common';
import { assertAzureOpenaiConfig, loadAzureOpenaiConfig } from './azure-openai.config';
import { AzureOpenaiClient } from './azure-openai.client';
import { type LlmPayload, type LlmLogLine } from '@ai-log/shared-contracts';
import { safeStringify, truncate } from 'src/utils/utils';

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

    constructor() { }

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

        // (2) 프롬프트 생성 (지침은 cfg.analysisInstruction에서)
        const logText = logs
            .map((log) => `[${log.level}] ${log.message}`)
            .join('\n');

        const prompt = `${this.cfg.analysisInstruction}\n\n${logText}`;

        // (3) 메시지 포맷 구성
        const messages = [
            {
                role: 'system',
                content: this.cfg.analysisInstruction,
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
