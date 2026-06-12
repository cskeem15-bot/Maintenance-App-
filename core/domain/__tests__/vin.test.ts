import { isValidVin, mapVpicResultToVehicle } from '../vin';

describe('isValidVin', () => {
  it('accepts a valid 17-character VIN', () => {
    expect(isValidVin('1HGCM82633A004352')).toBe(true);
  });

  it('accepts lowercase VINs', () => {
    expect(isValidVin('1hgcm82633a004352')).toBe(true);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(isValidVin('  1HGCM82633A004352  ')).toBe(true);
  });

  it('rejects VINs that are too short', () => {
    expect(isValidVin('1HGCM82633A00435')).toBe(false);
  });

  it('rejects VINs that are too long', () => {
    expect(isValidVin('1HGCM82633A0043522')).toBe(false);
  });

  it('rejects VINs containing I, O, or Q', () => {
    expect(isValidVin('1HGCM82633AIO4352')).toBe(false);
    expect(isValidVin('1HGCM82633AQ04352')).toBe(false);
  });

  it('rejects VINs with non-alphanumeric characters', () => {
    expect(isValidVin('1HGCM82633A00435-')).toBe(false);
  });
});

describe('mapVpicResultToVehicle', () => {
  it('maps a clean decode result', () => {
    const result = mapVpicResultToVehicle('1hgcm82633a004352', {
      Make: 'HONDA',
      Model: 'Accord',
      ModelYear: '2003',
      Trim: 'EX',
      ErrorCode: '0',
      ErrorText: '0 - VIN decoded clean. Check Digit (9th position) is correct',
    });

    expect(result).toEqual({
      vin: '1HGCM82633A004352',
      year: 2003,
      make: 'Honda',
      model: 'Accord',
      trim: 'EX',
      isClean: true,
    });
  });

  it('title-cases multi-word makes', () => {
    const result = mapVpicResultToVehicle('5UXWX7C5XBA404432', {
      Make: 'LAND ROVER',
      Model: 'Range Rover Sport',
      ModelYear: '2011',
      ErrorCode: '0',
    });

    expect(result.make).toBe('Land Rover');
    expect(result.model).toBe('Range Rover Sport');
  });

  it('flags non-clean decodes via ErrorCode', () => {
    const result = mapVpicResultToVehicle('1HGCM82633A004352', {
      Make: 'HONDA',
      Model: 'Accord',
      ModelYear: '2003',
      ErrorCode: '6, 11',
      ErrorText: 'check digit mismatch',
    });

    expect(result.isClean).toBe(false);
  });

  it('omits fields that are missing or empty', () => {
    const result = mapVpicResultToVehicle('1HGCM82633A004352', {
      Make: '',
      Model: '',
      ModelYear: '',
      Trim: '',
      ErrorCode: '0',
    });

    expect(result.make).toBeUndefined();
    expect(result.model).toBeUndefined();
    expect(result.trim).toBeUndefined();
    expect(result.year).toBeUndefined();
  });
});
