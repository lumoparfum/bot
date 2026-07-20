export type AccountType = 'individual' | 'business';

export type UserRatingSummary = {
  ratingSum: number;
  ratingCount: number;
  salesCount: number;
  contactedCount: number;
  responseCount: number;
  responseTimeTotalMinutes: number;
  accountType: AccountType;
  createdAt: number | null;
  lastActiveAt: number | null;
};

export type Review = {
  id: string;
  raterId: string;
  raterName: string;
  raterPhotoURL: string | null;
  rating: number;
  comment: string;
  createdAt: number;
};
