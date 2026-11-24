import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import Loader from '../common/Loader';
import { MapPin, Search, Crosshair } from 'lucide-react';
import type { Location } from '../../types/user';

interface LocationPickerProps {
  value?: Location;
  onChange: (location: Location | undefined) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  label = 'Location Information',
  placeholder = 'Search for a location...',
  disabled = false
}) => {
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();
          
          if (data && data.display_name) {
            const address = data.address;
            
            const location: Location = {
              lat: latitude,
              lng: longitude,
              address: data.display_name,
              city: address.city || address.town || address.village || '',
              state: address.state || '',
              country: address.country || '',
              pincode: address.postcode || ''
            };

            onChange(location);
            toast.success('Location fetched successfully!');
          }
        } catch (error) {
          console.error('Error fetching address:', error);
          toast.error('Failed to fetch address details');
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Failed to get your location');
        setLocationLoading(false);
      }
    );
  };

  const searchLocation = async (query: string) => {
    if (!query.trim()) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      toast.error('Failed to search location');
    }
  };

  const selectLocation = (place: any) => {
    const location: Location = {
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      address: place.display_name,
      city: place.address?.city || place.address?.town || place.address?.village || '',
      state: place.address?.state || '',
      country: place.address?.country || ''
    };

    onChange(location);
    setSearchResults([]);
    setSearchQuery('');
    toast.success('Location selected successfully!');
  };

  const clearLocation = () => {
    onChange(undefined);
    toast.info('Location removed');
  };

  useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        searchLocation(searchQuery);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      <Label>
        {label}
      </Label>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={disabled}
              className="pr-10"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={disabled || locationLoading}
            className="flex items-center gap-2"
          >
            {locationLoading ? (
              <Loader size="sm" color="gray" />
            ) : (
              <Crosshair className="w-4 h-4" />
            )}
            Current Location
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-white dark:bg-gray-800">
            {searchResults.map((result: any, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectLocation(result)}
                disabled={disabled}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 last:border-b-0 flex items-start gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {result.display_name.split(',')[0]}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {result.display_name}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {value && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Selected Location
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {value.address}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {value.city && `${value.city}, `}
                  {value.state && `${value.state}`}
                  {value.country && `, ${value.country}`}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Coordinates: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearLocation}
                disabled={disabled}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationPicker;
