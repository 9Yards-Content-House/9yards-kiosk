import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, User, Phone, CheckCircle2, Gift } from "lucide-react";
import { useKioskCart } from "../context/KioskCartContext";
import { useTranslation } from "@shared/context/LanguageContext";
import { formatPrice, vibrate, cn } from "@shared/lib/utils";
import { normalizePhone, requiredPhoneSchema, nameSchema, specialInstructionsSchema } from "@shared/lib/validation";
import { useLoyaltyPoints, getLoyaltyTier, formatPoints, calculatePointsEarned } from "@shared/hooks/useLoyaltyPoints";
import KioskHeader from "../components/KioskHeader";
import PaymentMethodSelector from "../components/PaymentMethodSelector";
import { Button } from "@shared/components/ui/button";
import type { PaymentMethod } from "@shared/types/orders";

// Sanitize text input to prevent XSS
function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

// Uganda flag SVG component
const UgandaFlag = () => (
  <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="2.67" fill="#000000"/>
    <rect y="2.67" width="24" height="2.67" fill="#FCDC04"/>
    <rect y="5.33" width="24" height="2.67" fill="#D90000"/>
    <rect y="8" width="24" height="2.67" fill="#000000"/>
    <rect y="10.67" width="24" height="2.67" fill="#FCDC04"/>
    <rect y="13.33" width="24" height="2.67" fill="#D90000"/>
    <circle cx="12" cy="8" r="4" fill="white"/>
    <path d="M12 5.5c-0.4 0-0.8 0.3-0.8 0.8 0 0.2 0.1 0.4 0.2 0.5l-0.8 0.8c-0.2-0.1-0.4-0.1-0.6-0.1-0.7 0-1.2 0.5-1.2 1.2 0 0.3 0.1 0.6 0.3 0.8l-0.3 0.3c0.3 0.3 0.6 0.5 1 0.6l0.2-0.2c0.2 0.1 0.4 0.1 0.6 0.1 0.7 0 1.2-0.5 1.2-1.2 0-0.2-0.1-0.4-0.2-0.6l0.8-0.8c0.2 0.1 0.3 0.1 0.5 0.1 0.4 0 0.8-0.4 0.8-0.8s-0.4-0.8-0.8-0.8c-0.3 0-0.5 0.1-0.6 0.3l-0.8 0.8c-0.1-0.1-0.2-0.2-0.3-0.2 0-0.4-0.4-0.8-0.8-0.8z" fill="#9CA69C"/>
  </svg>
);

// Network operator detection based on Uganda phone prefixes
const detectNetworkOperator = (phone: string): { name: string; color: string; logo: React.ReactNode } | null => {
  // Clean the phone number
  const cleaned = phone.replace(/\D/g, '');
  
  // Get the relevant prefix (after country code)
  let prefix = '';
  if (cleaned.startsWith('256')) {
    prefix = cleaned.slice(3, 5);
  } else if (cleaned.startsWith('0')) {
    prefix = cleaned.slice(1, 3);
  } else if (cleaned.length >= 2) {
    prefix = cleaned.slice(0, 2);
  }
  
  // MTN Uganda prefixes: 77, 78, 76
  if (['77', '78', '76'].includes(prefix)) {
    return {
      name: 'MTN',
      color: '#FFCC00',
      logo: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="10" fill="#FFCC00"/>
          <text x="10" y="14" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#000">MTN</text>
        </svg>
      )
    };
  }
  
  // Airtel Uganda prefixes: 70, 74, 75
  if (['70', '74', '75'].includes(prefix)) {
    return {
      name: 'Airtel',
      color: '#ED1C24',
      logo: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="10" fill="#ED1C24"/>
          <path d="M6 14L10 6L14 14" stroke="white" strokeWidth="2" fill="none"/>
        </svg>
      )
    };
  }
  
  // Uganda Telecom: 71
  if (prefix === '71') {
    return {
      name: 'UTL',
      color: '#00529B',
      logo: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="10" fill="#00529B"/>
          <text x="10" y="13" textAnchor="middle" fontSize="6" fontWeight="bold" fill="white">UTL</text>
        </svg>
      )
    };
  }
  
  return null;
};

