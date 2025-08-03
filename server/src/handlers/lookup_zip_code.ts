
import { type ZipCodeLookupInput, type ZipCodeLookupResponse } from '../schema';

// MOCK IMPLEMENTATION: This is a limited ZIP code database for development/testing
// In a production environment, this should be replaced with:
// - A comprehensive ZIP code database (e.g., USPS database)
// - A third-party geocoding API (Google Maps, MapBox, etc.)
// - A dedicated ZIP code lookup service
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
  },
  '80016': {
    city: 'Aurora',
    state: 'CO',
    latitude: 39.6738,
    longitude: -104.8315
  }
};

export async function lookupZipCode(input: ZipCodeLookupInput): Promise<ZipCodeLookupResponse> {
  try {
    // Extract base ZIP code (remove +4 extension if present)
    const baseZipCode = input.zip_code.split('-')[0];
    
    // Look up ZIP code in our mock database
    const locationData = ZIP_CODE_DATABASE[baseZipCode];
    
    if (!locationData) {
      // In production, this would query a real database or API
      // For now, provide a more informative error message
      throw new Error(`ZIP code ${input.zip_code} not found in mock database. This is a limited implementation - in production, this would support all US ZIP codes via a comprehensive database or geocoding API.`);
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
