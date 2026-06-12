import { isValidVin, mapVpicResultToVehicle, type DecodedVehicle, type VpicDecodeResult } from '@/core/domain/vin';

const VPIC_DECODE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues';

export class InvalidVinError extends Error {
  constructor(vin: string) {
    super(`"${vin}" is not a valid 17-character VIN.`);
    this.name = 'InvalidVinError';
  }
}

interface VpicDecodeResponse {
  Results?: VpicDecodeResult[];
}

/**
 * Decodes a VIN using NHTSA's free vPIC API (no API key required).
 * Throws InvalidVinError if the VIN fails local format validation, so
 * callers can show an inline error without making a network request.
 */
export async function decodeVin(vin: string, fetchImpl: typeof fetch = fetch): Promise<DecodedVehicle> {
  const trimmed = vin.trim();
  if (!isValidVin(trimmed)) {
    throw new InvalidVinError(trimmed);
  }

  const response = await fetchImpl(`${VPIC_DECODE_URL}/${encodeURIComponent(trimmed)}?format=json`);
  if (!response.ok) {
    throw new Error(`VIN decode request failed with status ${response.status}`);
  }

  const json = (await response.json()) as VpicDecodeResponse;
  const result = json.Results?.[0];
  if (!result) {
    throw new Error('VIN decode returned no results.');
  }

  return mapVpicResultToVehicle(trimmed, result);
}
