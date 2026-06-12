import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { TextField } from '@/components/ui/TextField';
import { vehicleDetails } from '@/core/domain/assets';
import { DEFAULT_DUE_SOON_DAYS, DEFAULT_DUE_SOON_MILES, todayISODate } from '@/core/domain/dueDate';
import type { Asset, MaintenanceTask, TaskPriority, TaskTriggerType } from '@/core/domain/types';
import { useDatabase } from '@/lib/db/DatabaseProvider';
import { saveTask } from '@/lib/db/repositories/maintenanceTasks';
import { useHousehold } from '@/lib/household/HouseholdProvider';
import { generateId } from '@/lib/ids';
import { queryKeys } from '@/lib/query/keys';

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const TIME_TRIGGER_OPTIONS: { value: TaskTriggerType; label: string }[] = [{ value: 'time', label: 'Time only' }];

const VEHICLE_TRIGGER_OPTIONS: { value: TaskTriggerType; label: string }[] = [
  { value: 'time', label: 'Time' },
  { value: 'mileage', label: 'Mileage' },
  { value: 'time_or_mileage', label: 'Either' },
];

interface TaskFormProps {
  asset: Asset;
  /** When provided, edits this task in place; otherwise creates a new one. */
  task?: MaintenanceTask;
  onSuccess: () => void;
}

/** Form for adding or editing a maintenance task's title, interval, priority, and notes. */
export function TaskForm({ asset, task, onSuccess }: TaskFormProps) {
  const db = useDatabase();
  const { householdId, sync } = useHousehold();
  const queryClient = useQueryClient();
  const vehicle = vehicleDetails(asset);
  const triggerOptions = vehicle ? VEHICLE_TRIGGER_OPTIONS : TIME_TRIGGER_OPTIONS;

  const [title, setTitle] = useState(task?.title ?? '');
  const [category, setCategory] = useState(task?.category ?? '');
  const [triggerType, setTriggerType] = useState<TaskTriggerType>(task?.triggerType ?? (vehicle ? 'time_or_mileage' : 'time'));
  const [intervalMonths, setIntervalMonths] = useState(task?.intervalMonths != null ? String(task.intervalMonths) : '');
  const [intervalMiles, setIntervalMiles] = useState(task?.intervalMiles != null ? String(task.intervalMiles) : '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (!householdId) throw new Error('Not signed in.');

      const trimmedTitle = title.trim();
      if (!trimmedTitle) throw new Error('Enter a title.');

      let parsedMonths: number | undefined;
      if (triggerType !== 'mileage') {
        parsedMonths = Number.parseInt(intervalMonths, 10);
        if (Number.isNaN(parsedMonths) || parsedMonths <= 0) throw new Error('Enter a valid number of months.');
      }

      let parsedMiles: number | undefined;
      if (triggerType !== 'time') {
        parsedMiles = Number.parseInt(intervalMiles, 10);
        if (Number.isNaN(parsedMiles) || parsedMiles <= 0) throw new Error('Enter a valid number of miles.');
      }

      const now = new Date();

      if (task) {
        const updated: MaintenanceTask = {
          ...task,
          title: trimmedTitle,
          category: category.trim() || task.category,
          triggerType,
          intervalMonths: parsedMonths,
          intervalMiles: parsedMiles,
          lastCompletedMileage:
            triggerType !== 'time' ? task.lastCompletedMileage ?? vehicle?.currentMileage ?? 0 : task.lastCompletedMileage,
          priority,
          notes: notes.trim() || undefined,
          updatedAt: now.toISOString(),
        };
        await saveTask(db, updated);
        return;
      }

      const newTask: MaintenanceTask = {
        id: generateId(),
        assetId: asset.id,
        title: trimmedTitle,
        category: category.trim() || 'general',
        triggerType,
        intervalMonths: parsedMonths,
        intervalMiles: parsedMiles,
        lastCompletedDate: todayISODate(now),
        lastCompletedMileage: triggerType !== 'time' ? vehicle?.currentMileage ?? 0 : undefined,
        dueSoonThresholdDays: DEFAULT_DUE_SOON_DAYS,
        dueSoonThresholdMiles: DEFAULT_DUE_SOON_MILES,
        priority,
        notes: notes.trim() || undefined,
        archived: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await saveTask(db, newTask, 'insert');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tasksForAsset(asset.id) }),
        ...(householdId ? [queryClient.invalidateQueries({ queryKey: queryKeys.tasksForHousehold(householdId) })] : []),
        ...(task ? [queryClient.invalidateQueries({ queryKey: queryKeys.task(task.id) })] : []),
      ]);
      void sync();
      onSuccess();
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Could not save this task.');
    },
  });

  return (
    <View>
      <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Oil change" />
      <TextField label="Category" value={category} onChangeText={setCategory} placeholder="e.g. engine" />

      {triggerOptions.length > 1 ? (
        <ChipGroup label="Remind based on" options={triggerOptions} value={triggerType} onChange={setTriggerType} />
      ) : null}

      {triggerType !== 'mileage' ? (
        <TextField
          label="Interval (months)"
          value={intervalMonths}
          onChangeText={setIntervalMonths}
          keyboardType="number-pad"
          placeholder="6"
        />
      ) : null}

      {triggerType !== 'time' ? (
        <TextField
          label="Interval (miles)"
          value={intervalMiles}
          onChangeText={setIntervalMiles}
          keyboardType="number-pad"
          placeholder="5000"
        />
      ) : null}

      <ChipGroup label="Priority" options={PRIORITY_OPTIONS} value={priority} onChange={setPriority} />

      <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

      {formError ? (
        <Text className="mb-4 text-sm text-red-600" accessibilityRole="alert">
          {formError}
        </Text>
      ) : null}

      <Button label={task ? 'Save changes' : 'Add task'} onPress={() => save.mutate()} loading={save.isPending} />
    </View>
  );
}
