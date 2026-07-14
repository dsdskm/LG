export type ReportConfigInput = {
  key: string;
  subjectTemplate: string;
  htmlTemplate: string;
  description?: string;
  enabled?: boolean;
};

export type ReportConfigUpdateInput = {
  key?: string;
  subjectTemplate?: string;
  htmlTemplate?: string;
  description?: string;
  enabled?: boolean;
};

export type ReportConfig = {
  id: number;
  key: string;
  subjectTemplate: string;
  htmlTemplate: string;
  description: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};
