
import { serial, text, pgTable, timestamp, numeric, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userLocationsTable = pgTable('user_locations', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull(),
  zip_code: text('zip_code').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

export const lightningStrikesTable = pgTable('lightning_strikes', {
  id: serial('id').primaryKey(),
  latitude: numeric('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  intensity: numeric('intensity', { precision: 8, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const notificationsTable = pgTable('notifications', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull(),
  lightning_strike_id: integer('lightning_strike_id').notNull(),
  distance_miles: numeric('distance_miles', { precision: 8, scale: 2 }).notNull(),
  email_sent: boolean('email_sent').default(false).notNull(),
  email_sent_at: timestamp('email_sent_at'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const userLocationsRelations = relations(userLocationsTable, ({ many }) => ({
  notifications: many(notificationsTable),
}));

export const lightningStrikesRelations = relations(lightningStrikesTable, ({ many }) => ({
  notifications: many(notificationsTable),
}));

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  userLocation: one(userLocationsTable, {
    fields: [notificationsTable.user_id],
    references: [userLocationsTable.user_id],
  }),
  lightningStrike: one(lightningStrikesTable, {
    fields: [notificationsTable.lightning_strike_id],
    references: [lightningStrikesTable.id],
  }),
}));

// TypeScript types for the table schemas
export type UserLocation = typeof userLocationsTable.$inferSelect;
export type NewUserLocation = typeof userLocationsTable.$inferInsert;
export type LightningStrike = typeof lightningStrikesTable.$inferSelect;
export type NewLightningStrike = typeof lightningStrikesTable.$inferInsert;
export type Notification = typeof notificationsTable.$inferSelect;
export type NewNotification = typeof notificationsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  userLocations: userLocationsTable,
  lightningStrikes: lightningStrikesTable,
  notifications: notificationsTable
};
