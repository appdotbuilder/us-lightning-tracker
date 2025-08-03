
import { db } from '../db';
import { userLocationsTable, notificationsTable } from '../db/schema';
import { type LightningStrike, type Notification } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function processLightningNotifications(strike: LightningStrike): Promise<Notification[]> {
  try {
    // Find all active user locations within 20 miles of the strike using Haversine formula
    // Use a subquery to properly filter by calculated distance
    const queryResult = await db.execute(sql`
      SELECT 
        user_id,
        latitude,
        longitude,
        distance_miles
      FROM (
        SELECT 
          user_id,
          latitude,
          longitude,
          (3959 * acos(cos(radians(${strike.latitude})) * cos(radians(latitude)) 
          * cos(radians(longitude) - radians(${strike.longitude})) 
          + sin(radians(${strike.latitude})) * sin(radians(latitude)))) as distance_miles
        FROM ${userLocationsTable}
        WHERE is_active = true
      ) nearby_users
      WHERE distance_miles <= 20
    `);

    const nearbyUsers = queryResult.rows;

    // Create notification records for each nearby user
    const notificationPromises = nearbyUsers.map(async (user: any) => {
      const result = await db.insert(notificationsTable)
        .values({
          user_id: user.user_id,
          lightning_strike_id: strike.id,
          distance_miles: user.distance_miles.toString(), // Convert to string for numeric column
          email_sent: false,
          email_sent_at: null
        })
        .returning()
        .execute();

      // Convert numeric fields back to numbers
      const notification = result[0];
      return {
        ...notification,
        distance_miles: parseFloat(notification.distance_miles)
      };
    });

    const notifications = await Promise.all(notificationPromises);
    return notifications;

  } catch (error) {
    console.error('Lightning notification processing failed:', error);
    throw error;
  }
}
