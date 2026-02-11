import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { useKioskCart } from "../context/KioskCartContext";
import { useTranslation } from "@shared/context/LanguageContext";
import { formatPrice, vibrate } from "@shared/lib/utils";
import { orderDetailsSchema, normalizePhone } from "@shared/lib/validation";
import KioskHeader from "../components/KioskHeader";
import PaymentMethodSelector from "../components/PaymentMethodSelector";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import type { PaymentMethod } from "@shared/types/orders";

export default function Details() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { subtotal, itemCount } = useKioskCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pay_at_counter");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const needsPhone = paymentMethod === "mobile_money";

  // Validate form using Zod
  const validateForm = useCallback(() => {
    const result = orderDetailsSchema.safeParse({
      customer_name: name.trim(),
      customer_phone: phone.trim() || undefined,
      customer_location: location.trim() || undefined,
      payment_method: paymentMethod,
      special_instructions: specialInstructions.trim() || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }

    // Additional check: phone required for MoMo
    if (needsPhone && !phone.trim()) {
      setErrors({ customer_phone: t('details.phoneRequired') });
      return false;
    }

    setErrors({});
    return true;
  }, [name, phone, location, paymentMethod, specialInstructions, needsPhone, t]);

  const isValid = name.trim().length >= 2 && (!needsPhone || phone.trim().length >= 10);

  const handleContinue = () => {
    vibrate();
    if (!validateForm()) return;

    // Format phone number for storage
    const formattedPhone = phone.trim() ? normalizePhone(phone.trim()) : null;

    // Store details in sessionStorage for the next step
    sessionStorage.setItem(
      "kiosk_order_details",
      JSON.stringify({
        customer_name: name.trim(),
        customer_phone: formattedPhone,
        customer_location: location.trim() || null,
        payment_method: paymentMethod,
        special_instructions: specialInstructions.trim() || null,
      })
    );

    navigate("/payment");
  };

  return (
    <div className="kiosk-screen flex flex-col bg-background">
      <KioskHeader title="Your Details" showBack onBack={() => navigate("/cart")} />

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        {/* Name */}
        <div className="mb-6">
          <label className="block text-lg font-semibold mb-2">
            Your Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, customer_name: '' })); }}
            placeholder={t('details.namePlaceholder')}
            className={`h-14 text-lg ${errors.customer_name ? 'border-red-500' : ''}`}
            autoFocus
          />
          {errors.customer_name && (
            <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.customer_name}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="mb-6">
          <label className="block text-lg font-semibold mb-2">
            Phone Number {needsPhone && <span className="text-red-500">*</span>}
          </label>
          <Input
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setErrors((prev) => ({ ...prev, customer_phone: '' })); }}
            placeholder="07XX XXX XXX"
            type="tel"
            inputMode="numeric"
            className={`h-14 text-lg ${errors.customer_phone ? 'border-red-500' : ''}`}
          />
          {errors.customer_phone ? (
            <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.customer_phone}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              {needsPhone ? t('details.phoneRequired') : t('details.phoneOptional')}
            </p>
          )}
        </div>

        {/* Location */}
        <div className="mb-6">
          <label className="block text-lg font-semibold mb-2">
            Desk / Office / Floor
          </label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. 2nd Floor, Room 205"
            className="h-14 text-lg"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Help us find you for delivery
          </p>
        </div>

        {/* Payment method */}
        <div className="mb-6">
          <label className="block text-lg font-semibold mb-3">
            Payment Method <span className="text-red-500">*</span>
          </label>
          <PaymentMethodSelector
            selected={paymentMethod}
            onChange={setPaymentMethod}
          />
        </div>

        {/* Special instructions */}
        <div className="mb-6">
          <label className="block text-lg font-semibold mb-2">
            Special Instructions
          </label>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any special requests?"
            className="w-full h-24 p-3 text-lg border rounded-xl resize-none bg-background"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-card p-4 space-y-3">
        <div className="flex justify-between text-xl font-bold">
          <span>Total ({itemCount} items)</span>
          <span className="text-secondary">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="touch"
            className="flex-1"
            onClick={() => navigate("/cart")}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <Button
            size="touch"
            className="flex-1 bg-secondary hover:bg-secondary/90"
            disabled={!isValid}
            onClick={handleContinue}
          >
            Continue
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
