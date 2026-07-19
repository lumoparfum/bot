export type ListingComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  text: string;
  hidden: boolean;
  createdAt: number;
};
