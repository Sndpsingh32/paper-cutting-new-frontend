export interface Banner {
  _id: string;
  name: string;
  image: string;
  status: 'active' | 'inactive';
  isActive?: boolean; // Deprecated, keep for backward compatibility if needed
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBannerData {
  name: string;
  image: string;
  isActive: boolean;
}

export interface UpdateBannerData extends CreateBannerData {
  _id: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
