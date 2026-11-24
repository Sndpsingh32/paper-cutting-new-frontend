export interface Bid {
  _id: string;
  serviceId: Service | string;
  userId: User | string;
  originalBidId?: Bid | string;
  proposedPrice: number;
  description?: string;
  status: BidStatus;
  bidType: BidType;
  acceptedBy?: User | string;
  acceptedAt?: string;
  rejectedBy?: User | string;
  rejectedAt?: string;
  createBy?: User | string;
  updatedBy?: User | string;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  _id: string;
  title: string;
  description: string;
  category: string;
  price?: number;
  isActive: boolean;
  createdAt: string;
}

export interface User {
  _id: string;
  fullName: string;
  mobileNumber: string;
  location?: Location;
  role: string;
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

export enum BidStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  COUNTERED = 'countered',
}

export enum BidType {
  USER_BID = 'user_bid',
  FRANCHISE_COUNTER = 'franchise_counter',
}

export interface CreateBidRequest {
  serviceId: string;
  proposedPrice: number;
  description?: string;
}

export interface CounterBidRequest {
  bidId: string;
  counterPrice: number;
  message?: string;
}

export interface BidListRequest {
  page?: number;
  limit?: number;
  serviceId?: string;
  status?: BidStatus;
  search?: string;
}

export interface BidListResponse {
  bids: Bid[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface SocketEvents {
  // Client to Server
  create_bid: CreateBidRequest;
  create_counter_bid: CounterBidRequest;
  accept_bid: { bidId: string };
  reject_bid: { bidId: string };

  // Server to Client
  bid_created: { success: boolean; message: string; bid: Bid };
  counter_bid_created: { success: boolean; message: string; counterBid: Bid };
  bid_accepted: { success: boolean; message: string; bid: Bid };
  bid_rejected: { success: boolean; message: string; bid: Bid };
  counter_bid_received: { counterBid: Bid; message: string };
  new_bid: { bid: Bid; message: string };
  bidding_closed: { serviceId: string; acceptedBid: Bid; message: string };
  bid_error: { success: boolean; message: string };
}
