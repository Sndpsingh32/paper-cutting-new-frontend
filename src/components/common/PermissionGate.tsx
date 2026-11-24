import type { ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import type { PermissionActionKey, PermissionResourceKey } from '../../utils/permissions';

type Props = {
  resource: PermissionResourceKey;
  action: PermissionActionKey;
  children: ReactNode;
  fallback?: ReactNode;
};

const PermissionGate = ({ resource, action, children, fallback = null }: Props) => {
  const { can } = usePermissions();
  if (!can(resource, action)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};

export default PermissionGate;
