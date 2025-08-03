
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { userLocationsTable } from '../db/schema';
import { type CreateUserLocationInput } from '../schema';
import { createUserLocation } from '../handlers/create_user_location';
import { eq, and } from 'drizzle-orm';

const testInput: CreateUserLocationInput = {
  user_id: 'user123',
  zip_code: '10001',
  latitude: 40.7505,
  longitude: -73.9934,
  city: 'New York',
  state: 'NY'
};

describe('createUserLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user location with provided coordinates', async () => {
    const result = await createUserLocation(testInput);

    expect(result.user_id).toEqual('user123');
    expect(result.zip_code).toEqual('10001');
    expect(result.latitude).toEqual(40.7505);
    expect(result.longitude).toEqual(-73.9934);
    expect(result.city).toEqual('New York');
    expect(result.state).toEqual('NY');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.latitude).toBe('number');
    expect(typeof result.longitude).toBe('number');
  });

  it('should create a user location with default coordinates when not provided', async () => {
    const inputWithoutCoords: CreateUserLocationInput = {
      user_id: 'user456',
      zip_code: '90210'
    };

    const result = await createUserLocation(inputWithoutCoords);

    expect(result.user_id).toEqual('user456');
    expect(result.zip_code).toEqual('90210');
    expect(result.latitude).toEqual(40.7128); // Default NYC latitude
    expect(result.longitude).toEqual(-74.0060); // Default NYC longitude
    expect(result.city).toEqual('Unknown City');
    expect(result.state).toEqual('Unknown State');
    expect(result.is_active).toEqual(true);
    expect(typeof result.latitude).toBe('number');
    expect(typeof result.longitude).toBe('number');
  });

  it('should save location to database correctly', async () => {
    const result = await createUserLocation(testInput);

    const locations = await db.select()
      .from(userLocationsTable)
      .where(eq(userLocationsTable.id, result.id))
      .execute();

    expect(locations).toHaveLength(1);
    const dbLocation = locations[0];
    expect(dbLocation.user_id).toEqual('user123');
    expect(dbLocation.zip_code).toEqual('10001');
    expect(parseFloat(dbLocation.latitude)).toEqual(40.7505);
    expect(parseFloat(dbLocation.longitude)).toEqual(-73.9934);
    expect(dbLocation.city).toEqual('New York');
    expect(dbLocation.state).toEqual('NY');
    expect(dbLocation.is_active).toEqual(true);
    expect(dbLocation.created_at).toBeInstanceOf(Date);
    expect(dbLocation.updated_at).toBeInstanceOf(Date);
  });

  it('should deactivate existing active locations for the user', async () => {
    // Create first location
    const firstLocation = await createUserLocation({
      user_id: 'user789',
      zip_code: '10001',
      latitude: 40.7505,
      longitude: -73.9934,
      city: 'New York',
      state: 'NY'
    });

    // Verify first location is active
    expect(firstLocation.is_active).toEqual(true);

    // Create second location for same user
    const secondLocation = await createUserLocation({
      user_id: 'user789',
      zip_code: '90210',
      latitude: 34.0522,
      longitude: -118.2437,
      city: 'Beverly Hills',
      state: 'CA'
    });

    // Verify second location is active
    expect(secondLocation.is_active).toEqual(true);

    // Check that first location is now inactive
    const firstLocationAfter = await db.select()
      .from(userLocationsTable)
      .where(eq(userLocationsTable.id, firstLocation.id))
      .execute();

    expect(firstLocationAfter[0].is_active).toEqual(false);

    // Check that only one location is active for the user
    const activeLocations = await db.select()
      .from(userLocationsTable)
      .where(
        and(
          eq(userLocationsTable.user_id, 'user789'),
          eq(userLocationsTable.is_active, true)
        )
      )
      .execute();

    expect(activeLocations).toHaveLength(1);
    expect(activeLocations[0].id).toEqual(secondLocation.id);
  });

  it('should handle ZIP code validation', async () => {
    const invalidZipInput: CreateUserLocationInput = {
      user_id: 'user999',
      zip_code: 'invalid',
      latitude: 40.7505,
      longitude: -73.9934,
      city: 'New York',
      state: 'NY'
    };

    // The handler itself doesn't validate - that's done at the API layer
    // But we can test that it accepts the input as-is
    const result = await createUserLocation(invalidZipInput);
    expect(result.zip_code).toEqual('invalid');
  });

  it('should update timestamps correctly when deactivating existing locations', async () => {
    // Create first location
    const firstLocation = await createUserLocation({
      user_id: 'timestamp_user',
      zip_code: '10001',
      latitude: 40.7505,
      longitude: -73.9934,
      city: 'New York',
      state: 'NY'
    });

    const originalUpdatedAt = firstLocation.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second location
    await createUserLocation({
      user_id: 'timestamp_user',
      zip_code: '90210',
      latitude: 34.0522,
      longitude: -118.2437,
      city: 'Beverly Hills',
      state: 'CA'
    });

    // Check that first location's updated_at was changed
    const updatedFirstLocation = await db.select()
      .from(userLocationsTable)
      .where(eq(userLocationsTable.id, firstLocation.id))
      .execute();

    expect(updatedFirstLocation[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    expect(updatedFirstLocation[0].is_active).toEqual(false);
  });
});
