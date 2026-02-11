import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { useKioskCart } from "../context/KioskCartContext";
import { useCreateOrder } from "@shared/hooks/useOrders";
import { formatPrice } from "@shared/lib/utils";
import { KIOSK } from "@shared/lib/constants";
import KioskHeader from "../components/KioskHeader";
import MoMoPayment from "../components/MoMoPayment";
import { Button } from "@shared/components/ui/button";
import type { PaymentMethod, CreateOrderPayload } from "@shared/types/orders";

export default function Payment() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useKioskCart();
  const createOrder = useCreateOrder();
  const [step, setStep] = useState<"review" | "momo" | "submitting" | "error">("review");

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
    } catch {
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
    <div className="kiosk-screen flex flex-col bg-background">
      <KioskHeader title="Confirm Order" showBack onBack={() => navigate("/details")} />

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        <div className="bg-card rounded-xl p-6 shadow-sm border mb-4">
          <h3 className="font-bold text-lg mb-3">Order Summary</h3>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between py-2 border-b last:border-b-0">
              <div>
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground ml-2">x{item.quantity}</span>
              </div>
              <span className="font-semibold">
                {formatPrice(item.unitPrice * item.quantity)}
              </span>
            </div>
          ))}
          <div className="flex justify-between py-3 font-bold text-xl mt-2">
            <span>Total</span>
            <span className="text-secondary">{formatPrice(subtotal)}</span>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm border mb-4">
          <h3 className="font-bold text-lg mb-3">Your Details</h3>
          <p><strong>Name:</strong> {details.customer_name}</p>
          {details.customer_phone && <p><strong>Phone:</strong> {details.customer_phone}</p>}
          {details.customer_location && <p><strong>Location:</strong> {details.customer_location}</p>}
          <p><strong>Payment:</strong> {paymentMethod === "cash" ? "Cash on Delivery" : paymentMethod === "mobile_money" ? "Mobile Money" : "Pay at Counter"}</p>
        </div>
      </div>

      <div className="border-t bg-card p-4 space-y-3">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="touch"
            className="flex-1"
            onClick={() => navigate("/details")}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Edit
          </Button>
          <Button
            size="touch"
            className="flex-1 bg-secondary hover:bg-secondary/90"
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
