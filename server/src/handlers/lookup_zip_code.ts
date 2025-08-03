
import { type ZipCodeLookupInput, type ZipCodeLookupResponse } from '../schema';

// Mock ZIP code database - in production this would be a real database or API
const ZIP_CODE_DATABASE: Record<string, Omit<ZipCodeLookupResponse, 'zip_code'>> = {
  '10001': {
    city: 'New York',
    state: 'NY',
    latitude: 40.7505,
    longitude: -73.9934
  },
  '90210': {
    city: 'Beverly Hills',
    state: 'CA',
    latitude: 34.0901,
    longitude: -118.4065
  },
  '60601': {
    city: 'Chicago',
    state: 'IL',
    latitude: 41.8825,
    longitude: -87.6441
  },
  '33101': {
    city: 'Miami',
    state: 'FL',
    latitude: 25.7743,
    longitude: -80.1937
  },
  '78701': {
    city: 'Austin',
    state: 'TX',
    latitude: 30.2711,
    longitude: -97.7436
  }
};

export async function lookupZipCode(input: ZipCodeLookupInput): Promise<ZipCodeLookupResponse> {
  try {
    // Extract base ZIP code (remove +4 extension if present)
    const baseZipCode = input.zip_code.split('-')[0];
    
    // Look up ZIP code in our mock database
    const locationData = ZIP_CODE_DATABASE[baseZipCode];
    
    if (!locationData) {
      throw new Error(`ZIP code ${input.zip_code} not found`);
    }

    return {
      zip_code: input.zip_code,
      city: locationData.city,
      state: locationData.state,
      latitude: locationData.latitude,
      longitude: locationData.longitude
    };
  } catch (error) {
    console.error('ZIP code lookup failed:', error);
    throw error;
  }
}
