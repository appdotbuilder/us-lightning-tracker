
import { db } from '../db';
import { userLocationsTable, lightningStrikesTable } from '../db/schema';
import { type GetNearbyStrikesInput, type LightningStrikeWithDistance } from '../schema';
import { eq, and, gte, sql } from 'drizzle-orm';

export async function getNearbyStrikes(input: GetNearbyStrikesInput): Promise<LightningStrikeWithDistance[]> {
  try {
    // Get the user's active location
    const userLocations = await db.select()
      .from(userLocationsTable)
      .where(and(
        eq(userLocationsTable.user_id, input.user_id),
        eq(userLocationsTable.is_active, true)
      ))
      .execute();

    if (userLocations.length === 0) {
      return [];
    }

    const userLocation = userLocations[0];
    const userLat = parseFloat(userLocation.latitude);
    const userLon = parseFloat(userLocation.longitude);

    // Calculate time threshold
    const timeThreshold = new Date();
    timeThreshold.setHours(timeThreshold.getHours() - input.hours_back);

    // Query lightning strikes with distance calculation using Haversine formula
    // Use a subquery approach to properly filter by calculated distance
    const results = await db.execute(sql`
      SELECT 
        id,
        latitude,
        longitude,
        timestamp,
        intensity,
        created_at,
        distance_miles
      FROM (
        SELECT 
          ${lightningStrikesTable.id} as id,
          ${lightningStrikesTable.latitude} as latitude,
          ${lightningStrikesTable.longitude} as longitude,
          ${lightningStrikesTable.timestamp} as timestamp,
          ${lightningStrikesTable.intensity} as intensity,
          ${lightningStrikesTable.created_at} as created_at,
          3959 * acos(
            cos(radians(${userLat})) * 
            cos(radians(${lightningStrikesTable.latitude})) * 
            cos(radians(${lightningStrikesTable.longitude}) - radians(${userLon})) + 
            sin(radians(${userLat})) * 
            sin(radians(${lightningStrikesTable.latitude}))
          ) as distance_miles
        FROM ${lightningStrikesTable}
        WHERE ${lightningStrikesTable.timestamp} >= ${timeThreshold}
      ) strikes_with_distance
      WHERE distance_miles <= ${input.radius_miles}
      ORDER BY timestamp DESC
    `);

    // Convert numeric fields and ensure proper types
    return results.rows.map((row: any) => ({
      id: row.id,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      timestamp: new Date(row.timestamp), // Convert string to Date
      intensity: parseFloat(row.intensity),
      distance_miles: parseFloat(row.distance_miles),
      created_at: new Date(row.created_at) // Convert string to Date
    }));
  } catch (error) {
    console.error('Get nearby strikes failed:', error);
    throw error;
  }
}
