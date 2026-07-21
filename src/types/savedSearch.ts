export type SavedSearch = {
  id: string;
  uid: string;
  query: string;
  category: string | null;
  subcategory: string | null;
  attributes: Record<string, string>;
  minPrice: number | null;
  maxPrice: number | null;
  createdAt: number;
};
