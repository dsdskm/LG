export type LlmLogLine = {
    index: number;        // referencedLines 매핑용
    level: string;        // LLM은 enum일 필요 없음
    message: string;
};
export type LlmPayload = {
    logs: LlmLogLine[];
};