export interface Location {
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface UserProfile {
  userId?: string;
  fullName?: string;
  email?: string;
  mobileNumber?: string;
  referCode?: string;
  isVerified?: boolean;
  role?: string;
  isBlocked?: boolean;
  location?: Location;
  gender?: "male" | "female" | "other";
  dob?: string;
  avatar?: string;
  bio?: string;
  permissions?: {
    [key: string]: string[];
  };
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data?: UserProfile;
}

export interface ProfileUpdateRequest {
  fullName?: string;
  email?: string;
  location?: Location;
  gender?: "male" | "female" | "other";
  dob?: string;
  avatar?: string;
}
