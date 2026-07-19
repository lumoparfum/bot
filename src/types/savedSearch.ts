export type SavedSearch = {
  id: string;
  uid: string;
  query: string;
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  createdAt: number;
};
