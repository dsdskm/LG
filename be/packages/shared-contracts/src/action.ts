export type ActionItem = {
  id: number;
  key: string;
  name: string;
  description: string;
  enable: boolean;
  // 이 액션을 사용할 수 있는 기능(func) 키 목록. 비어 있으면 모든 기능에 적용.
  funcs: string[];
  createdAt: string;
  updatedAt: string;
};

export type ActionInput = {
  key: string;
  name: string;
  description?: string;
  enable?: boolean;
  funcs?: string[];
};

// Stage2(분석)에서 LLM에 후속 액션 후보로 전달하는 최소 형태.
export type ActionCandidate = {
  key: string;
  name: string;
  description?: string;
};

// 이슈 분석 결과로 제안된 후속 액션 (analysis.actions 에 저장).
export type SuggestedAction = {
  key: string;
  name: string;
  reason: string;
};
