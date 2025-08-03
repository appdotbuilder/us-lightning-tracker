
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { userLocationsTable, lightningStrikesTable, notificationsTable } from '../db/schema';
import { type CreateUserLocationInput, type CreateLightningStrikeInput } from '../schema';
import { sendEmailNotification } from '../handlers/send_email_notification';
import { eq } from 'drizzle-orm';

describe('sendEmailNotification', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should send email notification successfully', async () => {
    // Create test user location
    const userLocationResult = await db.insert(userLocationsTable)
      .values({
        user_id: 'test-user-123',
        zip_code: '12345',
        latitude: '40.7128',
        longitude: '-74.0060',
        city: 'New York',
        state: 'NY'
      })
      .returning()
      .execute();

    // Create test lightning strike
    const strikeResult = await db.insert(lightningStrikesTable)
      .values({
        latitude: '40.7580',
        longitude: '-73.9855',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        intensity: '85.5'
      })
      .returning()
      .execute();

    // Create test notification
    const notificationResult = await db.insert(notificationsTable)
      .values({
        user_id: 'test-user-123',
        lightning_strike_id: strikeResult[0].id,
        distance_miles: '15.2',
        email_sent: false
      })
      .returning()
      .execute();

    const notification = {
      ...notificationResult[0],
      distance_miles: parseFloat(notificationResult[0].distance_miles),
      email_sent_at: notificationResult[0].email_sent_at
    };

    // Send email notification
    const result = await sendEmailNotification(notification);

    expect(result).toBe(true);

    // Verify notification was updated in database
    const updatedNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notification.id))
      .execute();

    expect(updatedNotifications).toHaveLength(1);
    expect(updatedNotifications[0].email_sent).toBe(true);
    expect(updatedNotifications[0].email_sent_at).toBeInstanceOf(Date);
  });

  it('should return false when lightning strike not found', async () => {
    // Create test user location
    await db.insert(userLocationsTable)
      .values({
        user_id: 'test-user-123',
        zip_code: '12345',
        latitude: '40.7128',
        longitude: '-74.0060',
        city: 'New York',
        state: 'NY'
      })
      .execute();

    // Create notification with non-existent lightning strike
    const notificationResult = await db.insert(notificationsTable)
      .values({
        user_id: 'test-user-123',
        lightning_strike_id: 99999, // Non-existent ID
        distance_miles: '15.2',
        email_sent: false
      })
      .returning()
      .execute();

    const notification = {
      ...notificationResult[0],
      distance_miles: parseFloat(notificationResult[0].distance_miles),
      email_sent_at: notificationResult[0].email_sent_at
    };

    const result = await sendEmailNotification(notification);

    expect(result).toBe(false);

    // Verify notification was not updated
    const updatedNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notification.id))
      .execute();

    expect(updatedNotifications[0].email_sent).toBe(false);
    expect(updatedNotifications[0].email_sent_at).toBeNull();
  });

  it('should return false when user location not found', async () => {
    // Create test lightning strike
    const strikeResult = await db.insert(lightningStrikesTable)
      .values({
        latitude: '40.7580',
        longitude: '-73.9855',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        intensity: '85.5'
      })
      .returning()
      .execute();

    // Create notification with non-existent user
    const notificationResult = await db.insert(notificationsTable)
      .values({
        user_id: 'non-existent-user',
        lightning_strike_id: strikeResult[0].id,
        distance_miles: '15.2',
        email_sent: false
      })
      .returning()
      .execute();

    const notification = {
      ...notificationResult[0],
      distance_miles: parseFloat(notificationResult[0].distance_miles),
      email_sent_at: notificationResult[0].email_sent_at
    };

    const result = await sendEmailNotification(notification);

    expect(result).toBe(false);

    // Verify notification was not updated
    const updatedNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notification.id))
      .execute();

    expect(updatedNotifications[0].email_sent).toBe(false);
    expect(updatedNotifications[0].email_sent_at).toBeNull();
  });

  it('should handle email service failure', async () => {
    // Create test user location with special user ID that triggers failure
    await db.insert(userLocationsTable)
      .values({
        user_id: 'fail-user',
        zip_code: '12345',
        latitude: '40.7128',
        longitude: '-74.0060',
        city: 'New York',
        state: 'NY'
      })
      .execute();

    // Create test lightning strike
    const strikeResult = await db.insert(lightningStrikesTable)
      .values({
        latitude: '40.7580',
        longitude: '-73.9855',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        intensity: '85.5'
      })
      .returning()
      .execute();

    // Create test notification
    const notificationResult = await db.insert(notificationsTable)
      .values({
        user_id: 'fail-user',
        lightning_strike_id: strikeResult[0].id,
        distance_miles: '15.2',
        email_sent: false
      })
      .returning()
      .execute();

    const notification = {
      ...notificationResult[0],
      distance_miles: parseFloat(notificationResult[0].distance_miles),
      email_sent_at: notificationResult[0].email_sent_at
    };

    const result = await sendEmailNotification(notification);

    expect(result).toBe(false);

    // Verify notification was not updated when email fails
    const updatedNotifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notification.id))
      .execute();

    expect(updatedNotifications[0].email_sent).toBe(false);
    expect(updatedNotifications[0].email_sent_at).toBeNull();
  });
});
