export type ReportType = 'comment' | 'listing' | 'user';

export type ReportInput = {
  type: ReportType;
  targetId: string;
  targetOwnerId: string | null;
  reporterId: string;
  reporterName: string;
  reason: string;
};
