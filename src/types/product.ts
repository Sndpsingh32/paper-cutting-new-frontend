// src/types/product.ts
export enum LocationType {
  CITY = "city",
  AREA = "area",
}

export enum PortionSize {
  QUARTER = "quarter",
  HALF = "half",
  FULL = "full",
}

export interface ProductLocation {
  type: LocationType;
  city: string;
  area: string;
  googlePlaceId?: string;
  googleLocation?: {
    lat: number;
    lng: number;
  };
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  images: string[];
  coinsEarned: number;
  categoryId: string;
  categoryName?: string;
  isAvailable?: boolean;
  pricing: {
    portionSize: PortionSize;
    price: number;
    coinsEarned?: number;
    referCoinsEarned?: number;
    _id: string;
    createdAt: string;
    updatedAt: string;
  }[];
  availableLocations: ProductLocation[];
  tags: string[];
  isDeleted: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface CreateProductData {
  name: string;
  description: string;
  images: string[];
  coinsEarned: number;
  categoryId: string;
  pricing: {
    portionSize: PortionSize;
    price: number;
  }[];
  availableLocations: ProductLocation[];
}

export interface UpdateProductData {
  productId: string;
  name: string;
  description: string;
  images: string[];
  coinsEarned: number;
  categoryId: string;
  pricing: {
    portionSize: PortionSize;
    price: number;
  }[];
  availableLocations: ProductLocation[];
  isActive: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
