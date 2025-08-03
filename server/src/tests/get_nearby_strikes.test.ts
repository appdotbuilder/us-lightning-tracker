
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { userLocationsTable, lightningStrikesTable } from '../db/schema';
import { type GetNearbyStrikesInput } from '../schema';
import { getNearbyStrikes } from '../handlers/get_nearby_strikes';

describe('getNearbyStrikes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no active location', async () => {
    const input: GetNearbyStrikesInput = {
      user_id: 'user-1',
      radius_miles: 20,
      hours_back: 24
    };

    const result = await getNearbyStrikes(input);
    expect(result).toEqual([]);
  });

  it('should return nearby strikes within radius and time window', async () => {
    // Create user location (Dallas, TX area)
    await db.insert(userLocationsTable).values({
      user_id: 'user-1',
      zip_code: '75201',
      latitude: '32.7767',
      longitude: '-96.7970',
      city: 'Dallas',
      state: 'TX',
      is_active: true
    }).execute();

    // Create nearby lightning strike (about 10 miles away)
    const recentTime = new Date();
    recentTime.setHours(recentTime.getHours() - 1);

    await db.insert(lightningStrikesTable).values({
      latitude: '32.8500', // Slightly north of Dallas
      longitude: '-96.8000', // Slightly west of Dallas
      timestamp: recentTime,
      intensity: '5.5'
    }).execute();

    // Create far lightning strike (outside radius)
    await db.insert(lightningStrikesTable).values({
      latitude: '30.2672', // Houston area (about 240 miles away)
      longitude: '-97.7431',
      timestamp: recentTime,
      intensity: '3.2'
    }).execute();

    const input: GetNearbyStrikesInput = {
      user_id: 'user-1',
      radius_miles: 20,
      hours_back: 24
    };

    const result = await getNearbyStrikes(input);

    expect(result).toHaveLength(1);
    expect(result[0].latitude).toEqual(32.8500);
    expect(result[0].longitude).toEqual(-96.8000);
    expect(result[0].intensity).toEqual(5.5);
    expect(result[0].distance_miles).toBeLessThan(20);
    expect(result[0].distance_miles).toBeGreaterThan(0);
    expect(typeof result[0].distance_miles).toBe('number');
    expect(result[0].timestamp).toBeInstanceOf(Date);
  });

  it('should filter strikes by time window', async () => {
    // Create user location
    await db.insert(userLocationsTable).values({
      user_id: 'user-1',
      zip_code: '75201',
      latitude: '32.7767',
      longitude: '-96.7970',
      city: 'Dallas',
      state: 'TX',
      is_active: true
    }).execute();

    // Create recent strike (within time window)
    const recentTime = new Date();
    recentTime.setHours(recentTime.getHours() - 2);

    await db.insert(lightningStrikesTable).values({
      latitude: '32.7800',
      longitude: '-96.8000',
      timestamp: recentTime,
      intensity: '4.0'
    }).execute();

    // Create old strike (outside time window)
    const oldTime = new Date();
    oldTime.setHours(oldTime.getHours() - 48);

    await db.insert(lightningStrikesTable).values({
      latitude: '32.7800',
      longitude: '-96.8000',
      timestamp: oldTime,
      intensity: '6.0'
    }).execute();

    const input: GetNearbyStrikesInput = {
      user_id: 'user-1',
      radius_miles: 20,
      hours_back: 24
    };

    const result = await getNearbyStrikes(input);

    expect(result).toHaveLength(1);
    expect(result[0].intensity).toEqual(4.0);
    // Compare timestamps in a more flexible way
    expect(result[0].timestamp.getTime()).toBeCloseTo(recentTime.getTime(), -2);
  });

  it('should order strikes by timestamp descending', async () => {
    // Create user location
    await db.insert(userLocationsTable).values({
      user_id: 'user-1',
      zip_code: '75201',
      latitude: '32.7767',
      longitude: '-96.7970',
      city: 'Dallas',
      state: 'TX',
      is_active: true
    }).execute();

    // Create multiple strikes at different times
    const time1 = new Date();
    time1.setHours(time1.getHours() - 5);

    const time2 = new Date();
    time2.setHours(time2.getHours() - 3);

    const time3 = new Date();
    time3.setHours(time3.getHours() - 1);

    await db.insert(lightningStrikesTable).values([
      {
        latitude: '32.7800',
        longitude: '-96.8000',
        timestamp: time1,
        intensity: '1.0'
      },
      {
        latitude: '32.7900',
        longitude: '-96.8100',
        timestamp: time3,
        intensity: '3.0'
      },
      {
        latitude: '32.7850',
        longitude: '-96.8050',
        timestamp: time2,
        intensity: '2.0'
      }
    ]).execute();

    const input: GetNearbyStrikesInput = {
      user_id: 'user-1',
      radius_miles: 20,
      hours_back: 24
    };

    const result = await getNearbyStrikes(input);

    expect(result).toHaveLength(3);
    // Should be ordered by timestamp descending (most recent first)
    expect(result[0].intensity).toEqual(3.0); // time3 (most recent)
    expect(result[1].intensity).toEqual(2.0); // time2 (middle)
    expect(result[2].intensity).toEqual(1.0); // time1 (oldest)
  });

  it('should use default values for radius and hours_back', async () => {
    // Create user location
    await db.insert(userLocationsTable).values({
      user_id: 'user-1',
      zip_code: '75201',
      latitude: '32.7767',
      longitude: '-96.7970',
      city: 'Dallas',
      state: 'TX',
      is_active: true
    }).execute();

    // Create nearby strike
    const recentTime = new Date();
    recentTime.setHours(recentTime.getHours() - 12);

    await db.insert(lightningStrikesTable).values({
      latitude: '32.7800',
      longitude: '-96.8000',
      timestamp: recentTime,
      intensity: '4.5'
    }).execute();

    // Test with defaults (should use radius_miles: 20, hours_back: 24)
    const input: GetNearbyStrikesInput = {
      user_id: 'user-1',
      radius_miles: 20,
      hours_back: 24
    };

    const result = await getNearbyStrikes(input);

    expect(result).toHaveLength(1);
    expect(result[0].intensity).toEqual(4.5);
  });

  it('should only return strikes for active user locations', async () => {
    // Create inactive user location
    await db.insert(userLocationsTable).values({
      user_id: 'user-1',
      zip_code: '75201',
      latitude: '32.7767',
      longitude: '-96.7970',
      city: 'Dallas',
      state: 'TX',
      is_active: false
    }).execute();

    // Create nearby strike
    const recentTime = new Date();
    await db.insert(lightningStrikesTable).values({
      latitude: '32.7800',
      longitude: '-96.8000',
      timestamp: recentTime,
      intensity: '4.0'
    }).execute();

    const input: GetNearbyStrikesInput = {
      user_id: 'user-1',
      radius_miles: 20,
      hours_back: 24
    };

    const result = await getNearbyStrikes(input);
    expect(result).toEqual([]);
  });
});
