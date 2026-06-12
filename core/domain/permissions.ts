import type { HouseholdRole } from './types';

export type Permission =
  | 'asset:view'
  | 'asset:create'
  | 'asset:edit'
  | 'asset:delete'
  | 'task:view'
  | 'task:create'
  | 'task:edit'
  | 'task:delete'
  | 'task:complete'
  | 'record:view'
  | 'record:create'
  | 'document:view'
  | 'document:upload'
  | 'document:delete'
  | 'household:invite_members'
  | 'household:manage_members'
  | 'household:edit'
  | 'household:delete';

const VIEWER_PERMISSIONS: Permission[] = ['asset:view', 'task:view', 'record:view', 'document:view'];

const MEMBER_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  'asset:create',
  'asset:edit',
  'task:create',
  'task:edit',
  'task:complete',
  'record:create',
  'document:upload',
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...MEMBER_PERMISSIONS,
  'asset:delete',
  'task:delete',
  'document:delete',
  'household:invite_members',
  'household:manage_members',
  'household:edit',
];

const OWNER_PERMISSIONS: Permission[] = [...ADMIN_PERMISSIONS, 'household:delete'];

const ROLE_PERMISSIONS: Record<HouseholdRole, Permission[]> = {
  owner: OWNER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  member: MEMBER_PERMISSIONS,
  viewer: VIEWER_PERMISSIONS,
};

/** Returns whether a given household role grants the given permission. */
export function hasPermission(role: HouseholdRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Returns all permissions granted to a given household role. */
export function permissionsForRole(role: HouseholdRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

const ROLE_RANK: Record<HouseholdRole, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

/** Returns true if `role` is at least as privileged as `minimumRole`. */
export function roleAtLeast(role: HouseholdRole, minimumRole: HouseholdRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimumRole];
}

/**
 * Returns true if `actorRole` is allowed to change a member's role to/from
 * `targetRole`. Only owners and admins can manage members, admins cannot
 * promote anyone to (or act upon) the owner role, and nobody can act on a
 * role above their own.
 */
export function canManageRole(actorRole: HouseholdRole, targetRole: HouseholdRole): boolean {
  if (!hasPermission(actorRole, 'household:manage_members')) return false;
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole] || actorRole === 'owner';
}
