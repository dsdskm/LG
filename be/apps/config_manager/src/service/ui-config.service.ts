import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventConfigEntity } from "../db/event-config.entity";

/**
 * 프론트 도메인 상수를 DB(key/value config)로 이전해 제공하는 서비스.
 * - 저장소: EventConfigEntity(key/value) 재사용
 * - 값은 JSON 문자열로 직렬화하여 저장 (객체/배열/문자열 모두 지원)
 * - 최초 조회 시 기본값을 seed (event-config.service의 seed 패턴 재사용)
 */

const STAGE1_CLASSIFY_PROMPT = [
  "응답은 반드시 JSON 객체만 반환하세요.",
  "키는 func, confidence, reason만 사용하세요.",
  "func 값은 기능 목록 API에서 제공한 항목 중 하나만 반환하세요.",
  "confidence는 0.00~1.00 범위의 숫자이며 소수점 둘째 자리까지 반환하세요.",
  "reason은 해당 func로 분류한 근거를 1문장으로 반환하세요.",
  "기능별 태그를 참고해, 로그에 태그가 포함되거나 의미가 유사하면 해당 기능으로 우선 분류하세요.",
  "마크다운, 코드블록, 설명 문장, 추가 키는 금지합니다.",
  "",
  "다중 에러 로그가 있는 경우:",
  "- 모든 에러를 분석해 공통 원인/가장 중요한 기능 분류를 반환하세요.",
  "- 개별 에러별 func이 다르면, 전체 영향도가 높은 기능 하나를 선택하세요.",
  "- confidence는 분류의 신뢰도를 반영하세요 (여러 로그가 같은 기능 지시 시 높음).",
  "출력 예시:",
  "{",
  '  "func": "서비스",',
  '  "confidence": 0.86,',
  '  "reason": "로그의 서비스 관련 태그가 다수 포함되어 있습니다."',
  "}",
].join("\n");

const STAGE2_OUTPUT_SCHEMA = `[OUTPUT_SCHEMA_START]
반드시 아래 JSON 객체 형식으로만 응답하세요. 마크다운, 설명 문장, 코드블록은 금지합니다.

{
  "summary": "주행 중 전방 장애물 감지",
  "reason": "센서 노이즈로 거리값이 급변했습니다.",
  "func": "서비스",
  "severity": "High",
  "solution": "센서 보정 후 재시도하고 3회 연속 실패 시 수동 점검을 요청하세요."
}

제약 조건:
- summary: 30자 이내
- reason: 50자 이내
- func: 1차 분류 결과의 func 값을 그대로 사용
- severity: Critical, High, Medium, Low 중 하나
- solution: 100자 이내

다중 에러 로그가 있는 경우:
- 모든 에러 로그를 분석해 공통 원인이 있는지 확인하세요.
- 공통 원인이 있으면 이를 summary/reason으로 작성하세요.
- 개별 에러들이 독립적이면, 가장 중요도/영향도가 높은 에러를 기준으로 분석하세요.
- solution은 전체 에러 상황을 종합적으로 해결하는 방안을 제시하세요.
[OUTPUT_SCHEMA_END]`;

export const UI_CONFIG_DEFAULTS: Record<string, unknown> = {
  status_labels: {
    received: "로그 획득",
    prepared: "분석 준비 완료",
    prepare_failed: "분석 준비 실패",
    analyzing: "분석중",
    analyzed: "분석 완료",
    analyze_failed: "분석 실패",
    completed: "조치 완료",
    failed: "오류 발생",
  },
  status_options: [
    { value: "all", name: "상태 전체" },
    { value: "received", name: "로그 획득" },
    { value: "prepared", name: "분석 준비 완료" },
    { value: "prepare_failed", name: "분석 준비 실패" },
    { value: "analyzing", name: "분석중" },
    { value: "analyzed", name: "분석 완료" },
    { value: "analyze_failed", name: "분석 실패" },
    { value: "completed", name: "조치 완료" },
    { value: "failed", name: "오류 발생" },
  ],
  severity_labels: {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  },
  severity_options: [
    { value: "all", name: "Level 전체" },
    { value: "critical", name: "Critical" },
    { value: "high", name: "High" },
    { value: "medium", name: "Medium" },
    { value: "low", name: "Low" },
  ],
  provider_labels: {
    off: "없음",
    azure: "MS Azure",
    vertex: "Google Vertex",
    mock: "Mock",
  },
  team_options: ["1팀", "2팀", "3팀", "4팀", "5팀"],
  report_token_keys: [
    "eventId",
    "summary",
    "reason",
    "solutions",
    "actions",
    "func",
    "funcKey",
    "severity",
    "service",
    "provider",
    "createdAt",
    "updatedAt",
  ],
  stage1_classify_prompt: STAGE1_CLASSIFY_PROMPT,
  stage2_output_schema: STAGE2_OUTPUT_SCHEMA,
};

const KEY_PREFIX = "ui:";

@Injectable()
export class UiConfigService {
  private readonly logger = new Logger(UiConfigService.name);

  constructor(
    @InjectRepository(EventConfigEntity)
    private readonly repo: Repository<EventConfigEntity>,
  ) {}

  private rowKey(key: string): string {
    return `${KEY_PREFIX}${key}`;
  }

  private parseValue(raw: string, fallback: unknown): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback ?? raw;
    }
  }

  /** 단일 키 조회 (없으면 기본값 seed 후 반환) */
  async getOne(key: string): Promise<unknown> {
    if (!(key in UI_CONFIG_DEFAULTS)) {
      throw new BadRequestException(`unknown ui config key: ${key}`);
    }

    const existing = await this.repo.findOne({ where: { key: this.rowKey(key) } });
    if (existing?.value) {
      return this.parseValue(existing.value, UI_CONFIG_DEFAULTS[key]);
    }

    await this.upsert(key, UI_CONFIG_DEFAULTS[key], "system-seed");
    return UI_CONFIG_DEFAULTS[key];
  }

  /** 전체 UI 상수 일괄 조회 (누락 키는 기본값 seed) */
  async getAll(): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(UI_CONFIG_DEFAULTS)) {
      result[key] = await this.getOne(key);
    }
    return result;
  }

  /** 단일 키 upsert */
  async upsert(
    key: string,
    value: unknown,
    updatedBy?: string,
  ): Promise<{ key: string; value: unknown; updatedAt: Date }> {
    if (!(key in UI_CONFIG_DEFAULTS)) {
      throw new BadRequestException(`unknown ui config key: ${key}`);
    }

    const serialized = JSON.stringify(value);
    const existing = await this.repo.findOne({ where: { key: this.rowKey(key) } });

    let row: EventConfigEntity;
    if (existing) {
      existing.value = serialized;
      existing.updatedBy = updatedBy?.trim() || existing.updatedBy || null;
      row = await this.repo.save(existing);
    } else {
      row = await this.repo.save(
        this.repo.create({
          key: this.rowKey(key),
          value: serialized,
          updatedBy: updatedBy?.trim() || null,
        }),
      );
    }

    return { key, value, updatedAt: row.updatedAt };
  }
}
