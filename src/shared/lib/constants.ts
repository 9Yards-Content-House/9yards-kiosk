// 9Yards Kiosk — Business Constants

// Contact
export const WHATSAPP_NUMBER = "256708899597";
export const PHONE_NUMBER = "+256708899597";
export const EMAIL = "deliveries@9yards.co.ug";

// Business Hours
export const BUSINESS_HOURS = {
  open: "10:00 AM",
  close: "10:00 PM",
  days: "Monday - Sunday",
};

// Kiosk Settings
export const KIOSK = {
  /** Inactivity timeout in milliseconds before auto-reset (90 seconds) */
  INACTIVITY_TIMEOUT_MS: 90_000,
  /** Order number prefix */
  ORDER_PREFIX: "9Y",
  /** Source identifier for orders placed from the kiosk */
  ORDER_SOURCE: "kiosk" as const,
};

// Order Time Thresholds (in milliseconds)
export const TIME_THRESHOLDS = {
  /** Order is urgent if older than this (10 minutes) */
  URGENT_ORDER_MS: 10 * 60 * 1000,
  /** Customer waiting too long at reception (15 minutes) */
  WAITING_TOO_LONG_MS: 15 * 60 * 1000,
  /** New order notification toast duration */
  NEW_ORDER_TOAST_MS: 10_000,
};

// Kitchen location (Kigo)
export const KITCHEN_LOCATION = {
  lat: 0.2,
  lon: 32.5835,
  name: "Kigo",
};

// Currency
export const CURRENCY = "UGX";

// App URLs
export const APP_URLS = {
  mainSite: "https://food.9yards.co.ug",
  kiosk: "https://kiosk.9yards.co.ug",
  dashboard: "https://kitchen.9yards.co.ug",
};
