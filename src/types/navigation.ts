import type { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParamList = {
  ListingList: undefined;
  ListingDetail: { listingId: string };
  SellerProfile: { sellerId: string; sellerName: string };
  Notifications: undefined;
  SavedSearches: undefined;
  SwipeDiscover: undefined;
  // Letgo'daki gibi: bir ilandan/bildirimden mesaja girince Mesajlar
  // sekmesine ATLAMAK yerine (ki bu "sekmeler arasi karisiklik" hissi
  // veriyordu, geri tusu nereye donecegi belirsizlesiyordu) dogrudan bu
  // stack'in ustune push ediliyor - geri tusu tam geldigin yere (ilana,
  // sonra ana sayfaya) doner, digerlerine hic dokunmaz.
  Chat: {
    conversationId: string;
    otherUserId: string;
    otherUserName: string;
    otherUserPhoto: string | null;
    listingTitle: string;
  };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Settings: undefined;
  Terms: undefined;
  Help: undefined;
  // ListingDetail/SellerProfile HomeStack'te de var (ayni ekranlar iki
  // sekmeden de acilabilir) - boylece Profil sekmesinden bir ilana girip
  // geri tusuna basinca Ana Sayfa'ya degil, gercekten geldigin yere
  // (Profilim) donulur. Sekmeler arasi navigate('HomeTab', {...}) yapmak
  // geri yiginini o sekmenin kendi stack'ine tasiyip bu hataya yol aciyordu.
  ListingDetail: { listingId: string };
  SellerProfile: { sellerId: string; sellerName: string };
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
  // Ayni sebep: sohbetten satici profiline gecince geri tusu sohbete donsun.
  SellerProfile: { sellerId: string; sellerName: string };
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  AddListing: { editListingId?: string } | undefined;
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
