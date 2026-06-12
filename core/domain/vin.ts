// VINs are 17 characters, using digits and uppercase letters excluding
// I, O, and Q (ISO 3779) to avoid confusion with 1, 0, and 0.
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i;

export function isValidVin(vin: string): boolean {
  return VIN_PATTERN.test(vin.trim());
}

/**
 * Shape of a single entry in the NHTSA vPIC `decodevinvalues` response. The
 * real response includes ~150 fields; only the ones we use are declared.
 */
export interface VpicDecodeResult {
  Make?: string;
  Model?: string;
  ModelYear?: string;
  Trim?: string;
  ErrorCode?: string;
  ErrorText?: string;
}

export interface DecodedVehicle {
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  /** True when vPIC's ErrorCode indicates a clean decode (no warnings). */
  isClean: boolean;
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function mapVpicResultToVehicle(vin: string, result: VpicDecodeResult): DecodedVehicle {
  const year = result.ModelYear ? Number.parseInt(result.ModelYear, 10) : undefined;
  const make = result.Make ? toTitleCase(result.Make) : undefined;
  const model = result.Model?.trim() || undefined;
  const trim = result.Trim?.trim() || undefined;

  // ErrorCode is a comma-separated list of codes; "0" alone means a clean decode.
  const firstErrorCode = result.ErrorCode?.split(',')[0]?.trim();

  return {
    vin: vin.toUpperCase(),
    year: year !== undefined && !Number.isNaN(year) ? year : undefined,
    make,
    model,
    trim,
    isClean: firstErrorCode === '0',
  };
}
