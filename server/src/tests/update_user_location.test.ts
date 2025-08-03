
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { userLocationsTable } from '../db/schema';
import { type UpdateUserLocationInput, type CreateUserLocationInput } from '../schema';
import { updateUserLocation } from '../handlers/update_user_location';
import { eq } from 'drizzle-orm';

// Helper function to create a user location for testing
const createTestUserLocation = async (input: CreateUserLocationInput) => {
  const result = await db.insert(userLocationsTable)
    .values({
      user_id: input.user_id,
      zip_code: input.zip_code,
      latitude: input.latitude?.toString() || '0',
      longitude: input.longitude?.toString() || '0',
      city: input.city || 'Unknown City',
      state: input.state || 'Unknown State'
    })
    .returning()
    .execute();

  const userLocation = result[0];
  return {
    ...userLocation,
    latitude: parseFloat(userLocation.latitude),
    longitude: parseFloat(userLocation.longitude)
  };
};

describe('updateUserLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user location with all fields', async () => {
    // Create initial user location
    const createInput: CreateUserLocationInput = {
      user_id: 'user123',
      zip_code: '10001',
      latitude: 40.7589,
      longitude: -73.9851,
      city: 'New York',
      state: 'NY'
    };

    const created = await createTestUserLocation(createInput);

    // Update all fields
    const updateInput: UpdateUserLocationInput = {
      id: created.id,
      zip_code: '90210',
      latitude: 34.0901,
      longitude: -118.4065,
      city: 'Beverly Hills',
      state: 'CA',
      is_active: false
    };

    const result = await updateUserLocation(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(created.id);
    expect(result.user_id).toEqual('user123');
    expect(result.zip_code).toEqual('90210');
    expect(result.latitude).toEqual(34.0901);
    expect(result.longitude).toEqual(-118.4065);
    expect(result.city).toEqual('Beverly Hills');
    expect(result.state).toEqual('CA');
    expect(result.is_active).toEqual(false);
    expect(result.created_at).toEqual(created.created_at);
    expect(result.updated_at).not.toEqual(created.updated_at);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    // Create initial user location
    const createInput: CreateUserLocationInput = {
      user_id: 'user456',
      zip_code: '60601',
      latitude: 41.8781,
      longitude: -87.6298,
      city: 'Chicago',
      state: 'IL'
    };

    const created = await createTestUserLocation(createInput);

    // Update only ZIP code and city
    const updateInput: UpdateUserLocationInput = {
      id: created.id,
      zip_code: '60602',
      city: 'Chicago Loop'
    };

    const result = await updateUserLocation(updateInput);

    // Verify only specified fields were updated
    expect(result.zip_code).toEqual('60602');
    expect(result.city).toEqual('Chicago Loop');
    // Other fields should remain unchanged
    expect(result.latitude).toEqual(41.8781);
    expect(result.longitude).toEqual(-87.6298);
    expect(result.state).toEqual('IL');
    expect(result.is_active).toEqual(true);
    expect(result.updated_at).not.toEqual(created.updated_at);
  });

  it('should update coordinates only', async () => {
    // Create initial user location
    const createInput: CreateUserLocationInput = {
      user_id: 'user789',
      zip_code: '33101',
      latitude: 25.7617,
      longitude: -80.1918,
      city: 'Miami',
      state: 'FL'
    };

    const created = await createTestUserLocation(createInput);

    // Update only coordinates
    const updateInput: UpdateUserLocationInput = {
      id: created.id,
      latitude: 25.7743,
      longitude: -80.1937
    };

    const result = await updateUserLocation(updateInput);

    // Verify coordinates were updated
    expect(result.latitude).toEqual(25.7743);
    expect(result.longitude).toEqual(-80.1937);
    // Other fields should remain unchanged
    expect(result.zip_code).toEqual('33101');
    expect(result.city).toEqual('Miami');
    expect(result.state).toEqual('FL');
    expect(result.is_active).toEqual(true);
  });

  it('should update is_active status', async () => {
    // Create initial user location
    const createInput: CreateUserLocationInput = {
      user_id: 'user101',
      zip_code: '75201',
      latitude: 32.7767,
      longitude: -96.7970,
      city: 'Dallas',
      state: 'TX'
    };

    const created = await createTestUserLocation(createInput);

    // Deactivate location
    const updateInput: UpdateUserLocationInput = {
      id: created.id,
      is_active: false
    };

    const result = await updateUserLocation(updateInput);

    expect(result.is_active).toEqual(false);
    // Other fields should remain unchanged
    expect(result.zip_code).toEqual('75201');
    expect(result.city).toEqual('Dallas');
    expect(result.state).toEqual('TX');
  });

  it('should save updates to database', async () => {
    // Create initial user location
    const createInput: CreateUserLocationInput = {
      user_id: 'user202',
      zip_code: '02101',
      latitude: 42.3601,
      longitude: -71.0589,
      city: 'Boston',
      state: 'MA'
    };

    const created = await createTestUserLocation(createInput);

    // Update location
    const updateInput: UpdateUserLocationInput = {
      id: created.id,
      zip_code: '02102',
      city: 'Boston Downtown'
    };

    await updateUserLocation(updateInput);

    // Verify changes were saved to database
    const savedLocation = await db.select()
      .from(userLocationsTable)
      .where(eq(userLocationsTable.id, created.id))
      .execute();

    expect(savedLocation).toHaveLength(1);
    expect(savedLocation[0].zip_code).toEqual('02102');
    expect(savedLocation[0].city).toEqual('Boston Downtown');
    expect(parseFloat(savedLocation[0].latitude)).toEqual(42.3601);
    expect(parseFloat(savedLocation[0].longitude)).toEqual(-71.0589);
    expect(savedLocation[0].state).toEqual('MA');
  });

  it('should throw error for non-existent location', async () => {
    const updateInput: UpdateUserLocationInput = {
      id: 99999,
      zip_code: '00000'
    };

    expect(updateUserLocation(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should always update the timestamp', async () => {
    // Create initial user location
    const createInput: CreateUserLocationInput = {
      user_id: 'user303',
      zip_code: '98101',
      latitude: 47.6062,
      longitude: -122.3321,
      city: 'Seattle',
      state: 'WA'
    };

    const created = await createTestUserLocation(createInput);
    const originalUpdatedAt = created.updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update with minimal change
    const updateInput: UpdateUserLocationInput = {
      id: created.id,
      city: 'Seattle Updated'
    };

    const result = await updateUserLocation(updateInput);

    expect(result.updated_at).not.toEqual(originalUpdatedAt);
    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });
});
