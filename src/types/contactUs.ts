export interface ContactUs {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  topic: string;
  message: string;
  isResolved: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  resolvedAt?: string;
  resolvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface ContactUsListResponse {
  success: boolean;
  message: string;
  data: {
    contactUsList: ContactUs[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

export interface ContactUsFilters {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isResolved?: boolean;
}
