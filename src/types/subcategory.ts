export interface Subcategory {
  _id: string;
  subcategoryId?: string;
  name: string;
  description?: string;
  image: string;
  categoryId: string | {
    _id: string;
    name: string;
    description?: string;
    image: string;
  };
  category?: {
    categoryId: string;
    name: string;
    description?: string;
    image: string;
  };
  categoryName?: string;
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

export interface CreateSubcategoryData {
  name: string;
  description?: string;
  image: string;
  categoryId: string;
  isActive: boolean;
}

export interface UpdateSubcategoryData extends CreateSubcategoryData {
  subcategoryId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
