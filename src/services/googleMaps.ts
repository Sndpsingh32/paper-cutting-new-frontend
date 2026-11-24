import { GOOGLE_MAPS_CONFIG } from '../config/keys';

export const loadGoogleMapsScript = (callback: () => void) => {
  if (typeof window !== 'undefined' && !window.google) {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = callback;
    document.head.appendChild(script);
  } else if (window.google) {
    callback();
  }
};
