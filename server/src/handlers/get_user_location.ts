
import { db } from '../db';
import { userLocationsTable } from '../db/schema';
import { type GetUserLocationInput, type UserLocation } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getUserLocation(input: GetUserLocationInput): Promise<UserLocation | null> {
  try {
    // Query for the user's active location
    const results = await db.select()
      .from(userLocationsTable)
      .where(
        and(
          eq(userLocationsTable.user_id, input.user_id),
          eq(userLocationsTable.is_active, true)
        )
      )
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers
    const location = results[0];
    return {
      ...location,
      latitude: parseFloat(location.latitude),
      longitude: parseFloat(location.longitude)
    };
  } catch (error) {
    console.error('Get user location failed:', error);
    throw error;
  }
}
