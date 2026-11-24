import {
  BellIcon,
  BoxCubeIcon,
  BoxIconLine,
  GridIcon,
  GroupIcon,
  ScissorsIcon,
  UserIcon,
} from '../icons';

export const SIDEBAR_ICONS: Record<string, React.ReactNode> = {
  Dashboard: <GridIcon />,
  'Business Partners': <GroupIcon />,
  'Roll Management': <BoxCubeIcon />,
  'Sheet Management': <ScissorsIcon />,
  'Inventory Intel': <BoxIconLine />,
  Workforce: <GroupIcon />,
  'System Updates': <BellIcon />,
  'My Profile': <UserIcon />,
};
