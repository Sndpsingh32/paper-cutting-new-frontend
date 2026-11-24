import type { ReactNode } from 'react';
import type { PermissionActionKey, PermissionResourceKey } from './permissions';

export type TableAction = {
  label: string;
  onClick: (row: Record<string, unknown>) => void;
  variant?: 'primary' | 'danger' | 'success' | 'outline';
  icon?: ReactNode;
  /** Required permission for this row action */
  permission?: { resource: PermissionResourceKey; action: PermissionActionKey };
  hidden?: (row: Record<string, unknown>) => boolean;
};

export function filterTableActions(
  actions: TableAction[],
  can: (resource: PermissionResourceKey, action: PermissionActionKey) => boolean,
): TableAction[] {
  return actions.filter(a => {
    if (!a.permission) return true;
    return can(a.permission.resource, a.permission.action);
  });
}
