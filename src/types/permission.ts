export enum Resource {
  DASHBOARD = 'dashboard',
  USER = 'user',
  EMPLOYEE = 'employee',
  VENDOR = 'vendor',
  NOTIFICATION = 'notification',
  PERMISSION = 'permission',
  REEL = 'reel',
  SHEET = 'sheet',
  COMPANY = 'company',
}

export enum Action {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VERIFY = 'verify',
  EXPORT = 'export',
}

export interface Permission {
  resource: Resource;
  action: Action[];
}

export interface UserPermission {
  userId: string;
  permissions: Permission[];
  createBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionListRequest {
  page: number;
  limit: number;
  search?: string;
}

export interface PermissionListResponse {
  permissions: UserPermission[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface CreatePermissionRequest {
  userId: string;
  permissions: Permission[];
  createBy: string;
}

export interface UpdatePermissionRequest {
  userId: string;
  permissions: Permission[];
  updatedBy: string;
}

export interface DeletePermissionRequest {
  userId: string;
}
