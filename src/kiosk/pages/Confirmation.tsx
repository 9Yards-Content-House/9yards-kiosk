import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, User, Phone } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import OrderNumber from "../components/OrderNumber";

interface OrderDetails {
  customerName: string;
  customerPhone: string;
}

interface LocationState {
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
}

export default function Confirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [countdown, setCountdown] = useState(90);

  useEffect(() => {
    // Try to get data from Router state first, then fallback to sessionStorage
    let foundOrderNumber = state?.orderNumber;
    let foundName = state?.customerName;
    let foundPhone = state?.customerPhone;
    
    if (!foundOrderNumber) {
      foundOrderNumber = sessionStorage.getItem("kiosk_order_number") || undefined;
    }
    
    if (!foundOrderNumber) {
      navigate("/", { replace: true });
      return;
    }
    
    setOrderNumber(foundOrderNumber);
    
    // Get customer details from state or sessionStorage
    if (foundName || foundPhone) {
      setOrderDetails({
        customerName: foundName || "",
        customerPhone: foundPhone || "",
      });
    } else {
      const detailsStr = sessionStorage.getItem("kiosk_order_details");
      if (detailsStr) {
        try {
          const details = JSON.parse(detailsStr);
          setOrderDetails({
            customerName: details.customerName || "",
            customerPhone: details.customerPhone || "",
          });
        } catch {}
      }
    }
  }, [navigate, state]);

  // Auto-reset countdown
  useEffect(() => {
    if (!orderNumber) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleNewOrder();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderNumber]);

  const handleNewOrder = () => {
    sessionStorage.removeItem("kiosk_order_number");
    sessionStorage.removeItem("kiosk_order_details");
    navigate("/", { replace: true });
  };

  if (!orderNumber) return null;

  return (
    <div className="kiosk-screen flex flex-col items-center justify-center bg-background p-8">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        className="text-center"
      >
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />

        <h1 className="text-3xl font-bold mb-2">Order Placed!</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Your order has been sent to the kitchen
        </p>

        <OrderNumber number={orderNumber} />

        {/* Customer details - prominent display */}
        {orderDetails && (
          <div className="mt-6 bg-muted/50 rounded-2xl p-4 max-w-sm mx-auto space-y-2">
            {orderDetails.customerName && (
              <div className="flex items-center justify-center gap-2 text-lg">
                <User className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">{orderDetails.customerName}</span>
              </div>
            )}
            {orderDetails.customerPhone && (
              <div className="flex items-center justify-center gap-2 text-base text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{orderDetails.customerPhone}</span>
              </div>
            )}
          </div>
        )}

        <p className="text-muted-foreground mt-6 mb-2">
          Remember your order number!
        </p>
        <p className="text-sm text-muted-foreground mb-12">
          You'll be notified when your food is ready.
        </p>

        <Button
          size="touch"
          className="bg-primary hover:bg-primary/90 text-white px-12"
          onClick={handleNewOrder}
        >
          Start New Order
        </Button>

        {/* Auto-reset progress */}
        <div className="mt-8 w-64 mx-auto">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-muted-foreground/30"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 90, ease: "linear" }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Returning to home in {countdown}s
          </p>
        </div>
      </motion.div>
    </div>
  );
}
