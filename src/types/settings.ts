// Settings Types for Paper Cutting Admin

export interface Settings {
  referralCoinsForReferrer: number;
  referralCoinsForReferred: number;
  referralEnabled: boolean;
  minimumWithdrawalAmount: number;
  referRewardEnabled: boolean;
  referRewardAmount: number;
  supportEmail: string;
  supportPhone: string;
  supportWhatsApp: string;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
}

// API Response might include MongoDB fields
export interface SettingsFromAPI extends Settings {
  _id?: string;
  key?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface SettingsResponse {
  success: boolean;
  message: string;
  data: SettingsFromAPI;
}

export interface UpdateSettingsPayload extends Settings {}

