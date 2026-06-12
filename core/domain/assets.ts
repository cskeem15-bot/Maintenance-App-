import type { Asset, PropertyDetails, VehicleDetails } from './types';

/**
 * `Asset.details` is a union typed by `Asset.type`, but the two aren't
 * structurally linked, so TypeScript can't narrow `details` just by checking
 * `type`. These helpers do that narrowing in one place.
 */
export function vehicleDetails(asset: Asset): VehicleDetails | undefined {
  return asset.type === 'vehicle' ? (asset.details as VehicleDetails) : undefined;
}

export function propertyDetails(asset: Asset): PropertyDetails | undefined {
  return asset.type === 'property' ? (asset.details as PropertyDetails) : undefined;
}
