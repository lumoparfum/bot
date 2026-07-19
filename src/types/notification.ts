export type NotificationType = 'favorite' | 'message' | 'savedSearch';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  listingId: string | null;
  listingImage: string | null;
  conversationId: string | null;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto: string | null;
  read: boolean;
  createdAt: number;
};
