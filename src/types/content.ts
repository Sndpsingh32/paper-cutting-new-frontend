export interface Content {
  _id: string;
  type:
    | "privacy_policy"
    | "terms_conditions"
    | "about_us"
    | "faq"
    | "contact_info"
    | "other";
  content: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  createdBy?: {
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

export interface ContentListResponse {
  success: boolean;
  message: string;
  data: {
    contentList: Content[];
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

export interface ContentFilters {
  page: number;
  limit: number;
  search?: string;
  type?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ContentFormData {
  type: Content["type"];
  content: string;
  isActive: boolean;
}
