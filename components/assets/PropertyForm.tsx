import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { getDefaultHomeTasks, materializeTask, type HomeProfile } from '@/core/domain/taskTemplates';
import type { Asset, PropertyDetails, PropertyKind } from '@/core/domain/types';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDatabase } from '@/lib/db/DatabaseProvider';
import { saveAsset } from '@/lib/db/repositories/assets';
import { saveTask } from '@/lib/db/repositories/maintenanceTasks';
import { useHousehold } from '@/lib/household/HouseholdProvider';
import { generateId } from '@/lib/ids';
import { queryKeys } from '@/lib/query/keys';

const PROPERTY_TYPES: { value: PropertyKind; label: string }[] = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'other', label: 'Other' },
];

const HOME_SYSTEMS: { key: keyof HomeProfile; label: string }[] = [
  { key: 'hasHvac', label: 'Central HVAC (forced-air heating/cooling)' },
  { key: 'hasWaterHeater', label: 'Water heater' },
  { key: 'hasGutters', label: 'Gutters' },
  { key: 'hasDryerVent', label: 'Dryer with exterior vent' },
  { key: 'hasFridgeWaterFilter', label: 'Refrigerator water filter' },
  { key: 'hasSeptic', label: 'Septic system' },
  { key: 'hasSprinklerSystem', label: 'Sprinkler system' },
  { key: 'hasFireplace', label: 'Fireplace or chimney' },
  { key: 'hasPestControl', label: 'Pest control service' },
  { key: 'hasSmokeDetectors', label: 'Smoke & CO detectors' },
];

interface PropertyFormProps {
  /** Called after the property and its starter tasks have been saved locally. */
  onSuccess: (asset: Asset) => void;
}

/** Form for adding a home/property via a short systems questionnaire that seeds a starter maintenance schedule. */
export function PropertyForm({ onSuccess }: PropertyFormProps) {
  const db = useDatabase();
  const { user } = useAuth();
  const { householdId, sync } = useHousehold();
  const queryClient = useQueryClient();

  const [nickname, setNickname] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyKind>('house');
  const [yearBuilt, setYearBuilt] = useState('');
  const [squareFootage, setSquareFootage] = useState('');
  const [systems, setSystems] = useState<HomeProfile>({ hasSmokeDetectors: true });
  const [formError, setFormError] = useState<string | null>(null);

  const addHome = useMutation({
    mutationFn: async () => {
      if (!householdId || !user) throw new Error('Not signed in.');

      const now = new Date();
      const parsedYearBuilt = yearBuilt.trim() ? Number.parseInt(yearBuilt, 10) : undefined;
      const parsedSquareFootage = squareFootage.trim() ? Number.parseInt(squareFootage, 10) : undefined;

      const details: PropertyDetails = {
        propertyType,
        yearBuilt: parsedYearBuilt != null && !Number.isNaN(parsedYearBuilt) ? parsedYearBuilt : undefined,
        squareFootage: parsedSquareFootage != null && !Number.isNaN(parsedSquareFootage) ? parsedSquareFootage : undefined,
        ...systems,
      };

      const asset: Asset = {
        id: generateId(),
        householdId,
        type: 'property',
        name: nickname.trim() || 'My Home',
        details,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await saveAsset(db, asset, householdId, user.id, 'insert');

      const templates = getDefaultHomeTasks(systems);
      for (const template of templates) {
        const task = materializeTask(template, { id: generateId(), assetId: asset.id, now });
        await saveTask(db, task, 'insert');
      }

      return asset;
    },
    onSuccess: async (asset) => {
      if (householdId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.assets(householdId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.tasksForHousehold(householdId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.tasksForAsset(asset.id) }),
        ]);
        void sync();
      }
      onSuccess(asset);
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Could not add this home.');
    },
  });

  function toggleSystem(key: keyof HomeProfile) {
    setSystems((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <View>
      <TextField label="Nickname (optional)" value={nickname} onChangeText={setNickname} placeholder="e.g. Main house" />

      <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">Property type</Text>
      <View className="mb-4 flex-row flex-wrap">
        {PROPERTY_TYPES.map((type) => {
          const selected = propertyType === type.value;
          return (
            <Pressable
              key={type.value}
              onPress={() => setPropertyType(type.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`mb-2 mr-2 rounded-full border px-4 py-2 ${
                selected ? 'border-brand-600 bg-brand-600' : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900'
              }`}
            >
              <Text className={selected ? 'font-medium text-white' : 'text-neutral-700 dark:text-neutral-300'}>{type.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField
            label="Year built (optional)"
            value={yearBuilt}
            onChangeText={setYearBuilt}
            keyboardType="number-pad"
            placeholder="1998"
          />
        </View>
        <View className="flex-1">
          <TextField
            label="Square footage (optional)"
            value={squareFootage}
            onChangeText={setSquareFootage}
            keyboardType="number-pad"
            placeholder="1800"
          />
        </View>
      </View>

      <Text className="mb-2 mt-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">What does your home have?</Text>
      <View className="mb-6">
        {HOME_SYSTEMS.map(({ key, label }) => (
          <ToggleRow key={key} label={label} value={!!systems[key]} onValueChange={() => toggleSystem(key)} />
        ))}
      </View>

      {formError ? (
        <Text className="mb-4 text-sm text-red-600" accessibilityRole="alert">
          {formError}
        </Text>
      ) : null}

      <Button label="Add home" onPress={() => addHome.mutate()} loading={addHome.isPending} />
    </View>
  );
}
