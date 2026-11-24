import { Resource, Action } from '../types/permission';
import type { PermissionResourceKey, PermissionActionKey } from '../utils/permissions';

export type NavSubItem = {
  name: string;
  path: string;
  resource: PermissionResourceKey;
  action?: PermissionActionKey;
  pro?: boolean;
  new?: boolean;
};

export type NavMenuItem = {
  name: string;
  path?: string;
  resource?: PermissionResourceKey;
  action?: PermissionActionKey;
  subItems?: NavSubItem[];
  alwaysVisible?: boolean;
};

export const NAV_MENU_ITEMS: NavMenuItem[] = [
  {
    name: 'Dashboard',
    path: '/',
    resource: Resource.DASHBOARD,
    action: Action.READ,
  },
  {
    name: 'Business Partners',
    subItems: [
      { name: 'Company Management', path: '/buyer-list', resource: Resource.COMPANY, action: Action.READ },
      { name: 'User Management', path: '/user-list', resource: Resource.USER, action: Action.READ },
      { name: 'Sourcing Vendors', path: '/vendor-management', resource: Resource.VENDOR, action: Action.READ },
    ],
    resource: Resource.COMPANY,
    action: Action.READ,
  },
  {
    name: 'Roll Management',
    path: '/reel-management',
    resource: Resource.REEL,
    action: Action.READ,
  },
  {
    name: 'Sheet Management',
    path: '/sheet-management',
    resource: Resource.SHEET,
    action: Action.READ,
  },
  {
    name: 'Inventory Intel',
    subItems: [
      { name: 'Analytics & Intelligence', path: '/inventory-analytics', resource: Resource.DASHBOARD, action: Action.READ, pro: true },
      { name: 'Payment Dues', path: '/payment-dues', resource: Resource.SHEET, action: Action.READ },
      { name: 'Zero Waste Optimizer', path: '/zero-waste-optimizer', resource: Resource.REEL, action: Action.READ, new: false },
    ],
    resource: Resource.DASHBOARD,
    action: Action.READ,
  },
  {
    name: 'Workforce',
    subItems: [
      { name: 'Employee List', path: '/employee-management', resource: Resource.EMPLOYEE, action: Action.READ },
      { name: 'Lead Management', path: '/lead-management', resource: Resource.EMPLOYEE, action: Action.READ },
      { name: 'Assign Lead', path: '/assign-lead', resource: Resource.EMPLOYEE, action: Action.UPDATE },
    ],
    resource: Resource.EMPLOYEE,
    action: Action.READ,
  },
  {
    name: 'System Updates',
    subItems: [
      { name: 'Notifications', path: '/notification-management', resource: Resource.NOTIFICATION, action: Action.READ },
      { name: 'Activity Logs', path: '/activity-logs', resource: Resource.EMPLOYEE, action: Action.READ },
      { name: 'Permissions', path: '/permission-management', resource: Resource.PERMISSION, action: Action.READ },
    ],
    resource: Resource.NOTIFICATION,
    action: Action.READ,
  },
  {
    name: 'My Profile',
    path: '/profile',
    alwaysVisible: true,
  },
];
