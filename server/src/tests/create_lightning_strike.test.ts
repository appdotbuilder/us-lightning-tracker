
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { lightningStrikesTable, userLocationsTable, notificationsTable } from '../db/schema';
import { type CreateLightningStrikeInput } from '../schema';
import { createLightningStrike } from '../handlers/create_lightning_strike';
import { eq } from 'drizzle-orm';

// Valid US coordinates (Chicago area)
const testInput: CreateLightningStrikeInput = {
  latitude: 41.8781,
  longitude: -87.6298,
  timestamp: new Date('2024-01-15T10:30:00Z'),
  intensity: 5.5
};

describe('createLightningStrike', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a lightning strike', async () => {
    const result = await createLightningStrike(testInput);

    expect(result.latitude).toEqual(41.8781);
    expect(result.longitude).toEqual(-87.6298);
    expect(result.timestamp).toEqual(new Date('2024-01-15T10:30:00Z'));
    expect(result.intensity).toEqual(5.5);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(typeof result.latitude).toBe('number');
    expect(typeof result.longitude).toBe('number');
    expect(typeof result.intensity).toBe('number');
  });

  it('should save lightning strike to database', async () => {
    const result = await createLightningStrike(testInput);

    const strikes = await db.select()
      .from(lightningStrikesTable)
      .where(eq(lightningStrikesTable.id, result.id))
      .execute();

    expect(strikes).toHaveLength(1);
    expect(parseFloat(strikes[0].latitude)).toEqual(41.8781);
    expect(parseFloat(strikes[0].longitude)).toEqual(-87.6298);
    expect(strikes[0].timestamp).toEqual(new Date('2024-01-15T10:30:00Z'));
    expect(parseFloat(strikes[0].intensity)).toEqual(5.5);
    expect(strikes[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject coordinates outside US bounds', async () => {
    const invalidInput = {
      ...testInput,
      latitude: 60.0, // Too far north
      longitude: -87.6298
    };

    await expect(createLightningStrike(invalidInput)).rejects.toThrow(/US bounds/i);
  });

  it('should reject longitude outside US bounds', async () => {
    const invalidInput = {
      ...testInput,
      latitude: 41.8781,
      longitude: -130.0 // Too far west
    };

    await expect(createLightningStrike(invalidInput)).rejects.toThrow(/US bounds/i);
  });

  it('should create notifications for nearby users', async () => {
    // Create a nearby active user location (within 20 miles of Chicago)
    await db.insert(userLocationsTable)
      .values({
        user_id: 'user123',
        zip_code: '60601',
        latitude: '41.8825', // About 0.3 miles from test strike
        longitude: '-87.6231',
        city: 'Chicago',
        state: 'IL',
        is_active: true
      })
      .execute();

    const result = await createLightningStrike(testInput);

    // Check that notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.lightning_strike_id, result.id))
      .execute();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].user_id).toEqual('user123');
    expect(notifications[0].lightning_strike_id).toEqual(result.id);
    expect(parseFloat(notifications[0].distance_miles)).toBeLessThan(1);
    expect(notifications[0].email_sent).toBe(false);
  });

  it('should not create notifications for inactive users', async () => {
    // Create an inactive user location
    await db.insert(userLocationsTable)
      .values({
        user_id: 'inactive_user',
        zip_code: '60601',
        latitude: '41.8825',
        longitude: '-87.6231',
        city: 'Chicago',
        state: 'IL',
        is_active: false
      })
      .execute();

    const result = await createLightningStrike(testInput);

    // Check that no notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.lightning_strike_id, result.id))
      .execute();

    expect(notifications).toHaveLength(0);
  });

  it('should not create notifications for users too far away', async () => {
    // Create a user location more than 20 miles away (Los Angeles)
    await db.insert(userLocationsTable)
      .values({
        user_id: 'far_user',
        zip_code: '90210',
        latitude: '34.0522',  // Los Angeles - about 1700+ miles from Chicago
        longitude: '-118.2437',
        city: 'Los Angeles',
        state: 'CA',
        is_active: true
      })
      .execute();

    const result = await createLightningStrike(testInput);

    // Check that no notification was created
    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.lightning_strike_id, result.id))
      .execute();

    expect(notifications).toHaveLength(0);
  });
});
