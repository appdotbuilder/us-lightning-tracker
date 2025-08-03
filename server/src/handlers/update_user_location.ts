
import { db } from '../db';
import { userLocationsTable } from '../db/schema';
import { type UpdateUserLocationInput, type UserLocation } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUserLocation = async (input: UpdateUserLocationInput): Promise<UserLocation> => {
  try {
    // Build the update object with only provided fields
    const updateData: any = {};
    
    if (input.zip_code !== undefined) {
      updateData.zip_code = input.zip_code;
    }
    
    if (input.latitude !== undefined) {
      updateData.latitude = input.latitude.toString();
    }
    
    if (input.longitude !== undefined) {
      updateData.longitude = input.longitude.toString();
    }
    
    if (input.city !== undefined) {
      updateData.city = input.city;
    }
    
    if (input.state !== undefined) {
      updateData.state = input.state;
    }
    
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Always update the timestamp
    updateData.updated_at = new Date();

    // Update the record
    const result = await db.update(userLocationsTable)
      .set(updateData)
      .where(eq(userLocationsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('User location not found');
    }

    // Convert numeric fields back to numbers
    const userLocation = result[0];
    return {
      ...userLocation,
      latitude: parseFloat(userLocation.latitude),
      longitude: parseFloat(userLocation.longitude)
    };
  } catch (error) {
    console.error('User location update failed:', error);
    throw error;
  }
};
