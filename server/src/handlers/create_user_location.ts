
import { db } from '../db';
import { userLocationsTable } from '../db/schema';
import { type CreateUserLocationInput, type UserLocation } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createUserLocation(input: CreateUserLocationInput): Promise<UserLocation> {
  try {
    // If coordinates are not provided, we need to look them up
    // For now, using placeholder coordinates - in a real app, this would call a geocoding service
    const latitude = input.latitude ?? 40.7128; // Default to NYC coordinates
    const longitude = input.longitude ?? -74.0060;
    const city = input.city ?? "Unknown City";
    const state = input.state ?? "Unknown State";

    // First, deactivate any existing active locations for this user
    await db.update(userLocationsTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(
        and(
          eq(userLocationsTable.user_id, input.user_id),
          eq(userLocationsTable.is_active, true)
        )
      )
      .execute();

    // Create the new location record
    const result = await db.insert(userLocationsTable)
      .values({
        user_id: input.user_id,
        zip_code: input.zip_code,
        latitude: latitude.toString(), // Convert number to string for numeric column
        longitude: longitude.toString(), // Convert number to string for numeric column
        city: city,
        state: state,
        is_active: true
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const location = result[0];
    return {
      ...location,
      latitude: parseFloat(location.latitude), // Convert string back to number
      longitude: parseFloat(location.longitude) // Convert string back to number
    };
  } catch (error) {
    console.error('User location creation failed:', error);
    throw error;
  }
}
