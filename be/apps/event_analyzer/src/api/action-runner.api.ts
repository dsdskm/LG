import { Injectable, Logger } from "@nestjs/common";
import { ApiClient } from "@ai-log/http-api";
import type { ActionCandidate, ActionItem } from "@ai-log/shared-contracts";

type ApiResponse<T> = {
    code: number;
    data: T;
};

@Injectable()
export class ActionRunnerApi {
    private readonly logger = new Logger(ActionRunnerApi.name);
    private readonly baseUrl = process.env.URL_ACTION_RUNNER ?? "http://localhost:3004";
    private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);

    constructor(private readonly api: ApiClient) {}

    async postEventId(eventId: number): Promise<number> {
        const url = `${this.baseUrl}/actions/events`;
        const r = await this.api.requestJson("POST", url, { eventId }, { timeoutMs: this.timeoutMs });
        this.logger.log(`posted eventId=${eventId} to action_runner status=${r.status}`);
        return r.status;
    }

    /**
     * 분류된 func에 사용 가능한 활성 액션 후보 조회.
     * - 실패 시 빈 배열(후속 액션 제안 없이 분석은 계속 진행).
     */
    async listActionCandidates(func: string): Promise<ActionCandidate[]> {
        const target = String(func ?? "").trim();
        try {
            const url = `${this.baseUrl}/actions?func=${encodeURIComponent(target)}`;
            const r = await this.api.requestJson<ApiResponse<ActionItem[]>>(
                "GET",
                url,
                undefined,
                { timeoutMs: this.timeoutMs },
            );
            const rows = Array.isArray(r.data?.data) ? r.data.data : [];
            return rows.map((row) => ({
                key: row.key,
                name: row.name,
                description: row.description,
            }));
        } catch (e: any) {
            this.logger.error(
                `listActionCandidates failed func=${target} err=${e?.message ?? String(e)}`,
            );
            return [];
        }
    }
}
