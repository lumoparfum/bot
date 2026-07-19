export type UserRatingSummary = {
  ratingSum: number;
  ratingCount: number;
  salesCount: number;
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
