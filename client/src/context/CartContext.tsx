import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setQuantity, type CartLine } from '../lib/cart';

interface StoredCart {
  /** Jour du menu : le panier est vidé quand le menu change. */
  date: string | null;
  lines: CartLine[];
}

interface CartState extends StoredCart {
  count: number;
  quantityOf: (dishId: string) => number;
  update: (dish: CartLine['dish'], quantity: number, menuDate: string) => void;
  syncWithMenu: (menuDate: string) => void;
  clear: () => void;
}

const STORAGE_KEY = 'express-food-panier';
const EMPTY: StoredCart = { date: null, lines: [] };
const CartContext = createContext<CartState | null>(null);

function readStoredCart(): StoredCart {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredCart) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<StoredCart>(readStoredCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Stockage indisponible (navigation privée) : le panier reste en mémoire.
    }
  }, [cart]);

  const update = useCallback((dish: CartLine['dish'], quantity: number, menuDate: string) => {
    setCart((current) => {
      const lines = current.date === menuDate ? current.lines : [];
      return { date: menuDate, lines: setQuantity(lines, dish, quantity) };
    });
  }, []);

  const syncWithMenu = useCallback((menuDate: string) => {
    setCart((current) => (current.date && current.date !== menuDate ? EMPTY : current));
  }, []);

  const clear = useCallback(() => setCart(EMPTY), []);

  const value = useMemo<CartState>(
    () => ({
      ...cart,
      count: cart.lines.reduce((n, l) => n + l.quantity, 0),
      quantityOf: (dishId) => cart.lines.find((l) => l.dish.id === dishId)?.quantity ?? 0,
      update,
      syncWithMenu,
      clear,
    }),
    [cart, update, syncWithMenu, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart doit être utilisé dans <CartProvider>');
  return ctx;
}
