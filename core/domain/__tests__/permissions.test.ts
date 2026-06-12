import { canManageRole, hasPermission, permissionsForRole, roleAtLeast } from '../permissions';

describe('hasPermission', () => {
  it('lets viewers only read data', () => {
    expect(hasPermission('viewer', 'asset:view')).toBe(true);
    expect(hasPermission('viewer', 'task:view')).toBe(true);
    expect(hasPermission('viewer', 'asset:create')).toBe(false);
    expect(hasPermission('viewer', 'task:complete')).toBe(false);
    expect(hasPermission('viewer', 'household:manage_members')).toBe(false);
  });

  it('lets members manage assets, tasks and records but not the household', () => {
    expect(hasPermission('member', 'asset:create')).toBe(true);
    expect(hasPermission('member', 'task:complete')).toBe(true);
    expect(hasPermission('member', 'record:create')).toBe(true);
    expect(hasPermission('member', 'asset:delete')).toBe(false);
    expect(hasPermission('member', 'household:invite_members')).toBe(false);
  });

  it('lets admins delete content and manage members but not delete the household', () => {
    expect(hasPermission('admin', 'asset:delete')).toBe(true);
    expect(hasPermission('admin', 'household:invite_members')).toBe(true);
    expect(hasPermission('admin', 'household:manage_members')).toBe(true);
    expect(hasPermission('admin', 'household:delete')).toBe(false);
  });

  it('lets owners do everything admins can plus delete the household', () => {
    const adminPermissions = permissionsForRole('admin');
    const ownerPermissions = permissionsForRole('owner');
    for (const permission of adminPermissions) {
      expect(ownerPermissions).toContain(permission);
    }
    expect(hasPermission('owner', 'household:delete')).toBe(true);
  });
});

describe('roleAtLeast', () => {
  it('orders roles viewer < member < admin < owner', () => {
    expect(roleAtLeast('viewer', 'viewer')).toBe(true);
    expect(roleAtLeast('member', 'viewer')).toBe(true);
    expect(roleAtLeast('viewer', 'member')).toBe(false);
    expect(roleAtLeast('admin', 'member')).toBe(true);
    expect(roleAtLeast('owner', 'admin')).toBe(true);
    expect(roleAtLeast('admin', 'owner')).toBe(false);
  });
});

describe('canManageRole', () => {
  it('prevents viewers and members from managing anyone', () => {
    expect(canManageRole('viewer', 'viewer')).toBe(false);
    expect(canManageRole('member', 'member')).toBe(false);
  });

  it('lets admins manage members and viewers but not other admins or the owner', () => {
    expect(canManageRole('admin', 'member')).toBe(true);
    expect(canManageRole('admin', 'viewer')).toBe(true);
    expect(canManageRole('admin', 'admin')).toBe(false);
    expect(canManageRole('admin', 'owner')).toBe(false);
  });

  it('lets the owner manage anyone, including other admins', () => {
    expect(canManageRole('owner', 'admin')).toBe(true);
    expect(canManageRole('owner', 'member')).toBe(true);
    expect(canManageRole('owner', 'owner')).toBe(true);
  });
});
