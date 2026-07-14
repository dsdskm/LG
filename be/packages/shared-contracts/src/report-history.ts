export type ReportSendHistory = {
  id: number;
  eventId: number;
  funcKey: string;
  toEmails: string[];
  subject: string;
  html: string;
  status: "sent" | "failed";
  accepted: string[];
  rejected: string[];
  errorMessage: string;
  createdAt: Date;
  updatedAt: Date;
};
