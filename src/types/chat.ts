export type Conversation = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string | null;
  participantIds: string[];
  buyerId: string;
  buyerName: string;
  buyerPhotoURL: string | null;
  sellerId: string;
  sellerName: string;
  sellerPhotoURL: string | null;
  lastMessage: string;
  lastMessageAt: number;
  lastSenderId: string;
  unreadCount: Record<string, number>;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
};
