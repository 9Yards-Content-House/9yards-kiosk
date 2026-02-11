import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Smartphone, ArrowLeft } from "lucide-react";
import { formatPrice } from "@shared/lib/utils";
import { supabase } from "@shared/lib/supabase";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import KioskHeader from "./KioskHeader";

interface MoMoPaymentProps {
  phone: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

type MoMoStep = "enter" | "waiting" | "success" | "failed";

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

  const network = detectNetwork(momoPhone);

  const handleSubmit = async () => {
    setStep("waiting");
    setError(null);

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
        // Poll or wait for callback — simplified: just wait with a timer
        setTimeout(() => {
          // In production, this would poll the payment status
          setStep("success");
          setTimeout(onSuccess, 1500);
        }, 5000);
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
          <Smartphone className="w-16 h-16 text-yards-blue mx-auto mb-6" />
          <Loader2 className="w-10 h-10 animate-spin text-yards-orange mx-auto mb-6" />
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
        </motion.div>
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
            className="bg-yards-orange hover:bg-yards-orange/90"
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
        <Smartphone className="w-16 h-16 text-yards-blue mb-6" />
        <h2 className="text-2xl font-bold mb-2">Pay with {network === "Unknown" ? "Mobile Money" : network}</h2>
        <p className="text-lg text-muted-foreground mb-8">
          Amount: <span className="font-bold text-yards-orange">{formatPrice(amount)}</span>
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
            className="flex-1 bg-yards-orange hover:bg-yards-orange/90"
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
