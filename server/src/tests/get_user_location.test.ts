
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { userLocationsTable } from '../db/schema';
import { type GetUserLocationInput } from '../schema';
import { getUserLocation } from '../handlers/get_user_location';
import { eq } from 'drizzle-orm';

const testInput: GetUserLocationInput = {
  user_id: 'test-user-123'
};

describe('getUserLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user location when active location exists', async () => {
    // Create test location
    await db.insert(userLocationsTable)
      .values({
        user_id: 'test-user-123',
        zip_code: '12345',
        latitude: '40.7128',
        longitude: '-74.0060',
        city: 'New York',
        state: 'NY',
        is_active: true
      })
      .execute();

    const result = await getUserLocation(testInput);

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual('test-user-123');
    expect(result!.zip_code).toEqual('12345');
    expect(result!.latitude).toEqual(40.7128);
    expect(result!.longitude).toEqual(-74.0060);
    expect(result!.city).toEqual('New York');
    expect(result!.state).toEqual('NY');
    expect(result!.is_active).toBe(true);
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user has no locations', async () => {
    const result = await getUserLocation(testInput);
    expect(result).toBeNull();
  });

  it('should return null when user has no active locations', async () => {
    // Create inactive location
    await db.insert(userLocationsTable)
      .values({
        user_id: 'test-user-123',
        zip_code: '12345',
        latitude: '40.7128',
        longitude: '-74.0060',
        city: 'New York',
        state: 'NY',
        is_active: false
      })
      .execute();

    const result = await getUserLocation(testInput);
    expect(result).toBeNull();
  });

  it('should return only active location when user has multiple locations', async () => {
    // Create inactive location
    await db.insert(userLocationsTable)
      .values({
        user_id: 'test-user-123',
        zip_code: '54321',
        latitude: '34.0522',
        longitude: '-118.2437',
        city: 'Los Angeles',
        state: 'CA',
        is_active: false
      })
      .execute();

    // Create active location
    await db.insert(userLocationsTable)
      .values({
        user_id: 'test-user-123',
        zip_code: '12345',
        latitude: '40.7128',
        longitude: '-74.0060',
        city: 'New York',
        state: 'NY',
        is_active: true
      })
      .execute();

    const result = await getUserLocation(testInput);

    expect(result).not.toBeNull();
    expect(result!.zip_code).toEqual('12345');
    expect(result!.city).toEqual('New York');
    expect(result!.is_active).toBe(true);
  });

  it('should not return locations for different users', async () => {
    // Create location for different user
    await db.insert(userLocationsTable)
      .values({
        user_id: 'different-user-456',
        zip_code: '12345',
        latitude: '40.7128',
        longitude: '-74.0060',
        city: 'New York',
        state: 'NY',
        is_active: true
      })
      .execute();

    const result = await getUserLocation(testInput);
    expect(result).toBeNull();
  });

  it('should correctly convert numeric coordinates', async () => {
    // Create location with specific coordinates
    await db.insert(userLocationsTable)
      .values({
        user_id: 'test-user-123',
        zip_code: '90210',
        latitude: '34.0901389',
        longitude: '-118.4064167',
        city: 'Beverly Hills',
        state: 'CA',
        is_active: true
      })
      .execute();

    const result = await getUserLocation(testInput);

    expect(result).not.toBeNull();
    expect(typeof result!.latitude).toBe('number');
    expect(typeof result!.longitude).toBe('number');
    expect(result!.latitude).toEqual(34.0901389);
    expect(result!.longitude).toEqual(-118.4064167);
  });
});
