export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "UNKNOWN";
export type ParsedLogLine = {
    index: number;     // LLM referencedLines 매핑용
    level: LogLevel;
    message: string;
};

export type ErrorLogBundle = {
    errorIndex: number;
    context: ParsedLogLine[];
};