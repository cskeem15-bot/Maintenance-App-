import type { Asset, PropertyKind } from '@/core/domain/types';
import { propertyDetails, vehicleDetails } from '@/core/domain/assets';

export const PROPERTY_TYPE_LABELS: Record<PropertyKind, string> = {
  house: 'House',
  apartment: 'Apartment',
  condo: 'Condo',
  townhouse: 'Townhouse',
  other: 'Property',
};

export function assetIcon(asset: Asset): string {
  return asset.type === 'vehicle' ? '🚗' : '🏠';
}

/** A short one-line summary shown under an asset's name in lists. */
export function formatAssetSubtitle(asset: Asset): string {
  const vehicle = vehicleDetails(asset);
  if (vehicle) {
    return `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.currentMileage.toLocaleString()} mi`;
  }

  const property = propertyDetails(asset);
  const label = property ? PROPERTY_TYPE_LABELS[property.propertyType] : 'Property';
  return property?.squareFootage ? `${label} · ${property.squareFootage.toLocaleString()} sq ft` : label;
}

/** Additional label/value pairs shown on the asset detail screen. */
export function formatAssetDetails(asset: Asset): { label: string; value: string }[] {
  const vehicle = vehicleDetails(asset);
  if (vehicle) {
    const { trim, vin, currentMileage, mileageUpdatedAt } = vehicle;
    const details: { label: string; value: string }[] = [{ label: 'Mileage', value: `${currentMileage.toLocaleString()} mi` }];
    if (trim) details.push({ label: 'Trim', value: trim });
    if (vin) details.push({ label: 'VIN', value: vin });
    details.push({ label: 'Mileage updated', value: new Date(mileageUpdatedAt).toLocaleDateString() });
    return details;
  }

  const property = propertyDetails(asset);
  if (!property) return [];

  const { propertyType, yearBuilt, squareFootage, ...systems } = property;
  const details: { label: string; value: string }[] = [{ label: 'Type', value: PROPERTY_TYPE_LABELS[propertyType] }];
  if (yearBuilt) details.push({ label: 'Year built', value: String(yearBuilt) });
  if (squareFootage) details.push({ label: 'Square footage', value: `${squareFootage.toLocaleString()} sq ft` });

  const SYSTEM_LABELS: Record<string, string> = {
    hasHvac: 'HVAC',
    hasWaterHeater: 'Water heater',
    hasGutters: 'Gutters',
    hasDryerVent: 'Dryer vent',
    hasFridgeWaterFilter: 'Fridge water filter',
    hasSeptic: 'Septic',
    hasSprinklerSystem: 'Sprinklers',
    hasFireplace: 'Fireplace',
    hasPestControl: 'Pest control',
    hasSmokeDetectors: 'Smoke/CO detectors',
  };
  const present = Object.entries(systems)
    .filter(([, value]) => value === true)
    .map(([key]) => SYSTEM_LABELS[key])
    .filter((label): label is string => !!label);
  if (present.length > 0) details.push({ label: 'Systems', value: present.join(', ') });

  return details;
}
