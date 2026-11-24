import { Resource, Action } from '../types/permission';

export type PermissionResourceKey = `${Resource}`;
export type PermissionActionKey = `${Action}`;

export type PermissionsMap = Partial<Record<PermissionResourceKey, PermissionActionKey[]>>;

export function isAdminRole(role?: string | null): boolean {
  return role === 'superadmin' || role === 'admin';
}

/** Normalize API permission document (Map, nested object, or Permission[] array). */
export function normalizePermissionsFromApi(raw: unknown): PermissionsMap {
  if (!raw) return {};

  let source: unknown = raw;
  if (typeof raw === 'object' && raw !== null && 'permissions' in (raw as object)) {
    source = (raw as { permissions: unknown }).permissions;
  }

  const normalized: PermissionsMap = {};

  if (Array.isArray(source)) {
    source.forEach((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return;
      const { resource, action } = entry as { resource?: string; action?: unknown };
      if (!resource || !Array.isArray(action)) return;
      const key = resource.toLowerCase() as PermissionResourceKey;
      normalized[key] = action.map(a => String(a).toLowerCase()) as PermissionActionKey[];
    });
    return normalized;
  }

  if (typeof source !== 'object' || source === null) return {};

  Object.entries(source as Record<string, unknown>).forEach(([resource, actions]) => {
    if (!Array.isArray(actions)) return;
    const key = resource.toLowerCase() as PermissionResourceKey;
    normalized[key] = actions.map(a => String(a).toLowerCase()) as PermissionActionKey[];
  });
  return normalized;
}

export function hasPermission(
  role: string | undefined | null,
  permissions: PermissionsMap | null | undefined,
  resource: PermissionResourceKey,
  action: PermissionActionKey,
): boolean {
  if (isAdminRole(role)) return true;
  const actions = permissions?.[resource];
  return Array.isArray(actions) && actions.includes(action);
}

export function hasRead(
  role: string | undefined | null,
  permissions: PermissionsMap | null | undefined,
  resource: PermissionResourceKey,
): boolean {
  return hasPermission(role, permissions, resource, Action.READ);
}
