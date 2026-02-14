import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { OrderItemType, OrderExtra } from "@shared/types/orders";

const CART_STORAGE_KEY = "kiosk_cart_items";

// --- Cart item shape ---
export interface KioskCartItem {
  id: string; // client-side unique id
  type: OrderItemType;
  mainDishes: string[];
  sauceName?: string;
  saucePreparation?: string;
  sauceSize?: string;
  sideDish?: string;
  extras: OrderExtra[];
  quantity: number;
  unitPrice: number;
  label: string; // Display name for the cart
}

// --- State ---
interface CartState {
  items: KioskCartItem[];
}

// --- Actions ---
type CartAction =
  | { type: "ADD_ITEM"; item: KioskCartItem }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "UPDATE_QUANTITY"; id: string; quantity: number }
  | { type: "CLEAR_CART" }
  | { type: "RESTORE_CART"; items: KioskCartItem[] };

// Load cart from localStorage
function loadPersistedCart(): KioskCartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load cart from localStorage:", e);
  }
  return [];
}

// Save cart to localStorage
function persistCart(items: KioskCartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn("Failed to save cart to localStorage:", e);
  }
}

function cartReducer(state: CartState, action: CartAction): CartState {
  let newState: CartState;
  
  switch (action.type) {
    case "ADD_ITEM":
      newState = { items: [...state.items, action.item] };
      break;

    case "REMOVE_ITEM":
      newState = { items: state.items.filter((i) => i.id !== action.id) };
      break;

    case "UPDATE_QUANTITY":
      if (action.quantity <= 0) {
        newState = { items: state.items.filter((i) => i.id !== action.id) };
      } else {
        newState = {
          items: state.items.map((i) =>
            i.id === action.id ? { ...i, quantity: action.quantity } : i
          ),
        };
      }
      break;

    case "CLEAR_CART":
      newState = { items: [] };
      break;

    case "RESTORE_CART":
      newState = { items: action.items };
      break;

    default:
      return state;
  }

  // Persist to localStorage after every change (except restore)
  if (action.type !== "RESTORE_CART") {
    persistCart(newState.items);
  }

  return newState;
}

// --- Context ---
interface KioskCartContextValue {
  items: KioskCartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: KioskCartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const KioskCartContext = createContext<KioskCartContextValue | null>(null);

export function KioskCartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // Restore cart from localStorage on mount
  useEffect(() => {
    const persistedItems = loadPersistedCart();
    if (persistedItems.length > 0) {
      dispatch({ type: "RESTORE_CART", items: persistedItems });
    }
  }, []);

  const addItem = useCallback(
    (item: KioskCartItem) => dispatch({ type: "ADD_ITEM", item }),
    []
  );
  const removeItem = useCallback(
    (id: string) => dispatch({ type: "REMOVE_ITEM", id }),
    []
  );
  const updateQuantity = useCallback(
    (id: string, quantity: number) =>
      dispatch({ type: "UPDATE_QUANTITY", id, quantity }),
    []
  );
  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = state.items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );

  return (
    <KioskCartContext.Provider
      value={{
        items: state.items,
        itemCount,
        subtotal,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </KioskCartContext.Provider>
  );
}

export function useKioskCart() {
  const ctx = useContext(KioskCartContext);
  if (!ctx) throw new Error("useKioskCart must be used within KioskCartProvider");
  return ctx;
}
