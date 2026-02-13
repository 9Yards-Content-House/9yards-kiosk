import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

const FAVORITES_KEY = 'kiosk-favorites';

// Load favorites from localStorage
function loadFavorites(): string[] {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// Save favorites to localStorage
function saveFavorites(favorites: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore storage errors
  }
}

interface FavoritesContextValue {
  favorites: string[];
  toggleFavorite: (itemId: string) => void;
  isFavorite: (itemId: string) => boolean;
  addFavorite: (itemId: string) => void;
  removeFavorite: (itemId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());

  // Sync to localStorage whenever favorites change
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  }, []);

  const isFavorite = useCallback(
    (itemId: string) => favorites.includes(itemId),
    [favorites]
  );

  const addFavorite = useCallback((itemId: string) => {
    setFavorites((prev) => {
      if (prev.includes(itemId)) return prev;
      return [...prev, itemId];
    });
  }, []);

  const removeFavorite = useCallback((itemId: string) => {
    setFavorites((prev) => prev.filter((id) => id !== itemId));
  }, []);

  return (
    <FavoritesContext.Provider
      value={{ favorites, toggleFavorite, isFavorite, addFavorite, removeFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

export default FavoritesContext;
