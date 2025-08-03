
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { userLocationsTable, lightningStrikesTable, notificationsTable } from '../db/schema';
import { type LightningStrike } from '../schema';
import { processLightningNotifications } from '../handlers/process_lightning_notifications';
import { eq } from 'drizzle-orm';

describe('processLightningNotifications', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create notifications for users within 20 miles', async () => {
    // Create test user locations (active users near Denver, CO area)
    const nearbyUser = await db.insert(userLocationsTable)
      .values({
        user_id: 'user1',
        zip_code: '80202',
        latitude: '39.7392358', // Denver downtown
        longitude: '-104.9902563',
        city: 'Denver',
        state: 'CO',
        is_active: true
      })
      .returning()
      .execute();

    const farUser = await db.insert(userLocationsTable)
      .values({
        user_id: 'user2',
        zip_code: '10001',
        latitude: '40.7505045', // NYC - definitely more than 20 miles from Denver
        longitude: '-73.9934387',
        city: 'New York',
        state: 'NY',
        is_active: true
      })
      .returning()
      .execute();

    const inactiveUser = await db.insert(userLocationsTable)
      .values({
        user_id: 'user3',
        zip_code: '80203',
        latitude: '39.7391536', // Also Denver area but inactive
        longitude: '-104.9847034',
        city: 'Denver',
        state: 'CO',
        is_active: false
      })
      .returning()
      .execute();

    // Create a lightning strike near Denver
    const strikeResult = await db.insert(lightningStrikesTable)
      .values({
        latitude: '39.7392358', // Same as Denver downtown
        longitude: '-104.9902563',
        timestamp: new Date(),
        intensity: '5.5'
      })
      .returning()
      .execute();

    const strike: LightningStrike = {
      ...strikeResult[0],
      latitude: parseFloat(strikeResult[0].latitude),
      longitude: parseFloat(strikeResult[0].longitude),
      intensity: parseFloat(strikeResult[0].intensity)
    };

    // Process notifications
    const notifications = await processLightningNotifications(strike);

    // Should only create notification for the nearby active user
    expect(notifications).toHaveLength(1);
    expect(notifications[0].user_id).toBe('user1');
    expect(notifications[0].lightning_strike_id).toBe(strike.id);
    expect(notifications[0].distance_miles).toBeLessThan(1); // Very close to strike location
    expect(notifications[0].email_sent).toBe(false);
    expect(notifications[0].email_sent_at).toBeNull();
    expect(notifications[0].created_at).toBeInstanceOf(Date);
  });

  it('should save notifications to database', async () => {
    // Create test user location
    await db.insert(userLocationsTable)
      .values({
        user_id: 'test_user',
        zip_code: '80202',
        latitude: '39.7392358',
        longitude: '-104.9902563',
        city: 'Denver',
        state: 'CO',
        is_active: true
      })
      .execute();

    // Create lightning strike
    const strikeResult = await db.insert(lightningStrikesTable)
      .values({
        latitude: '39.7392358',
        longitude: '-104.9902563',
        timestamp: new Date(),
        intensity: '5.5'
      })
      .returning()
      .execute();

    const strike: LightningStrike = {
      ...strikeResult[0],
      latitude: parseFloat(strikeResult[0].latitude),
      longitude: parseFloat(strikeResult[0].longitude),
      intensity: parseFloat(strikeResult[0].intensity)
    };

    // Process notifications
    const notifications = await processLightningNotifications(strike);

    // Verify notification was saved to database
    const dbNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notifications[0].id))
      .execute();

    expect(dbNotifications).toHaveLength(1);
    expect(dbNotifications[0].user_id).toBe('test_user');
    expect(dbNotifications[0].lightning_strike_id).toBe(strike.id);
    expect(parseFloat(dbNotifications[0].distance_miles)).toBeLessThan(1);
    expect(dbNotifications[0].email_sent).toBe(false);
  });

  it('should handle no nearby users', async () => {
    // Create lightning strike with no nearby users
    const strikeResult = await db.insert(lightningStrikesTable)
      .values({
        latitude: '39.7392358',
        longitude: '-104.9902563',
        timestamp: new Date(),
        intensity: '5.5'
      })
      .returning()
      .execute();

    const strike: LightningStrike = {
      ...strikeResult[0],
      latitude: parseFloat(strikeResult[0].latitude),
      longitude: parseFloat(strikeResult[0].longitude),
      intensity: parseFloat(strikeResult[0].intensity)
    };

    // Process notifications
    const notifications = await processLightningNotifications(strike);

    // Should return empty array
    expect(notifications).toHaveLength(0);
  });

  it('should calculate accurate distances', async () => {
    // Create user location about 10 miles from strike location
    await db.insert(userLocationsTable)
      .values({
        user_id: 'distance_test',
        zip_code: '80014',
        latitude: '39.6403312', // Aurora, CO - approximately 10 miles from Denver downtown
        longitude: '-104.8197327',
        city: 'Aurora',
        state: 'CO',
        is_active: true
      })
      .execute();

    // Create lightning strike in Denver downtown
    const strikeResult = await db.insert(lightningStrikesTable)
      .values({
        latitude: '39.7392358',
        longitude: '-104.9902563',
        timestamp: new Date(),
        intensity: '5.5'
      })
      .returning()
      .execute();

    const strike: LightningStrike = {
      ...strikeResult[0],
      latitude: parseFloat(strikeResult[0].latitude),
      longitude: parseFloat(strikeResult[0].longitude),
      intensity: parseFloat(strikeResult[0].intensity)
    };

    // Process notifications
    const notifications = await processLightningNotifications(strike);

    // Should create notification with reasonable distance
    expect(notifications).toHaveLength(1);
    expect(notifications[0].distance_miles).toBeGreaterThan(8);
    expect(notifications[0].distance_miles).toBeLessThan(15);
    expect(typeof notifications[0].distance_miles).toBe('number');
  });
});
