import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, Smartphone, ArrowLeft, RefreshCw } from "lucide-react";
import { formatPrice } from "@shared/lib/utils";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import KioskHeader from "./KioskHeader";

interface MoMoPaymentProps {
  phone: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

type MoMoStep = "enter" | "waiting" | "success" | "failed" | "timeout";

const PAYMENT_TIMEOUT_SECONDS = 90;

function detectNetwork(phone: string): "MTN" | "Airtel" | "Unknown" {
  const cleaned = phone.replace(/\D/g, "");
  if (/^(256)?(77|78)/.test(cleaned)) return "MTN";
  if (/^(256)?(70|75)/.test(cleaned)) return "Airtel";
  return "Unknown";
}

export default function MoMoPayment({ phone, amount, onSuccess, onCancel }: MoMoPaymentProps) {
  const [momoPhone, setMomoPhone] = useState(phone);
  const [step, setStep] = useState<MoMoStep>("enter");
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(PAYMENT_TIMEOUT_SECONDS);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const network = detectNetwork(momoPhone);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Countdown timer when waiting
  useEffect(() => {
    if (step === "waiting") {
      setCountdown(PAYMENT_TIMEOUT_SECONDS);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            setStep("timeout");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [step]);

  const handleSubmit = async () => {
    setStep("waiting");
    setError(null);

    // Mock mode - simulate successful payment
    if (USE_MOCK_DATA) {
      console.log("📦 Mock MoMo payment:", { phone: momoPhone, amount, network });
      timeoutRef.current = setTimeout(() => {
        setStep("success");
        setTimeout(onSuccess, 1500);
      }, 2000);
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("momo-payment", {
        body: {
          phone_number: momoPhone,
          amount,
          network: network.toLowerCase(),
        },
      });

      if (fnError) throw fnError;

      if (data?.status === "pending") {
        // Poll for payment status with timeout
        const pollInterval = setInterval(async () => {
          try {
            const { data: statusData } = await supabase.functions.invoke("momo-status", {
              body: { reference: data.reference },
            });

            if (statusData?.status === "success") {
              clearInterval(pollInterval);
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              setStep("success");
              setTimeout(onSuccess, 1500);
            } else if (statusData?.status === "failed") {
              clearInterval(pollInterval);
              setError("Payment was declined");
              setStep("failed");
            }
          } catch (err) {
            // Continue polling on network errors - don't interrupt payment flow
            if (import.meta.env.DEV) console.warn('Payment status poll failed:', err);
          }
        }, 3000);

        // Store interval ref for cleanup
        timeoutRef.current = setTimeout(() => {
          clearInterval(pollInterval);
          // Timeout will be handled by countdown effect
        }, PAYMENT_TIMEOUT_SECONDS * 1000);
      } else {
        throw new Error("Payment initiation failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setStep("failed");
    }
  };

  if (step === "waiting") {
    return (
      <div className="kiosk-screen flex flex-col items-center justify-center bg-background p-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <Smartphone className="w-16 h-16 text-primary mx-auto mb-6" />
          <Loader2 className="w-10 h-10 animate-spin text-secondary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Check Your Phone</h2>
          <p className="text-lg text-muted-foreground mb-2">
            A payment prompt has been sent to
          </p>
          <p className="text-xl font-bold">{momoPhone}</p>
          <p className="text-lg text-muted-foreground mt-4">
            {formatPrice(amount)} via {network}
          </p>
          <p className="text-sm text-muted-foreground mt-6">
            Approve the transaction on your phone to complete payment
          </p>
          <div className="mt-6 text-amber-600 font-medium">
            Time remaining: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === "timeout") {
    return (
      <div className="kiosk-screen flex flex-col items-center justify-center bg-background p-8">
        <RefreshCw className="w-16 h-16 text-amber-500 mb-6" />
        <h2 className="text-2xl font-bold mb-2">No Response Received</h2>
        <p className="text-muted-foreground mb-2 text-center max-w-sm">
          We didn't receive a payment confirmation. This could mean:
        </p>
        <ul className="text-muted-foreground text-sm mb-6 list-disc list-inside">
          <li>You didn't receive the prompt</li>
          <li>The prompt expired on your phone</li>
          <li>Network issues occurred</li>
        </ul>
        <div className="flex gap-4">
          <Button variant="outline" size="touch" onClick={onCancel}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Change Method
          </Button>
          <Button
            size="touch"
            className="bg-secondary hover:bg-secondary/90"
            onClick={() => {
              setStep("enter");
              setCountdown(PAYMENT_TIMEOUT_SECONDS);
            }}
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="kiosk-screen flex flex-col items-center justify-center bg-background p-8">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            ✓
          </div>
          <h2 className="text-2xl font-bold">Payment Received!</h2>
        </motion.div>
      </div>
    );
  }

  if (step === "failed") {
    return (
      <div className="kiosk-screen flex flex-col items-center justify-center bg-background p-8">
        <h2 className="text-2xl font-bold mb-2">Payment Failed</h2>
        <p className="text-muted-foreground mb-6">{error || "Please try again"}</p>
        <div className="flex gap-4">
          <Button variant="outline" size="touch" onClick={onCancel}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Change Method
          </Button>
          <Button
            size="touch"
            className="bg-secondary hover:bg-secondary/90"
            onClick={() => setStep("enter")}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Enter phone step
  return (
    <div className="kiosk-screen flex flex-col bg-background">
      <KioskHeader title="Mobile Money" showBack onBack={onCancel} />
      <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-md mx-auto w-full">
        <Smartphone className="w-16 h-16 text-primary mb-6" />
        <h2 className="text-2xl font-bold mb-2">Pay with {network === "Unknown" ? "Mobile Money" : network}</h2>
        <p className="text-lg text-muted-foreground mb-8">
          Amount: <span className="font-bold text-secondary">{formatPrice(amount)}</span>
        </p>

        <div className="w-full mb-6">
          <label className="block text-lg font-semibold mb-2">
            Mobile Money Number
          </label>
          <Input
            value={momoPhone}
            onChange={(e) => setMomoPhone(e.target.value)}
            placeholder="07XX XXX XXX"
            type="tel"
            className="h-14 text-lg text-center"
          />
          {network !== "Unknown" && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Network: {network}
            </p>
          )}
        </div>

        <div className="flex gap-3 w-full">
          <Button variant="outline" size="touch" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="touch"
            className="flex-1 bg-secondary hover:bg-secondary/90"
            disabled={momoPhone.replace(/\D/g, "").length < 10}
            onClick={handleSubmit}
          >
            Send Prompt
          </Button>
        </div>
      </div>
    </div>
  );
}
