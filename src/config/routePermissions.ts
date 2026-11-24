import { Action, Resource } from '../types/permission';
import type { PermissionActionKey, PermissionResourceKey, PermissionsMap } from '../utils/permissions';
import { hasPermission, isAdminRole } from '../utils/permissions';

type RouteRule = {
  pattern: RegExp;
  resource: PermissionResourceKey;
  action: PermissionActionKey;
};

/** Longest / most specific patterns should be matched first where needed. */
const ROUTE_RULES: RouteRule[] = [
  { pattern: /^\/permission-create$/, resource: Resource.PERMISSION, action: Action.UPDATE },
  { pattern: /^\/permission-management$/, resource: Resource.PERMISSION, action: Action.READ },
  { pattern: /^\/activity-logs\//, resource: Resource.EMPLOYEE, action: Action.READ },
  { pattern: /^\/activity-logs$/, resource: Resource.EMPLOYEE, action: Action.READ },
  { pattern: /^\/notification-create$/, resource: Resource.NOTIFICATION, action: Action.UPDATE },
  { pattern: /^\/notification-management$/, resource: Resource.NOTIFICATION, action: Action.READ },
  { pattern: /^\/employee-registration$/, resource: Resource.EMPLOYEE, action: Action.UPDATE },
  { pattern: /^\/employee-management$/, resource: Resource.EMPLOYEE, action: Action.READ },
  { pattern: /^\/user-timeline$/, resource: Resource.EMPLOYEE, action: Action.READ },
  { pattern: /^\/assign-lead$/, resource: Resource.EMPLOYEE, action: Action.UPDATE },
  { pattern: /^\/lead-management$/, resource: Resource.EMPLOYEE, action: Action.READ },
  { pattern: /^\/vendor-registration$/, resource: Resource.VENDOR, action: Action.UPDATE },
  { pattern: /^\/vendor-management$/, resource: Resource.VENDOR, action: Action.READ },
  { pattern: /^\/company-registration$/, resource: Resource.COMPANY, action: Action.UPDATE },
  { pattern: /^\/buyer-list$/, resource: Resource.COMPANY, action: Action.READ },
  { pattern: /^\/user-list$/, resource: Resource.USER, action: Action.READ },
  { pattern: /^\/user-registration$/, resource: Resource.USER, action: Action.UPDATE },
  { pattern: /^\/company-management$/, resource: Resource.COMPANY, action: Action.READ },
  { pattern: /^\/reel-management\/add$/, resource: Resource.REEL, action: Action.UPDATE },
  { pattern: /^\/reel-management$/, resource: Resource.REEL, action: Action.READ },
  { pattern: /^\/sheet-management\/add$/, resource: Resource.SHEET, action: Action.UPDATE },
  { pattern: /^\/sheet-management$/, resource: Resource.SHEET, action: Action.READ },
  { pattern: /^\/consolidated-sale$/, resource: Resource.SHEET, action: Action.CREATE },
  { pattern: /^\/new-sale$/, resource: Resource.SHEET, action: Action.CREATE },
  { pattern: /^\/payment-dues$/, resource: Resource.SHEET, action: Action.READ },
  { pattern: /^\/zero-waste-optimizer$/, resource: Resource.REEL, action: Action.READ },
  { pattern: /^\/inventory-analytics$/, resource: Resource.DASHBOARD, action: Action.READ },
  { pattern: /^\/inventory-intelligence$/, resource: Resource.DASHBOARD, action: Action.READ },
  { pattern: /^\/profile$/, resource: Resource.DASHBOARD, action: Action.READ },
  { pattern: /^\/$/, resource: Resource.DASHBOARD, action: Action.READ },
];

const PUBLIC_PATHS = ['/profile'];

export function canAccessPath(
  pathname: string,
  role: string | undefined | null,
  permissions: PermissionsMap | null | undefined,
): boolean {
  if (isAdminRole(role)) return true;
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return true;

  const rule = ROUTE_RULES.find(r => r.pattern.test(pathname));
  if (!rule) return true;
  return hasPermission(role, permissions, rule.resource, rule.action);
}
