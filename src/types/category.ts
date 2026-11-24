export interface Category {
  _id: string;
  categoryId?: string;
  name: string;
  description?: string;
  image: string;
  isActive: boolean;
  createBy?: {
    userId: string;
    fullName: string;
    email: string;
    mobileNumber: string;
  };
  updatedBy?: {
    userId: string;
    fullName: string;
    email: string;
    mobileNumber: string;
  };
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  image: string;
  isActive: boolean;
}

export interface UpdateCategoryData extends CreateCategoryData {
  _id: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
