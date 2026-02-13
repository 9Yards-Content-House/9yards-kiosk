import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, ArrowLeft, UtensilsCrossed, CreditCard, Banknote, Smartphone } from "lucide-react";
import { useKioskCart } from "../context/KioskCartContext";
import { useCreateOrder } from "@shared/hooks/useOrders";
import { useAllMenuItems } from "@shared/hooks/useMenu";
import { cn, formatPrice } from "@shared/lib/utils";
import { KIOSK } from "@shared/lib/constants";
import KioskHeader from "../components/KioskHeader";
import MoMoPayment from "../components/MoMoPayment";
import { Button } from "@shared/components/ui/button";
import { useSound } from "../hooks/useSound";
import type { PaymentMethod, CreateOrderPayload } from "@shared/types/orders";

export default function Payment() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useKioskCart();
  const { data: allMenuItems = [] } = useAllMenuItems();
  const createOrder = useCreateOrder();
  const { play } = useSound();
  const [step, setStep] = useState<"review" | "momo" | "submitting" | "error">("review");

  // Helper to find item image from menu data
  const getItemImage = useCallback((item: typeof items[0]) => {
    const itemName = item.label || item.sauceName;
    const menuItem = allMenuItems.find(
      (m) => m.name === itemName || m.name.includes(itemName) || itemName.includes(m.name)
    );
    return menuItem?.image_url || null;
  }, [allMenuItems]);

  // Get stored details
  const detailsRaw = sessionStorage.getItem("kiosk_order_details");
  const details = detailsRaw ? JSON.parse(detailsRaw) : null;

  useEffect(() => {
    if (!details || items.length === 0) {
      navigate("/menu", { replace: true });
    }
  }, [details, items.length, navigate]);

  if (!details) return null;

  const paymentMethod: PaymentMethod = details.payment_method;
  const isMoMo = paymentMethod === "mobile_money";

  const handlePlaceOrder = async () => {
    setStep("submitting");

    const payload: CreateOrderPayload = {
      customer_name: details.customer_name,
      customer_phone: details.customer_phone,
      customer_location: details.customer_location,
      payment_method: paymentMethod,
      subtotal,
      total: subtotal,
      special_instructions: details.special_instructions,
      source: KIOSK.ORDER_SOURCE,
      items: items.map((item) => ({
        type: item.type,
        main_dishes: item.mainDishes,
        sauce_name: item.sauceName,
        sauce_preparation: item.saucePreparation,
        sauce_size: item.sauceSize,
        side_dish: item.sideDish,
        extras: item.extras.length > 0 ? item.extras : undefined,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.unitPrice * item.quantity,
      })),
    };

    try {
      const order = await createOrder.mutateAsync(payload);
      sessionStorage.removeItem("kiosk_order_details");
      clearCart();
      navigate("/confirmation", { 
        replace: true,
        state: {
          orderNumber: order.order_number,
          total: order.total,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
        }
      });
    } catch (error) {
      console.error("Order placement failed:", error);
      play('error');
      setStep("error");
    }
  };

  if (step === "submitting") {
    return (
      <div className="kiosk-screen flex flex-col items-center justify-center bg-background">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-16 h-16 animate-spin text-secondary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Placing Your Order...</h2>
          <p className="text-muted-foreground text-lg">Just a moment</p>
        </motion.div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="kiosk-screen flex flex-col items-center justify-center bg-background p-8">
        <XCircle className="w-16 h-16 text-red-500 mb-6" />
        <h2 className="text-2xl font-bold mb-2">Something Went Wrong</h2>
        <p className="text-muted-foreground text-lg mb-8 text-center">
          We couldn't place your order. Please try again.
        </p>
        <div className="flex gap-4">
          <Button
            variant="outline"
            size="touch"
            onClick={() => navigate("/details")}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Go Back
          </Button>
          <Button
            size="touch"
            className="bg-secondary hover:bg-secondary/90"
            onClick={handlePlaceOrder}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (step === "momo") {
    return (
      <MoMoPayment
        phone={details.customer_phone || ""}
        amount={subtotal}
        onSuccess={handlePlaceOrder}
        onCancel={() => setStep("review")}
      />
    );
  }

  // Review step
  return (
    <div className="kiosk-screen flex flex-col bg-[#FAFAFA]">
      <KioskHeader title="Confirm Order" showBack onBack={() => navigate("/details")} />

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        {/* Order Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <h3 className="font-bold text-lg text-[#212282] mb-4">Order Summary</h3>
          <div className="space-y-4">
{items.map((item) => {
                const imageUrl = getItemImage(item);
                return (
              <div key={item.id} className="flex gap-3 items-start pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                {/* Item Image */}
                <div className="shrink-0 w-16 h-16 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 relative">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.label || item.sauceName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={cn(
                    "w-full h-full flex items-center justify-center",
                    imageUrl ? "hidden" : ""
                  )}>
                    <UtensilsCrossed className="w-6 h-6 text-gray-300" />
                  </div>
                  {/* Type badge */}
                  <span className={cn(
                    'absolute bottom-1 left-1 text-[8px] font-bold px-1 py-0.5 rounded-full uppercase',
                    item.type === 'combo' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-blue-100 text-blue-700'
                  )}>
                    {item.type === 'combo' ? 'Combo' : 'Single'}
                  </span>
                </div>

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-[#212282] font-bold text-sm leading-tight line-clamp-2">
                    {item.label || item.sauceName}
                  </h4>
                  
                  {/* Combo details */}
                  {item.type === 'combo' && (
                    <div className="text-xs text-gray-500 space-y-0.5 mt-1">
                      {item.mainDishes && item.mainDishes.length > 0 && (
                        <p className="line-clamp-1">{item.mainDishes.join(' + ')}</p>
                      )}
                      {item.sideDish && (
                        <p className="line-clamp-1">+ {item.sideDish}</p>
                      )}
                      {item.extras && item.extras.length > 0 && (
                        <p className="text-[#E6411C] line-clamp-1">
                          + {item.extras.map((e) => e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                    <span className="text-[#E6411C] font-bold">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            );})}
          </div>
          
          {/* Total */}
          <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200">
            <span className="font-bold text-lg text-[#212282]">Total</span>
            <span className="text-2xl font-bold text-[#E6411C]">{formatPrice(subtotal)}</span>
          </div>
        </div>

        {/* Customer Details */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <h3 className="font-bold text-lg text-[#212282] mb-4">Your Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-[#212282]">{details.customer_name}</span>
            </div>
            {details.customer_phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium text-[#212282]">{details.customer_phone}</span>
              </div>
            )}
            {details.customer_location && (
              <div className="flex justify-between">
                <span className="text-gray-500">Location</span>
                <span className="font-medium text-[#212282]">{details.customer_location}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Payment</span>
              <span className="font-medium text-[#212282]">
                {paymentMethod === "cash" ? "Cash on Delivery" : paymentMethod === "mobile_money" ? "Mobile Money" : "Pay at Counter"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t bg-white p-4 space-y-3">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="touch"
            className="flex-1 border-gray-200 text-[#212282]"
            onClick={() => navigate("/details")}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Edit
          </Button>
          <Button
            size="touch"
            className="flex-1 bg-[#E6411C] hover:bg-[#d13a18] text-white font-bold"
            onClick={isMoMo ? () => setStep("momo") : handlePlaceOrder}
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Place Order
          </Button>
        </div>
      </div>
    </div>
  );
}
