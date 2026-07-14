import { Injectable } from "@nestjs/common";
import { ApiClient } from "@ai-log/http-api";
import { Func, type ActionCandidate } from "@ai-log/shared-contracts";

type RuntimeProvider = "vertex" | "azure" | "mock" | "off";

type ApiResponse<T> = {
  code: number;
  data: T;
};

type ProviderRow = {
  provider: string;
  instruction: string;
};

type ActiveProviderPayload = {
  provider: string;
};

type FuncRow = {
  tags?: string[];
};

type FuncFullRow = {
  func?: string;
  tags?: string[];
  prompt?: string | null;
};

@Injectable()
export class ConfigManagerApi {
  private readonly baseUrl = process.env.URL_CONFIG_MANAGER ?? "http://localhost:3008";
  private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 500_000);

  constructor(private readonly api: ApiClient) {}

  async getInstruction(provider: "vertex" | "azure"): Promise<string> {
    const url = `${this.trimSlash(this.baseUrl)}/config/llm/${provider}`;
    const res = await this.api.requestJson<ApiResponse<ProviderRow>>("GET", url, undefined, {
      timeoutMs: this.timeoutMs,
    });

    return String(res.data?.data?.instruction ?? "").trim();
  }

  async getActiveProvider(): Promise<RuntimeProvider> {
    const url = `${this.trimSlash(this.baseUrl)}/config/llm/active-provider`;
    const res = await this.api.requestJson<ApiResponse<ActiveProviderPayload>>(
      "GET",
      url,
      undefined,
      { timeoutMs: this.timeoutMs },
    );

    const provider = String(res.data?.data?.provider ?? "").trim().toLowerCase();
    if (
      provider === "vertex" ||
      provider === "azure" ||
      provider === "mock" ||
      provider === "off"
    ) {
      return provider as RuntimeProvider;
    }

    return "vertex";
  }

  async getFuncConstraintInstruction(): Promise<string> {
    const funcsFromReportManager = await this.fetchFuncsFromReportManager();
    if (funcsFromReportManager.length > 0) {
      const list = funcsFromReportManager.map((f) => `${f.key}(${f.name})`).join(", ");
      return [
        "func 필드는 아래 FUNC 목록 중 정확히 하나의 key만 출력해라.",
        `FUNC 목록: ${list}`,
        "예시: 목록에 service(서비스 앱)이 있으면 func 값은 \"service\"만 출력한다.",
        "key 외의 표현(이름, 유사어, 복수 선택)은 금지한다.",
      ].join("\n");
    }

    const tags = await this.fetchFuncTagsFromConfigManager();
    if (tags.length === 0) return "";

    return [
      "func 필드는 아래 FUNC 목록 중 정확히 하나만 선택해서 출력해라.",
      `FUNC 목록: ${tags.join(", ")}`,
      "목록 외 표현, 유사어, 복수 선택은 금지한다.",
    ].join("\n");
  }

  /** UI config 단건 조회 (config_manager의 도메인 상수) */
  async getUiConfig<T = unknown>(key: string): Promise<T | null> {
    try {
      const url = `${this.trimSlash(this.baseUrl)}/config/ui/${encodeURIComponent(key)}`;
      const res = await this.api.requestJson<ApiResponse<{ key: string; value: T }>>(
        "GET",
        url,
        undefined,
        { timeoutMs: this.timeoutMs },
      );
      return (res.data?.data?.value ?? null) as T | null;
    } catch {
      return null;
    }
  }

  /** Stage1(분류) 정적 지침 템플릿 */
  async getStage1ClassifyPrompt(): Promise<string> {
    const value = await this.getUiConfig<string>("stage1_classify_prompt");
    return String(value ?? "").trim();
  }

  /** Stage2(분석) 고정 출력 스키마 블록 */
  async getStage2OutputSchema(): Promise<string> {
    const value = await this.getUiConfig<string>("stage2_output_schema");
    return String(value ?? "").trim();
  }

  /** 개별 func 행 목록 (default 카탈로그 행 제외, func/tags/prompt 포함) */
  async getFuncRows(): Promise<FuncFullRow[]> {
    try {
      const url = `${this.trimSlash(this.baseUrl)}/config/fun`;
      const res = await this.api.requestJson<ApiResponse<FuncFullRow[]>>(
        "GET",
        url,
        undefined,
        { timeoutMs: this.timeoutMs },
      );

      const payload = res.data?.data;
      if (!Array.isArray(payload)) return [];

      return payload.filter((row) => {
        const name = String(row?.func ?? "").trim();
        return name.length > 0 && name !== "default";
      });
    } catch {
      return [];
    }
  }

  /** 특정 func의 기능별 프롬프트 조회 */
  async getFuncPromptByKey(func: string): Promise<string> {
    const target = String(func ?? "").trim();
    if (!target) return "";

    const rows = await this.getFuncRows();
    const match = rows.find((row) => String(row?.func ?? "").trim() === target);
    return String(match?.prompt ?? "").trim();
  }

  /**
   * Stage1(분류) 전체 지침 생성
   * - 정적 템플릿 + 기능 후보 + 기능-태그 매핑
   */
  async buildClassifyInstruction(): Promise<string> {
    const template = await this.getStage1ClassifyPrompt();
    const rows = await this.getFuncRows();

    const candidates = rows
      .map((row) => String(row?.func ?? "").trim())
      .filter(Boolean);

    const mapping = rows
      .map((row) => {
        const name = String(row?.func ?? "").trim();
        if (!name) return null;
        const tags = Array.isArray(row?.tags)
          ? row.tags.map((t) => String(t).trim()).filter(Boolean)
          : [];
        return tags.length === 0 ? `${name}: 태그 없음` : `${name}: ${tags.join(", ")}`;
      })
      .filter(Boolean) as string[];

    return [
      template,
      candidates.length > 0 ? `기능 후보: ${candidates.join(", ")}` : "",
      mapping.length > 0 ? `기능-태그 매핑:\n${mapping.join("\n")}` : "",
    ]
      .filter((v) => v.trim().length > 0)
      .join("\n");
  }

  /**
   * Stage2(분석) 전체 지침 생성
   * - 공용 instruction(provider) + 기능별 프롬프트(funcs.prompt) + 고정 func 값 + 출력 스키마
   */
  async buildAnalyzeInstruction(
    provider: "vertex" | "azure",
    func: string,
    actions: ActionCandidate[] = [],
  ): Promise<string> {
    const [commonInstruction, funcPrompt, outputSchema] = await Promise.all([
      this.getInstruction(provider),
      this.getFuncPromptByKey(func),
      this.getStage2OutputSchema(),
    ]);

    const fixedFuncLine = String(func ?? "").trim()
      ? `func 값은 "${String(func).trim()}" 로 고정해서 출력하세요.`
      : "";

    const actionsInstruction = this.buildActionsInstruction(actions);

    return [commonInstruction, funcPrompt, fixedFuncLine, outputSchema, actionsInstruction]
      .filter((v) => v.trim().length > 0)
      .join("\n\n");
  }

  /**
   * 후속 액션 제안 지침 생성.
   * - 후보 액션 목록을 제시하고, JSON에 actions 키를 추가로 출력하도록 지시.
   * - 후보의 key 중에서만 선택(환각 방지). 적절한 것이 없으면 빈 배열.
   */
  private buildActionsInstruction(actions: ActionCandidate[]): string {
    const list = (Array.isArray(actions) ? actions : [])
      .map((a) => {
        const key = String(a?.key ?? "").trim();
        const name = String(a?.name ?? "").trim();
        if (!key) return null;
        const desc = String(a?.description ?? "").trim();
        return desc ? `- ${key} (${name}): ${desc}` : `- ${key} (${name})`;
      })
      .filter(Boolean) as string[];

    if (list.length === 0) {
      return [
        "[FOLLOWUP_ACTIONS]",
        "위 JSON 객체에 \"actions\" 키를 추가로 포함하세요.",
        "사용 가능한 후속 액션 후보가 없으므로 actions는 빈 배열([])로 출력하세요.",
      ].join("\n");
    }

    return [
      "[FOLLOWUP_ACTIONS]",
      "위 JSON 객체에 \"actions\" 키를 추가로 포함하세요.",
      "이 이슈의 후속 조치로 적절한 액션을, 아래 후보 중에서만 골라 제안하세요.",
      "후보 목록(키와 이름):",
      ...list,
      'actions는 [{ "key": "후보의 key", "reason": "이 액션을 제안하는 이유(한 문장)" }] 형식의 배열입니다.',
      "후보에 없는 key는 절대 만들지 마세요. 적절한 액션이 없으면 빈 배열([])을 출력하세요.",
      "관련도가 높은 순으로 최대 3개까지만 제안하세요.",
    ].join("\n");
  }

  private trimSlash(value: string): string {
    return value.replace(/\/+$/, "");
  }

  private resolveReportManagerBase(): string {
    return this.trimSlash(process.env.URL_REPORT_MANAGER ?? "http://localhost:3005");
  }

  private async fetchFuncsFromReportManager(): Promise<Array<{ key: string; name: string }>> {
    try {
      const res = await fetch(`${this.resolveReportManagerBase()}/funcs`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return [];

      const data = (await res.json()) as Func[] | unknown;
      return Array.isArray(data)
        ? data
            .filter((f) => (f as any)?.key && (f as any)?.name)
            .map((f) => ({ key: String((f as any).key), name: String((f as any).name) }))
        : [];
    } catch {
      return [];
    }
  }

  private async fetchFuncTagsFromConfigManager(): Promise<string[]> {
    try {
      const url = `${this.trimSlash(this.baseUrl)}/config/fun`;
      const res = await this.api.requestJson<ApiResponse<FuncRow[] | { funcs?: string[] }>>(
        "GET",
        url,
        undefined,
        { timeoutMs: this.timeoutMs },
      );

      const payload = res.data?.data;
      if (Array.isArray(payload) && payload.length > 0) {
        const tags = Array.isArray(payload[0]?.tags) ? payload[0].tags : [];
        return tags.map((v) => String(v).trim()).filter(Boolean);
      }

      const funcs = Array.isArray((payload as any)?.funcs)
        ? (payload as any).funcs
        : [];
      return funcs.map((v: unknown) => String(v).trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
}