import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { getDefaultVehicleTasks, materializeTask } from '@/core/domain/taskTemplates';
import type { Asset, VehicleDetails } from '@/core/domain/types';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDatabase } from '@/lib/db/DatabaseProvider';
import { saveAsset } from '@/lib/db/repositories/assets';
import { saveTask } from '@/lib/db/repositories/maintenanceTasks';
import { useHousehold } from '@/lib/household/HouseholdProvider';
import { generateId } from '@/lib/ids';
import { queryKeys } from '@/lib/query/keys';
import { decodeVin, InvalidVinError } from '@/lib/vin/decodeVin';

interface VehicleFormProps {
  /** Called after the vehicle and its starter tasks have been saved locally. */
  onSuccess: (asset: Asset) => void;
}

/** Form for adding a vehicle, with optional VIN decode, that seeds a starter maintenance schedule. */
export function VehicleForm({ onSuccess }: VehicleFormProps) {
  const db = useDatabase();
  const { user } = useAuth();
  const { householdId, sync } = useHousehold();
  const queryClient = useQueryClient();

  const [vin, setVin] = useState('');
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [trim, setTrim] = useState('');
  const [nickname, setNickname] = useState('');
  const [mileage, setMileage] = useState('');
  const [vinMessage, setVinMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);

  async function handleDecodeVin() {
    setVinMessage(null);
    if (!vin.trim()) {
      setVinMessage('Enter a VIN to decode.');
      return;
    }
    setIsDecoding(true);
    try {
      const decoded = await decodeVin(vin);
      if (decoded.year) setYear(String(decoded.year));
      if (decoded.make) setMake(decoded.make);
      if (decoded.model) setModel(decoded.model);
      if (decoded.trim) setTrim(decoded.trim);
      setVinMessage(
        decoded.isClean ? 'VIN decoded. Review the details below.' : "We decoded what we could — double-check the details below."
      );
    } catch (err) {
      if (err instanceof InvalidVinError) {
        setVinMessage("That doesn't look like a valid 17-character VIN. You can enter details manually below.");
      } else {
        setVinMessage('Could not decode that VIN right now. You can enter details manually below.');
      }
    } finally {
      setIsDecoding(false);
    }
  }

  const addVehicle = useMutation({
    mutationFn: async () => {
      if (!householdId || !user) throw new Error('Not signed in.');

      const trimmedMake = make.trim();
      const trimmedModel = model.trim();
      const parsedYear = Number.parseInt(year, 10);
      const parsedMileage = Number.parseInt(mileage, 10);

      if (!trimmedMake || !trimmedModel) throw new Error('Enter at least a make and model.');
      if (Number.isNaN(parsedYear)) throw new Error('Enter a valid model year.');
      if (Number.isNaN(parsedMileage) || parsedMileage < 0) throw new Error("Enter the vehicle's current mileage.");

      const now = new Date();
      const details: VehicleDetails = {
        year: parsedYear,
        make: trimmedMake,
        model: trimmedModel,
        trim: trim.trim() || undefined,
        vin: vin.trim() || undefined,
        currentMileage: parsedMileage,
        mileageUpdatedAt: now.toISOString(),
      };

      const asset: Asset = {
        id: generateId(),
        householdId,
        type: 'vehicle',
        name: nickname.trim() || `${details.year} ${details.make} ${details.model}`,
        details,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await saveAsset(db, asset, householdId, user.id, 'insert');

      const templates = getDefaultVehicleTasks({ year: details.year, make: details.make, model: details.model });
      for (const template of templates) {
        const task = materializeTask(template, {
          id: generateId(),
          assetId: asset.id,
          currentMileage: details.currentMileage,
          now,
        });
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
      setFormError(err instanceof Error ? err.message : 'Could not add this vehicle.');
    },
  });

  return (
    <View>
      <TextField
        label="VIN (optional)"
        value={vin}
        onChangeText={(value) => {
          setVin(value.toUpperCase());
          setVinMessage(null);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={17}
        placeholder="17-character VIN"
      />
      <View className="mb-4">
        <Button label="Decode VIN" variant="secondary" onPress={handleDecodeVin} loading={isDecoding} />
      </View>
      {vinMessage ? <Text className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">{vinMessage}</Text> : null}

      <TextField label="Nickname (optional)" value={nickname} onChangeText={setNickname} placeholder="e.g. Daily driver" />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="2020" />
        </View>
        <View className="flex-1">
          <TextField label="Make" value={make} onChangeText={setMake} placeholder="Toyota" />
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField label="Model" value={model} onChangeText={setModel} placeholder="Camry" />
        </View>
        <View className="flex-1">
          <TextField label="Trim (optional)" value={trim} onChangeText={setTrim} placeholder="LE" />
        </View>
      </View>

      <TextField
        label="Current mileage"
        value={mileage}
        onChangeText={setMileage}
        keyboardType="number-pad"
        placeholder="45000"
      />

      {formError ? (
        <Text className="mb-4 text-sm text-red-600" accessibilityRole="alert">
          {formError}
        </Text>
      ) : null}

      <Button label="Add vehicle" onPress={() => addVehicle.mutate()} loading={addVehicle.isPending} />
    </View>
  );
}
