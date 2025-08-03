
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notificationsTable, lightningStrikesTable } from '../db/schema';
import { type GetUserLocationInput } from '../schema';
import { getUserNotifications } from '../handlers/get_user_notifications';

// Test input
const testInput: GetUserLocationInput = {
  user_id: 'user123'
};

describe('getUserNotifications', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no notifications', async () => {
    const result = await getUserNotifications(testInput);
    
    expect(result).toEqual([]);
  });

  it('should return user notifications with proper data types', async () => {
    // Create a lightning strike first
    const strikeResult = await db.insert(lightningStrikesTable)
      .values({
        latitude: '40.7128',
        longitude: '-74.0060',
        timestamp: new Date(),
        intensity: '85.50'
      })
      .returning()
      .execute();

    const strikeId = strikeResult[0].id;

    // Create notifications for the user
    await db.insert(notificationsTable)
      .values([
        {
          user_id: 'user123',
          lightning_strike_id: strikeId,
          distance_miles: '5.25',
          email_sent: true,
          email_sent_at: new Date()
        },
        {
          user_id: 'user123',
          lightning_strike_id: strikeId,
          distance_miles: '12.75',
          email_sent: false,
          email_sent_at: null
        }
      ])
      .execute();

    const result = await getUserNotifications(testInput);

    expect(result).toHaveLength(2);
    
    // Verify first notification (most recent due to ordering)
    const firstNotification = result[0];
    expect(firstNotification.user_id).toEqual('user123');
    expect(firstNotification.lightning_strike_id).toEqual(strikeId);
    expect(typeof firstNotification.distance_miles).toEqual('number');
    expect(firstNotification.distance_miles).toEqual(12.75);
    expect(firstNotification.email_sent).toEqual(false);
    expect(firstNotification.email_sent_at).toBeNull();
    expect(firstNotification.id).toBeDefined();
    expect(firstNotification.created_at).toBeInstanceOf(Date);

    // Verify second notification
    const secondNotification = result[1];
    expect(secondNotification.distance_miles).toEqual(5.25);
    expect(secondNotification.email_sent).toEqual(true);
    expect(secondNotification.email_sent_at).toBeInstanceOf(Date);
  });

  it('should only return notifications for specified user', async () => {
    // Create a lightning strike
    const strikeResult = await db.insert(lightningStrikesTable)
      .values({
        latitude: '40.7128',
        longitude: '-74.0060',
        timestamp: new Date(),
        intensity: '85.50'
      })
      .returning()
      .execute();

    const strikeId = strikeResult[0].id;

    // Create notifications for different users
    await db.insert(notificationsTable)
      .values([
        {
          user_id: 'user123',
          lightning_strike_id: strikeId,
          distance_miles: '5.25',
          email_sent: true,
          email_sent_at: new Date()
        },
        {
          user_id: 'user456',
          lightning_strike_id: strikeId,
          distance_miles: '10.50',
          email_sent: false,
          email_sent_at: null
        }
      ])
      .execute();

    const result = await getUserNotifications(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual('user123');
  });

  it('should order notifications by created_at descending', async () => {
    // Create a lightning strike
    const strikeResult = await db.insert(lightningStrikesTable)
      .values({
        latitude: '40.7128',
        longitude: '-74.0060',
        timestamp: new Date(),
        intensity: '85.50'
      })
      .returning()
      .execute();

    const strikeId = strikeResult[0].id;

    // Create notifications with different timestamps
    const olderDate = new Date('2024-01-01T10:00:00Z');
    const newerDate = new Date('2024-01-02T10:00:00Z');

    // Insert older notification first
    await db.execute(`
      INSERT INTO notifications (user_id, lightning_strike_id, distance_miles, email_sent, created_at)
      VALUES ('user123', ${strikeId}, '5.25', true, '${olderDate.toISOString()}')
    `);

    // Insert newer notification second
    await db.execute(`
      INSERT INTO notifications (user_id, lightning_strike_id, distance_miles, email_sent, created_at)
      VALUES ('user123', ${strikeId}, '10.50', false, '${newerDate.toISOString()}')
    `);

    const result = await getUserNotifications(testInput);

    expect(result).toHaveLength(2);
    // First result should be the newer notification due to DESC ordering
    expect(result[0].distance_miles).toEqual(10.5);
    expect(result[1].distance_miles).toEqual(5.25);
    
    // Verify ordering by checking timestamps
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
  });
});