export default function Details() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { subtotal, itemCount } = useKioskCart();
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Load saved details from sessionStorage on mount
  const savedDetails = sessionStorage.getItem("kiosk_order_details");
  const initialDetails = savedDetails ? JSON.parse(savedDetails) : null;

  const [name, setName] = useState(initialDetails?.customer_name || "");
  const [phone, setPhone] = useState(initialDetails?.customer_phone || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialDetails?.payment_method || "cash"
  );
  const [specialInstructions, setSpecialInstructions] = useState(
    initialDetails?.special_instructions || ""
  );
  const [nameTouched, setNameTouched] = useState(false);

  // Lookup loyalty points when phone is entered
  const normalizedPhone = phone.trim().length >= 10 ? normalizePhone(phone.trim()) : null;
  const { data: loyaltyData } = useLoyaltyPoints(normalizedPhone);
  const loyaltyTier = loyaltyData ? getLoyaltyTier(loyaltyData.loyalty_points) : null;

  // Calculate points to be earned
  const pointsToEarn = calculatePointsEarned(subtotal);

  // Auto-save details to sessionStorage as user types
  useEffect(() => {
    const details = {
      customer_name: sanitizeText(name),
      customer_phone: phone.trim() ? normalizePhone(phone.trim()) : null,
      customer_location: null,
      payment_method: paymentMethod,
      special_instructions: sanitizeText(specialInstructions) || null,
    };
    sessionStorage.setItem("kiosk_order_details", JSON.stringify(details));
  }, [name, phone, paymentMethod, specialInstructions]);

  // Auto-focus name input on mount (only if empty)
  useEffect(() => {
    if (!name) {
      nameInputRef.current?.focus();
    }
  }, []);

  const needsPhone = paymentMethod === "mobile_money";
  const isNameValid = name.trim().length >= 2;
  const isPhoneValid = !needsPhone || phone.trim().length >= 10;
  const isValid = isNameValid && isPhoneValid;

  // Detect network operator from phone number
  const networkOperator = useMemo(() => detectNetworkOperator(phone), [phone]);

  const handleContinue = () => {
    vibrate();
    if (!isValid) return;

    // Validate and sanitize inputs
    const sanitizedName = sanitizeText(name);
    const sanitizedInstructions = sanitizeText(specialInstructions);
    const formattedPhone = phone.trim() ? normalizePhone(phone.trim()) : null;

    // Store details in sessionStorage for the next step
    sessionStorage.setItem(
      "kiosk_order_details",
      JSON.stringify({
        customer_name: sanitizedName,
        customer_phone: formattedPhone,
        customer_location: null,
        payment_method: paymentMethod,
        special_instructions: sanitizedInstructions || null,
      })
    );

    navigate("/payment");
  };

  return (
    <div className="kiosk-screen flex flex-col bg-white">
      <KioskHeader title="Almost Done!" showBack onBack={() => navigate("/cart")} />

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-8 max-w-lg mx-auto w-full">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Order</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#E6411C] text-white flex items-center justify-center text-sm font-bold">
                2
              </div>
              <span className="text-sm font-bold text-[#212282]">Details</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold">
                3
              </div>
              <span className="text-sm font-medium text-gray-400">Confirm</span>
            </div>
          </div>

          {/* Name Field */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-base font-bold text-[#212282] mb-3">
              <User className="w-5 h-5" />
              What's your name?
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder="Enter your name"
              className={cn(
                "w-full h-16 px-5 text-xl font-medium rounded-2xl border-2 transition-all outline-none",
                "placeholder:text-gray-400",
                nameTouched && !isNameValid
                  ? "border-red-400 bg-red-50 focus:border-red-500"
                  : name.trim().length >= 2
                    ? "border-green-400 bg-green-50/50 focus:border-green-500"
                    : "border-gray-200 bg-gray-50 focus:border-[#212282] focus:bg-white"
              )}
            />
            {nameTouched && !isNameValid && (
              <p className="text-sm text-red-500 mt-2">Please enter at least 2 characters</p>
            )}
          </div>

          {/* Phone Field */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-base font-bold text-[#212282] mb-3">
              <Phone className="w-5 h-5" />
              Phone Number
              {needsPhone && <span className="text-[#E6411C]">*</span>}
            </label>
            <div className={cn(
              "flex items-center h-16 rounded-2xl border-2 transition-all overflow-hidden",
              needsPhone && phone.trim().length > 0 && phone.trim().length < 10
                ? "border-red-400 bg-red-50"
                : phone.trim().length >= 10
                  ? "border-green-400 bg-green-50/50"
                  : "border-gray-200 bg-gray-50 focus-within:border-[#212282] focus-within:bg-white"
            )}>
              {/* Uganda Flag + Country Code */}
              <div className="flex items-center gap-2 px-4 border-r border-gray-200 bg-gray-100 h-full shrink-0">
                <UgandaFlag />
                <span className="text-base font-medium text-gray-600">+256</span>
              </div>
              
              {/* Phone Input */}
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="7XX XXX XXX"
                className="flex-1 h-full px-4 text-xl font-medium bg-transparent outline-none placeholder:text-gray-400"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
              {needsPhone ? "Required for Mobile Money payment" : "We'll notify you when ready (optional)"}
              {networkOperator && (
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `${networkOperator.color}20`, color: networkOperator.color }}
                >
                  {networkOperator.name}
                </span>
              )}
            </p>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-base font-bold text-[#212282] mb-3">
              How will you pay?
            </label>
            <PaymentMethodSelector
              selected={paymentMethod}
              onChange={setPaymentMethod}
            />
          </div>

          {/* Loyalty Points Display */}
          {loyaltyData && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: loyaltyTier?.color + '20' }}
                >
                  <Gift className="w-6 h-6" style={{ color: loyaltyTier?.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#212282]">
                      {formatPoints(loyaltyData.loyalty_points)} points
                    </span>
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: loyaltyTier?.color + '20', color: loyaltyTier?.color }}
                    >
                      {loyaltyTier?.name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Earn <span className="font-semibold text-green-600">+{pointsToEarn} points</span> with this order!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div className="mb-6">
            <label className="block text-base font-bold text-[#212282] mb-3">
              Special Requests
              <span className="text-sm font-normal text-gray-400 ml-2">(optional)</span>
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="E.g., extra spicy, no onions, allergies..."
              rows={2}
              className="w-full p-4 text-base border-2 border-gray-200 rounded-2xl resize-none bg-gray-50 focus:border-[#212282] focus:bg-white outline-none transition-all placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-gray-500 text-sm">{itemCount} items</span>
            <p className="text-lg font-bold text-[#212282]">Total</p>
          </div>
          <span className="text-3xl font-bold text-[#E6411C]">{formatPrice(subtotal)}</span>
        </div>
        <Button
          size="touch"
          className="w-full bg-[#E6411C] hover:bg-[#d13a18] text-white font-bold h-16 text-lg rounded-2xl"
          disabled={!isValid}
          onClick={handleContinue}
        >
          Review & Place Order
          <ArrowRight className="w-6 h-6 ml-2" />
        </Button>
      </div>
    </div>
  );
}
