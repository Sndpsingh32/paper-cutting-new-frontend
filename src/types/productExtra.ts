export interface ProductExtra {
  _id: string;
  name: string;
  description: string;
  price: number;
  productId: string;
  maxQuantity: number;
  minQuantity: number;
  images: string[];
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductExtraData {
  name: string;
  description: string;
  price: number;
  productId: string;
  maxQuantity: number;
  minQuantity: number;
  images: string[];
  isAvailable: boolean;
}

export interface UpdateProductExtraData extends CreateProductExtraData {
  productExtraId: string;
}