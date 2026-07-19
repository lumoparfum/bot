import type { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParamList = {
  ListingList: undefined;
  ListingDetail: { listingId: string };
  SellerProfile: { sellerId: string; sellerName: string };
  Notifications: undefined;
  SavedSearches: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Settings: undefined;
  Terms: undefined;
};

export type MessagesStackParamList = {
  ChatList: undefined;
  Chat: {
    conversationId: string;
    otherUserId: string;
    otherUserName: string;
    otherUserPhoto: string | null;
    listingTitle: string;
  };
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  AddListing: undefined;
  Messages: NavigatorScreenParams<MessagesStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
