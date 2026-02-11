import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trash2, Plus, Minus, ArrowLeft, ArrowRight } from "lucide-react";
import { useKioskCart } from "../context/KioskCartContext";
import { formatPrice } from "@shared/lib/utils";
import { vibrate } from "@shared/lib/utils";
import KioskHeader from "../components/KioskHeader";
import { Button } from "@shared/components/ui/button";

export default function Cart() {
  const navigate = useNavigate();
  const { items, itemCount, subtotal, updateQuantity, removeItem } =
    useKioskCart();

  if (items.length === 0) {
    return (
      <div className="kiosk-screen flex flex-col bg-background">
        <KioskHeader title="Your Cart" showBack onBack={() => navigate("/menu")} />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <p className="text-xl text-muted-foreground mb-8">
            Your cart is empty
          </p>
          <Button
            size="touch"
            onClick={() => navigate("/menu")}
            className="bg-yards-orange hover:bg-yards-orange/90"
          >
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="kiosk-screen flex flex-col bg-background">
      <KioskHeader title="Your Cart" showBack onBack={() => navigate("/menu")} />

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card rounded-xl p-4 mb-3 shadow-sm border"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <h3 className="font-semibold text-lg">{item.label}</h3>
                {item.sauceName && (
                  <p className="text-sm text-muted-foreground">
                    {item.sauceName}
                    {item.saucePreparation && ` • ${item.saucePreparation}`}
                    {item.sauceSize && ` • ${item.sauceSize}`}
                  </p>
                )}
                {item.mainDishes.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {item.mainDishes.join(", ")}
                  </p>
                )}
                {item.sideDish && (
                  <p className="text-sm text-muted-foreground">
                    Side: {item.sideDish}
                  </p>
                )}
                {item.extras.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    + {item.extras.map((e) => e.name).join(", ")}
                  </p>
                )}
                <p className="font-semibold text-yards-orange mt-1">
                  {formatPrice(item.unitPrice * item.quantity)}
                </p>
              </div>

              <div className="flex flex-col items-center gap-2">
                {/* Quantity controls */}
                <div className="flex items-center gap-3 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => {
                      vibrate();
                      updateQuantity(item.id, item.quantity - 1);
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-background shadow-sm"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-lg font-semibold w-8 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => {
                      vibrate();
                      updateQuantity(item.id, item.quantity + 1);
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-background shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Remove */}
                <button
                  onClick={() => {
                    vibrate([10, 50, 10]);
                    removeItem(item.id);
                  }}
                  className="text-red-500 p-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t bg-card p-4 space-y-3">
        <div className="flex justify-between text-xl font-bold">
          <span>Total ({itemCount} items)</span>
          <span className="text-yards-orange">{formatPrice(subtotal)}</span>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="touch"
            className="flex-1"
            onClick={() => navigate("/menu")}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Add More
          </Button>
          <Button
            size="touch"
            className="flex-1 bg-yards-orange hover:bg-yards-orange/90"
            onClick={() => navigate("/details")}
          >
            Checkout
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
