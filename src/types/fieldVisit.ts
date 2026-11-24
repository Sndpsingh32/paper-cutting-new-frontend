export type FieldVisitStatus = 'assigned' | 'visited' | 'follow_up' | 'closed';

export interface FieldVisitEmployeeRef {
  _id: string;
  fullName?: string;
  email?: string;
  mobileNumber?: string;
}

export interface FieldVisit {
  _id: string;
  leadName: string;
  leadContact?: string;
  leadCompany?: string;
  leadAddress?: string;
  assignedToEmployeeId?: FieldVisitEmployeeRef | string;
  assignedByEmployeeId?: FieldVisitEmployeeRef | string;
  status: FieldVisitStatus;
  assignedAt?: string;
  visitedAt?: string;
  remarks?: string;
  shopPhotos?: string[];
  visitLocation?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignLeadFormData {
  leadName: string;
  leadContact: string;
  leadCompany: string;
  leadAddress: string;
  assignedToEmployeeId: string;
}
