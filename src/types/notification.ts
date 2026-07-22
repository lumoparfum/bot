export type NotificationType = 'favorite' | 'message' | 'savedSearch' | 'business' | 'priceDrop';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  listingId: string | null;
  listingImage: string | null;
  conversationId: string | null;
  fromUserId: string | null;
  fromUserName: string;
  fromUserPhoto: string | null;
  read: boolean;
  createdAt: number;
};
