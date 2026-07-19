import type { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParamList = {
  ListingList: undefined;
  ListingDetail: { listingId: string };
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  AddListing: undefined;
  Profile: undefined;
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
