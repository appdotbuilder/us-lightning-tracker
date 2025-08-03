
import { db } from '../db';
import { lightningStrikesTable, userLocationsTable, notificationsTable } from '../db/schema';
import { type CreateLightningStrikeInput, type LightningStrike } from '../schema';
import { sql } from 'drizzle-orm';

export async function createLightningStrike(input: CreateLightningStrikeInput): Promise<LightningStrike> {
  try {
    // Validate geographic coordinates are within US bounds
    if (input.latitude < 24.396308 || input.latitude > 49.384358 || 
        input.longitude < -125.0 || input.longitude > -66.93457) {
      throw new Error('Lightning strike coordinates must be within US bounds');
    }

    // Create and persist the lightning strike record
    const result = await db.insert(lightningStrikesTable)
      .values({
        latitude: input.latitude.toString(),
        longitude: input.longitude.toString(),
        timestamp: input.timestamp,
        intensity: input.intensity.toString()
      })
      .returning()
      .execute();

    const lightningStrike = result[0];

    // Find nearby active users within 20 miles and create notifications
    // Using a subquery to calculate distance with Haversine formula
    const nearbyUsersResult = await db.execute(sql`
      SELECT user_id, calculated_distance AS distance_miles
      FROM (
        SELECT user_id, 
               (3959 * acos(
                 cos(radians(${input.latitude})) * 
                 cos(radians(CAST(latitude AS FLOAT))) * 
                 cos(radians(CAST(longitude AS FLOAT)) - radians(${input.longitude})) + 
                 sin(radians(${input.latitude})) * 
                 sin(radians(CAST(latitude AS FLOAT)))
               )) AS calculated_distance
        FROM user_locations 
        WHERE is_active = true
      ) AS distances
      WHERE calculated_distance <= 20
      ORDER BY calculated_distance
    `);

    const nearbyUsers = nearbyUsersResult.rows || [];

    // Create notification records for nearby users
    if (nearbyUsers.length > 0) {
      const notificationValues = nearbyUsers.map((user: any) => ({
        user_id: user.user_id,
        lightning_strike_id: lightningStrike.id,
        distance_miles: parseFloat(user.distance_miles).toString(),
        email_sent: false
      }));

      await db.insert(notificationsTable)
        .values(notificationValues)
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...lightningStrike,
      latitude: parseFloat(lightningStrike.latitude),
      longitude: parseFloat(lightningStrike.longitude),
      intensity: parseFloat(lightningStrike.intensity)
    };
  } catch (error) {
    console.error('Lightning strike creation failed:', error);
    throw error;
  }
}
