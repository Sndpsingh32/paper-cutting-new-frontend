import type { ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import type { PermissionResourceKey } from '../../utils/permissions';
import NoPermissionView from '../common/NoPermissionView';

type Props = {
  resource: PermissionResourceKey;
  children: ReactNode;
};

/** Blocks page when user lacks read on this resource (admin bypass). */
const ReadPermissionGuard = ({ resource, children }: Props) => {
  const { canRead, isAdmin } = usePermissions();

  if (!isAdmin && !canRead(resource)) {
    return <NoPermissionView />;
  }

  return <>{children}</>;
};

export default ReadPermissionGuard;
