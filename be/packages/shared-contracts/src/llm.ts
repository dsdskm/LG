import type { ActionCandidate } from "./action";

export type LlmLogLine = {
    index: number;        // referencedLines 매핑용
    level: string;        // LLM은 enum일 필요 없음
    message: string;
};
export type LlmPayload = {
    logs: LlmLogLine[];
    // Stage2(analyze) 입력: Stage1에서 분류된 func 키 (기능별 프롬프트 합성용)
    func?: string;
    // Stage2(analyze) 입력: 후속 액션 후보(분류된 func에 사용 가능한 액션). LLM이 이 중에서 제안.
    actions?: ActionCandidate[];
};

// Stage1(classify) 응답 계약
export type LlmClassifyResult = {
    func: string;
    confidence: number; // 0.00 ~ 1.00
    reason: string;
};