
import { z } from 'zod';

// User location schema
export const userLocationSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  zip_code: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  city: z.string(),
  state: z.string(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type UserLocation = z.infer<typeof userLocationSchema>;

// Lightning strike schema
export const lightningStrikeSchema = z.object({
  id: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.coerce.date(),
  intensity: z.number(), // Lightning intensity/strength
  created_at: z.coerce.date()
});

export type LightningStrike = z.infer<typeof lightningStrikeSchema>;

// Notification schema
export const notificationSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  lightning_strike_id: z.number(),
  distance_miles: z.number(),
  email_sent: z.boolean(),
  email_sent_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type Notification = z.infer<typeof notificationSchema>;

// Input schemas
export const createUserLocationInputSchema = z.object({
  user_id: z.string(),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format"),
  latitude: z.number().optional(), // Optional if auto-detected
  longitude: z.number().optional(), // Optional if auto-detected
  city: z.string().optional(),
  state: z.string().optional()
});

export type CreateUserLocationInput = z.infer<typeof createUserLocationInputSchema>;

export const updateUserLocationInputSchema = z.object({
  id: z.number(),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format").optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserLocationInput = z.infer<typeof updateUserLocationInputSchema>;

export const createLightningStrikeInputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timestamp: z.coerce.date(),
  intensity: z.number().positive()
});

export type CreateLightningStrikeInput = z.infer<typeof createLightningStrikeInputSchema>;

export const getUserLocationInputSchema = z.object({
  user_id: z.string()
});

export type GetUserLocationInput = z.infer<typeof getUserLocationInputSchema>;

export const getNearbyStrikesInputSchema = z.object({
  user_id: z.string(),
  radius_miles: z.number().default(20),
  hours_back: z.number().default(24)
});

export type GetNearbyStrikesInput = z.infer<typeof getNearbyStrikesInputSchema>;

export const zipCodeLookupInputSchema = z.object({
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format")
});

export type ZipCodeLookupInput = z.infer<typeof zipCodeLookupInputSchema>;

// Response schemas
export const zipCodeLookupResponseSchema = z.object({
  zip_code: z.string(),
  city: z.string(),
  state: z.string(),
  latitude: z.number(),
  longitude: z.number()
});

export type ZipCodeLookupResponse = z.infer<typeof zipCodeLookupResponseSchema>;

export const lightningStrikeWithDistanceSchema = z.object({
  id: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.coerce.date(),
  intensity: z.number(),
  distance_miles: z.number(),
  created_at: z.coerce.date()
});

export type LightningStrikeWithDistance = z.infer<typeof lightningStrikeWithDistanceSchema>;
