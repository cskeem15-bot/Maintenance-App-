import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import type { Asset, VehicleDetails } from '@/core/domain/types';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDatabase } from '@/lib/db/DatabaseProvider';
import { saveAsset } from '@/lib/db/repositories/assets';
import { useHousehold } from '@/lib/household/HouseholdProvider';
import { queryKeys } from '@/lib/query/keys';

interface UpdateMileageModalProps {
  asset: Asset;
  details: VehicleDetails;
  visible: boolean;
  onClose: () => void;
}

/** Bottom-sheet form for manually updating a vehicle's odometer reading. */
export function UpdateMileageModal({ asset, details, visible, onClose }: UpdateMileageModalProps) {
  const db = useDatabase();
  const { user } = useAuth();
  const { householdId, sync } = useHousehold();
  const queryClient = useQueryClient();

  const [mileage, setMileage] = useState(String(details.currentMileage));
  const [formError, setFormError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: async () => {
      if (!user || !householdId) throw new Error('Not signed in.');

      const parsed = Number.parseInt(mileage, 10);
      if (Number.isNaN(parsed) || parsed < 0) throw new Error('Enter a valid mileage.');
      if (parsed < details.currentMileage) throw new Error('Mileage cannot be less than the current reading.');

      const now = new Date();
      const updated: Asset = {
        ...asset,
        details: { ...details, currentMileage: parsed, mileageUpdatedAt: now.toISOString() },
        updatedAt: now.toISOString(),
      };
      await saveAsset(db, updated, householdId, user.id);
    },
    onSuccess: async () => {
      if (householdId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.asset(asset.id) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.assets(householdId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.tasksForAsset(asset.id) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.tasksForHousehold(householdId) }),
        ]);
        void sync();
      }
      onClose();
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Could not update mileage.');
    },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="rounded-t-3xl bg-white p-6 dark:bg-neutral-900">
            <Text className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Update mileage</Text>

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

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button label="Cancel" variant="secondary" onPress={onClose} />
              </View>
              <View className="flex-1">
                <Button label="Save" onPress={() => update.mutate()} loading={update.isPending} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
