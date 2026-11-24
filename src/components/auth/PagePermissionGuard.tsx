import { useLocation } from 'react-router';
import { usePermissions } from '../../hooks/usePermissions';
import NoPermissionView from '../common/NoPermissionView';

type Props = {
  children: React.ReactNode;
};

/** Blocks page content when the current URL is not allowed for this user. */
const PagePermissionGuard = ({ children }: Props) => {
  const { pathname } = useLocation();
  const { canAccessPath } = usePermissions();

  if (!canAccessPath(pathname)) {
    return (
      <NoPermissionView message="You do not have permission to open this page." />
    );
  }

  return <>{children}</>;
};

export default PagePermissionGuard;
