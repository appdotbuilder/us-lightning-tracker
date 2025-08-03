
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { type ZipCodeLookupInput } from '../schema';
import { lookupZipCode } from '../handlers/lookup_zip_code';

describe('lookupZipCode', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should lookup a valid ZIP code', async () => {
    const input: ZipCodeLookupInput = {
      zip_code: '10001'
    };

    const result = await lookupZipCode(input);

    expect(result.zip_code).toEqual('10001');
    expect(result.city).toEqual('New York');
    expect(result.state).toEqual('NY');
    expect(result.latitude).toEqual(40.7505);
    expect(result.longitude).toEqual(-73.9934);
    expect(typeof result.latitude).toBe('number');
    expect(typeof result.longitude).toBe('number');
  });

  it('should lookup ZIP+4 code format', async () => {
    const input: ZipCodeLookupInput = {
      zip_code: '90210-1234'
    };

    const result = await lookupZipCode(input);

    expect(result.zip_code).toEqual('90210-1234');
    expect(result.city).toEqual('Beverly Hills');
    expect(result.state).toEqual('CA');
    expect(result.latitude).toEqual(34.0901);
    expect(result.longitude).toEqual(-118.4065);
  });

  it('should handle multiple valid ZIP codes', async () => {
    const testCases = [
      { zip: '60601', city: 'Chicago', state: 'IL' },
      { zip: '33101', city: 'Miami', state: 'FL' },
      { zip: '78701', city: 'Austin', state: 'TX' }
    ];

    for (const testCase of testCases) {
      const input: ZipCodeLookupInput = { zip_code: testCase.zip };
      const result = await lookupZipCode(input);

      expect(result.zip_code).toEqual(testCase.zip);
      expect(result.city).toEqual(testCase.city);
      expect(result.state).toEqual(testCase.state);
      expect(typeof result.latitude).toBe('number');
      expect(typeof result.longitude).toBe('number');
    }
  });

  it('should throw error for non-existent ZIP code', async () => {
    const input: ZipCodeLookupInput = {
      zip_code: '99999'
    };

    expect(lookupZipCode(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error for invalid ZIP code', async () => {
    const input: ZipCodeLookupInput = {
      zip_code: '00000'
    };

    expect(lookupZipCode(input)).rejects.toThrow(/not found/i);
  });

  it('should return correct coordinate ranges', async () => {
    const input: ZipCodeLookupInput = {
      zip_code: '10001'
    };

    const result = await lookupZipCode(input);

    // Verify coordinates are within valid ranges
    expect(result.latitude).toBeGreaterThanOrEqual(-90);
    expect(result.latitude).toBeLessThanOrEqual(90);
    expect(result.longitude).toBeGreaterThanOrEqual(-180);
    expect(result.longitude).toBeLessThanOrEqual(180);
  });
});
