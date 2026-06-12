export const queryKeys = {
  household: (householdId: string) => ['household', householdId] as const,
  householdMembers: (householdId: string) => ['household', householdId, 'members'] as const,
  assets: (householdId: string) => ['households', householdId, 'assets'] as const,
  asset: (assetId: string) => ['assets', assetId] as const,
  tasksForAsset: (assetId: string) => ['assets', assetId, 'tasks'] as const,
  tasksForHousehold: (householdId: string) => ['households', householdId, 'tasks'] as const,
  serviceRecordsForAsset: (assetId: string) => ['assets', assetId, 'serviceRecords'] as const,
  serviceRecordsForTask: (taskId: string) => ['tasks', taskId, 'serviceRecords'] as const,
  profile: (userId: string) => ['profiles', userId] as const,
};
