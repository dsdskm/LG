// apps/llm_gateway/src/llm/vertex/vertex-gemini.service.ts

import { Injectable, Logger } from "@nestjs/common";
import { assertVertexConfig, loadVertexGeminiConfig } from "./vertex-gemini.config";
import { VertexGeminiClient } from "./vertex-gemini.client";
import { type LlmPayload, type LlmLogLine } from "@ai-log/shared-contracts";
import { safeStringify, truncate } from "src/utils/utils";

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
    );
    constructor() { }
    /**
     * LLM 로그 분석 요청 처리 (슬림 타입 기준)
     * - 입력: { logs: [{ index, level, message }] }
     */
    async analyzeLogs(req: LlmPayload) {
        // (0) 필수 설정 검증
        try {
            assertVertexConfig(this.cfg);
        } catch (e: any) {
            return { ok: false, error: e?.message ?? "Invalid config" };
        }

        const startedAt = Date.now();
        const requestId = `req_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

        // (1) 입력 정규화
        const logs: LlmLogLine[] = Array.isArray(req?.logs) ? req.logs : [];

        // (2) 프롬프트 생성 (지침은 cfg.analysisInstruction에서)
        const prompt = buildPromptFromLlmPayload(logs, this.cfg.analysisInstruction);

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
            const text = result.text ?? "";

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
            vertex: { project: this.cfg.projectId, location, modelId },
            request: { logCount: logs.length },
            text: result.text,
            raw: result.raw,
            debug: { url: result.url, responseHeaders: result.responseHeaders },
        };
    }

    async mockAnalyzeLogs(req: LlmPayload) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        return {
            ok: true,
            status: 200,
            elapsedMs: 5000,
            vertex: {
                project: "ailogsystem-493123",
                location: "us-central1",
                modelId: "gemini-2.5-flash",
            },
            request: {
                logCount: Array.isArray(req?.logs) ? req.logs.length : 0,
            },
            text: JSON.stringify({
                summary: "로봇의 로컬라이제이션 시스템에서 'localization jump' 오류가 발생했습니다. 이는 로봇의 위치 추정값이 갑자기 크게 변동하거나 불안정해졌음을 의미합니다.",
                reason: "로그 [15] ERROR localization jump는 로봇의 현재 위치를 파악하는 로컬라이제이션 기능에 심각한 문제가 발생했음을 나타냅니다. 이는 센서 데이터의 이상, 환경 변화, 로컬라이제이션 알고리즘의 오작동 또는 파라미터 불일치 등으로 인해 로봇의 위치 추정값이 갑자기 크게 변동하여 로봇이 자신의 위치를 정확히 알 수 없게 된 상황입니다.",
                solutions: [
                    "로컬라이제이션에 사용되는 센서(LiDAR, 카메라, IMU 등)의 데이터 품질과 연결 상태를 확인하십시오.",
                    "로컬라이제이션 알고리즘(예: AMCL, EKF)의 파라미터 설정을 현재 환경에 맞게 조정하십시오.",
                    "로봇 주변 환경에 로컬라이제이션을 방해할 수 있는 급격한 변화(예: 움직이는 물체, 조명 변화, 반사 표면)가 있었는지 확인하십시오.",
                    "로봇의 로컬라이제이션 시스템 소프트웨어 또는 펌웨어에 알려진 버그가 있는지 확인하고 필요한 경우 업데이트를 적용하십시오.",
                    "로봇의 로컬라이제이션 시스템을 재초기화하여 현재 위치를 다시 설정하도록 시도하십시오.",
                    "사용 중인 맵(지도)이 정확하고 최신 상태인지 확인하고, 필요한 경우 맵을 다시 생성하거나 업데이트하십시오."
                ],
            }),
            raw: {
                candidates: [
                    {
                        content: {
                            role: "model",
                            parts: [
                                {
                                    text: JSON.stringify({
                                        summary: "로봇의 로컬라이제이션 시스템에서 'localization jump' 오류가 발생했습니다. 이는 로봇의 위치 추정값이 갑자기 크게 변동하거나 불안정해졌음을 의미합니다.",
                                        reason: "로그 [15] ERROR localization jump는 로봇의 현재 위치를 파악하는 로컬라이제이션 기능에 심각한 문제가 발생했음을 나타냅니다. 이는 센서 데이터의 이상, 환경 변화, 로컬라이제이션 알고리즘의 오작동 또는 파라미터 불일치 등으로 인해 로봇의 위치 추정값이 갑자기 크게 변동하여 로봇이 자신의 위치를 정확히 알 수 없게 된 상황입니다.",
                                        solutions: [
                                            "로컬라이제이션에 사용되는 센서(LiDAR, 카메라, IMU 등)의 데이터 품질과 연결 상태를 확인하십시오.",
                                            "로컬라이제이션 알고리즘(예: AMCL, EKF)의 파라미터 설정을 현재 환경에 맞게 조정하십시오.",
                                            "로봇 주변 환경에 로컬라이제이션을 방해할 수 있는 급격한 변화(예: 움직이는 물체, 조명 변화, 반사 표면)가 있었는지 확인하십시오.",
                                            "로봇의 로컬라이제이션 시스템 소프트웨어 또는 펌웨어에 알려진 버그가 있는지 확인하고 필요한 경우 업데이트를 적용하십시오.",
                                            "로봇의 로컬라이제이션 시스템을 재초기화하여 현재 위치를 다시 설정하도록 시도하십시오.",
                                            "사용 중인 맵(지도)이 정확하고 최신 상태인지 확인하고, 필요한 경우 맵을 다시 생성하거나 업데이트하십시오."
                                        ],
                                    }),
                                },
                            ],
                        },
                    },
                ],
            },
        };
    }
}

/**
 * 최소 계약(LlmPayload.logs) 기준 프롬프트 생성
 * - index/level/message만 사용
 * - instruction은 config에서 주입
 */
function buildPromptFromLlmPayload(logs: LlmLogLine[], instruction: string) {
    const lines = logs.map((l) => {
        const idx = Number.isFinite(l.index) ? l.index : -1;
        const lvl = String(l.level ?? "UNKNOWN").toUpperCase().padEnd(5, " ");
        const msg = String(l.message ?? "");
        return `[${idx}] ${lvl} ${msg}`;
    });

    return ["### SYSTEM", instruction, "", "### LOGS", ...lines].join("\n");
}
