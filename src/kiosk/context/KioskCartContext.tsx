import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import type { OrderItemType, OrderExtra } from "@shared/types/orders";

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
  | { type: "CLEAR_CART" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM":
      return { items: [...state.items, action.item] };

    case "REMOVE_ITEM":
      return { items: state.items.filter((i) => i.id !== action.id) };

    case "UPDATE_QUANTITY":
      if (action.quantity <= 0) {
        return { items: state.items.filter((i) => i.id !== action.id) };
      }
      return {
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, quantity: action.quantity } : i
        ),
      };

    case "CLEAR_CART":
      return { items: [] };

    default:
      return state;
  }
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
  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);

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
