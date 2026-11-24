// User type definitions for admin user management
export interface User {
  _id: string;
  fullName: string;
  email?: string;
  mobileNumber: string;
  role?: string;
  isVerified: boolean;
  isBlocked: boolean;
  referCode?: string;
  location?: Location;
  gender?: string;
  dob?: string;
  createdAt?: string;
  updatedAt?: string;
  createBy?: string;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  country?: string;
  pincode?: string;
}

export interface UserRegistration {
  mobileNumber: string;
  fullName: string;
  email?: string;
  role?: 'superadmin' | 'franchise' | 'serviceProvider' | 'user';
  location?: Location;
  gender?: 'male' | 'female' | 'other';
  dob?: string;
  isBlocked?: boolean;
}

export interface PagedUserList {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
}
