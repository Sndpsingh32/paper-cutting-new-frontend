export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PREPARING = "preparing",
  READY = "ready",
  OUT_FOR_DELIVERY = "out_for_delivery",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export interface OrderItem {
  productId: {
    _id: string;
    name: string;
    images: string[];
    categoryId: string;
    description: string;
    isAvailable: boolean;
  };
  quantity: number;
  portionId: string;
  portionDetails: {
    portionSize: string;
    price: number;
    coinsEarned: number;
    referCoinsEarned: number;
  } | null;
  unitPrice: number;
  selectedExtras: {
    extraId: {
      _id: string;
      name: string;
      description: string;
      price: number;
      isAvailable: boolean;
      images: string[];
    };
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  itemTotal: number;
}

export interface Order {
  _id: string;
  orderId: string;
  userId: {
    _id: string;
    email: string;
    createdAt: string;
    name?: string;
    phone?: string;
  };
  addressId: {
    _id: string;
    street: string;
    houseNumber: string;
    landmark: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    addressType: string;
    isDefault: boolean;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  estimatedDeliveryTime?: string;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListFilters {
  page: number;
  limit: number;
  orderStatus?: OrderStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface OrderListResponse {
  success: boolean;
  data: {
    orders: Order[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
    };
  };
  message: string;
}
