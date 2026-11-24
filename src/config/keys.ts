// API & WebSocket base URL (no trailing slash)
const rawBase = import.meta.env.VITE_API_BASE_URL || 'https://api.jaintradelinks.in';
export const API_CONFIG = {
  baseUrl: rawBase.replace(/\/$/, ''),
};

// Google Maps API configuration
export const GOOGLE_MAPS_CONFIG = {
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places']
};
