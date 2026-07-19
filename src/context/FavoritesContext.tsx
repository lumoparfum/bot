import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchFavoriteIds, setFavorite } from '../services/firestore';

type FavoritesContextValue = {
  isFavorite: (listingId: string) => boolean;
  toggleFavorite: (listingId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    fetchFavoriteIds(user.uid)
      .then((ids) => setFavoriteIds(new Set(ids)))
      .catch(() => {});
  }, [user]);

  const toggleFavorite = useCallback(
    (listingId: string) => {
      if (!user) return;
      const wasFavorite = favoriteIds.has(listingId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(listingId);
        else next.add(listingId);
        return next;
      });
      setFavorite(user.uid, listingId, !wasFavorite).catch(() => {
        // Sunucu tarafi basarisiz olursa iyimser guncellemeyi geri al.
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
      });
    },
    [user, favoriteIds]
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      isFavorite: (id: string) => favoriteIds.has(id),
      toggleFavorite,
    }),
    [favoriteIds, toggleFavorite]
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
