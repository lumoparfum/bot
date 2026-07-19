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
  hiddenFor: string[];
};

export type OfferStatus = 'pending' | 'accepted' | 'declined';

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
  type: 'text' | 'offer';
  offerAmount: number | null;
  offerStatus: OfferStatus | null;
};
