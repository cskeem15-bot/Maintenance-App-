import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { vehicleDetails } from '@/core/domain/assets';
import { applyTaskCompletion, todayISODate } from '@/core/domain/dueDate';
import type { Asset, MaintenanceTask, ServiceRecord } from '@/core/domain/types';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDatabase } from '@/lib/db/DatabaseProvider';
import { saveAsset } from '@/lib/db/repositories/assets';
import { saveTask } from '@/lib/db/repositories/maintenanceTasks';
import { saveServiceRecord } from '@/lib/db/repositories/serviceRecords';
import { useHousehold } from '@/lib/household/HouseholdProvider';
import { generateId } from '@/lib/ids';
import { queryKeys } from '@/lib/query/keys';

interface CompleteTaskModalProps {
  task: MaintenanceTask;
  asset: Asset;
  visible: boolean;
  onClose: () => void;
}

/** Bottom-sheet form for logging a completed maintenance task as a service record. */
export function CompleteTaskModal({ task, asset, visible, onClose }: CompleteTaskModalProps) {
  const db = useDatabase();
  const { user } = useAuth();
  const { householdId, sync } = useHousehold();
  const queryClient = useQueryClient();

  const vehicle = vehicleDetails(asset);
  const tracksMileage = task.triggerType !== 'time';

  const [completedDate, setCompletedDate] = useState(todayISODate());
  const [mileage, setMileage] = useState(vehicle ? String(vehicle.currentMileage) : '');
  const [cost, setCost] = useState('');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const complete = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(completedDate)) throw new Error('Enter the date as YYYY-MM-DD.');

      let completedMileage: number | undefined;
      if (tracksMileage) {
        const parsedMileage = Number.parseInt(mileage, 10);
        if (Number.isNaN(parsedMileage) || parsedMileage < 0) throw new Error('Enter a valid mileage.');
        completedMileage = parsedMileage;
      }

      let parsedCost: number | undefined;
      if (cost.trim()) {
        parsedCost = Number.parseFloat(cost);
        if (Number.isNaN(parsedCost)) throw new Error('Enter a valid cost.');
      }

      const now = new Date();
      const record: ServiceRecord = {
        id: generateId(),
        taskId: task.id,
        assetId: task.assetId,
        completedDate,
        completedMileage,
        cost: parsedCost,
        vendor: vendor.trim() || undefined,
        notes: notes.trim() || undefined,
        createdAt: now.toISOString(),
      };
      await saveServiceRecord(db, record, user.id);

      const updatedTask = applyTaskCompletion(task, { completedDate, completedMileage }, now);
      await saveTask(db, updatedTask);

      if (vehicle && householdId && completedMileage != null && completedMileage > vehicle.currentMileage) {
        const updatedAsset: Asset = {
          ...asset,
          details: { ...vehicle, currentMileage: completedMileage, mileageUpdatedAt: now.toISOString() },
          updatedAt: now.toISOString(),
        };
        await saveAsset(db, updatedAsset, householdId, user.id);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tasksForAsset(task.assetId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecordsForTask(task.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecordsForAsset(task.assetId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.asset(asset.id) }),
        ...(householdId
          ? [
              queryClient.invalidateQueries({ queryKey: queryKeys.tasksForHousehold(householdId) }),
              queryClient.invalidateQueries({ queryKey: queryKeys.assets(householdId) }),
            ]
          : []),
      ]);
      void sync();
      onClose();
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Could not save this.');
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
            <Text className="mb-1 text-lg font-semibold text-neutral-900 dark:text-white">Mark as done</Text>
            <Text className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">{task.title}</Text>

            <TextField
              label="Date completed"
              value={completedDate}
              onChangeText={setCompletedDate}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {tracksMileage ? (
              <TextField label="Mileage" value={mileage} onChangeText={setMileage} keyboardType="number-pad" placeholder="45000" />
            ) : null}

            <TextField
              label="Cost (optional)"
              value={cost}
              onChangeText={setCost}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            <TextField label="Vendor (optional)" value={vendor} onChangeText={setVendor} placeholder="e.g. Jiffy Lube" />
            <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

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
                <Button label="Save" onPress={() => complete.mutate()} loading={complete.isPending} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
