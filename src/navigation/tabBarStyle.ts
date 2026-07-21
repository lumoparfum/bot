import { shadows, type ColorPalette } from '../constants/theme';

// MainTabNavigator (varsayilan gorunum) ve kaydirinca gizleyen ekranlar
// (bkz. ListingListScreen) AYNI stili kullanmali - yoksa bar tekrar
// belirdiginde farkli boyut/golgeyle "zipliyor" gibi gorunur.
export function getTabBarStyle(colors: ColorPalette, bottomInset: number) {
  return {
    backgroundColor: colors.background,
    borderTopColor: colors.divider,
    height: 62 + bottomInset,
    paddingTop: 8,
    paddingBottom: bottomInset + 8,
    ...shadows.raised,
  };
}
