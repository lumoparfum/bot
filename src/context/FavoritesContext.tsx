import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchFavoriteIds, setFavorite } from '../services/firestore';

type Listener = () => void;

type FavoritesContextValue = {
  isFavorite: (listingId: string) => boolean;
  toggleFavorite: (listingId: string) => void;
  subscribe: (listener: Listener) => () => void;
  getSnapshot: (listingId: string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Set React state'te DEGIL bir ref'te tutuluyor - aksi halde her favori
  // degisikliginde Provider'in context degeri degisip ekrandaki TUM ilan
  // kartlarini (sadece tiklanani degil) yeniden ciziyordu. useSyncExternalStore
  // sayesinde artik sadece kendi id'sine abone olan kart yeniden render olur.
  const idsRef = useRef<Set<string>>(new Set());
  const listenersRef = useRef<Set<Listener>>(new Set());

  const notify = useCallback(() => {
    listenersRef.current.forEach((listener) => listener());
  }, []);

  useEffect(() => {
    if (!user) {
      idsRef.current = new Set();
      notify();
      return;
    }
    fetchFavoriteIds(user.uid)
      .then((ids) => {
        idsRef.current = new Set(ids);
        notify();
      })
      .catch(() => {});
  }, [user, notify]);

  const toggleFavorite = useCallback(
    (listingId: string) => {
      if (!user) return;
      const wasFavorite = idsRef.current.has(listingId);
      const optimistic = new Set(idsRef.current);
      if (wasFavorite) optimistic.delete(listingId);
      else optimistic.add(listingId);
      idsRef.current = optimistic;
      notify();

      setFavorite(user.uid, listingId, !wasFavorite).catch(() => {
        // Sunucu tarafi basarisiz olursa iyimser guncellemeyi geri al.
        const reverted = new Set(idsRef.current);
        if (wasFavorite) reverted.add(listingId);
        else reverted.delete(listingId);
        idsRef.current = reverted;
        notify();
      });
    },
    [user, notify]
  );

  const isFavorite = useCallback((listingId: string) => idsRef.current.has(listingId), []);
  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);
  const getSnapshot = useCallback((listingId: string) => idsRef.current.has(listingId), []);

  const value = useMemo<FavoritesContextValue>(
    () => ({ isFavorite, toggleFavorite, subscribe, getSnapshot }),
    [isFavorite, toggleFavorite, subscribe, getSnapshot]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return ctx;
}

// Tek bir ilanin favori durumuna ince taneli abonelik - o ilanin favori
// durumu degismedigi surece bu bileseni yeniden render etmez (listedeki
// digerleri favorilenip/cikarilsa bile).
export function useIsFavorite(listingId: string): boolean {
  const ctx = useFavorites();
  const subscribeToId = useCallback((listener: Listener) => ctx.subscribe(listener), [ctx]);
  const getIdSnapshot = useCallback(() => ctx.getSnapshot(listingId), [ctx, listingId]);
  return useSyncExternalStore(subscribeToId, getIdSnapshot);
}
