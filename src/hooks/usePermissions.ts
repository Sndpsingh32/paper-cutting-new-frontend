import { useCallback, useMemo } from 'react';
import { useProfile } from '../context/ProfileContext';
import {
  hasPermission,
  hasRead,
  isAdminRole,
  normalizePermissionsFromApi,
  type PermissionActionKey,
  type PermissionResourceKey,
  type PermissionsMap,
} from '../utils/permissions';
import { canAccessPath } from '../config/routePermissions';

export function usePermissions() {
  const { profile } = useProfile();
  const role = profile?.role;

  const permissions: PermissionsMap = useMemo(() => {
    if (!profile?.permissions) return {};
    return normalizePermissionsFromApi(profile.permissions);
  }, [profile?.permissions]);

  const isAdmin = isAdminRole(role);

  const can = useCallback(
    (resource: PermissionResourceKey, action: PermissionActionKey) =>
      hasPermission(role, permissions, resource, action),
    [role, permissions],
  );

  const canRead = useCallback(
    (resource: PermissionResourceKey) => hasRead(role, permissions, resource),
    [role, permissions],
  );

  const canCreate = useCallback((r: PermissionResourceKey) => can(r, 'create'), [can]);
  const canUpdate = useCallback((r: PermissionResourceKey) => can(r, 'update'), [can]);
  const canDelete = useCallback((r: PermissionResourceKey) => can(r, 'delete'), [can]);
  const canVerify = useCallback((r: PermissionResourceKey) => can(r, 'verify'), [can]);
  const canExport = useCallback((r: PermissionResourceKey) => can(r, 'export'), [can]);

  const canAccessPathname = useCallback(
    (pathname: string) => canAccessPath(pathname, role, permissions),
    [role, permissions],
  );

  return {
    can,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canVerify,
    canExport,
    canAccessPath: canAccessPathname,
    isAdmin,
    permissions,
    role,
  };
}
