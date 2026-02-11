import { z } from 'zod';

/**
 * Validation schemas for 9Yards Kiosk
 * Using Zod for runtime type validation
 */

// Ugandan phone number regex: 07XX or 256XXX 
const ugandaPhoneRegex = /^(0[7][0-9]{8}|256[7][0-9]{8})$/;

export const phoneSchema = z
  .string()
  .transform((val) => val.replace(/[\s\-\(\)]/g, '')) // Remove spaces, dashes, parens
  .refine(
    (val) => val === '' || ugandaPhoneRegex.test(val),
    { message: 'Please enter a valid Ugandan phone number (e.g., 0771234567)' }
  );

export const requiredPhoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .transform((val) => val.replace(/[\s\-\(\)]/g, ''))
  .refine(
    (val) => ugandaPhoneRegex.test(val),
    { message: 'Please enter a valid Ugandan phone number (e.g., 0771234567)' }
  );

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .transform((val) => val.trim());

export const locationSchema = z
  .string()
  .max(200, 'Location is too long')
  .optional()
  .transform((val) => val?.trim() || '');

export const specialInstructionsSchema = z
  .string()
  .max(500, 'Instructions are too long')
  .optional()
  .transform((val) => val?.trim() || '');

export const paymentMethodSchema = z.enum(['pay_at_counter', 'cash', 'mobile_money']);

export const orderDetailsSchema = z.object({
  name: nameSchema,
  phone: phoneSchema.optional(),
  location: locationSchema,
  specialInstructions: specialInstructionsSchema,
  paymentMethod: paymentMethodSchema,
});

export type OrderDetailsInput = z.input<typeof orderDetailsSchema>;
export type OrderDetailsOutput = z.output<typeof orderDetailsSchema>;

// Menu item validation (for dashboard editing)
export const menuItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  price: z.number().int().min(0, 'Price must be positive'),
  categoryId: z.string().uuid(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  available: z.boolean(),
  sortOrder: z.number().int().min(0),
  availableFrom: z.string().optional().nullable(), // TIME string
  availableUntil: z.string().optional().nullable(),
  isPopular: z.boolean().optional(),
  isNew: z.boolean().optional(),
});

export type MenuItemInput = z.input<typeof menuItemSchema>;

// PIN validation (for dashboard login)
export const pinSchema = z
  .string()
  .length(4, 'PIN must be 4 digits')
  .regex(/^\d{4}$/, 'PIN must be 4 digits');

// Helper to format phone for display
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('256')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  if (cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

// Helper to normalize phone to 256 format for API
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    return `256${cleaned.slice(1)}`;
  }
  return cleaned;
}

// Detect mobile money network from phone
export function detectNetwork(phone: string): 'MTN' | 'Airtel' | null {
  const cleaned = phone.replace(/\D/g, '');
  // MTN: 077, 078 (or 25677, 25678)
  if (/^(0|256)7[78]/.test(cleaned)) return 'MTN';
  // Airtel: 070, 075 (or 25670, 25675)
  if (/^(0|256)7[05]/.test(cleaned)) return 'Airtel';
  return null;
}
