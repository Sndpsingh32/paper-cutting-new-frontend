import { useState, useRef, useEffect } from "react";
import { GOOGLE_MAPS_CONFIG } from "../../config/keys";
import { Wrapper, Status } from "@googlemaps/react-wrapper";

interface LocationSelect {
  city: string;
  area: string;
  placeId: string;
  lat: number;
  lng: number;
  fullAddress?: string;
  radiusMeters?: number;
}

interface MapPickerProps {
  onLocationSelect?: (location: LocationSelect) => void; // used in single mode
  onLocationAdd?: (location: LocationSelect) => void; // used in multi mode
  onLocationsChange?: (locations: LocationSelect[]) => void; // optional aggregate callback
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  mode?: "single" | "multi";
  initialLocations?: LocationSelect[]; // markers to render in multi mode
  showSearch?: boolean;
  hideDetails?: boolean;
  defaultRadiusMeters?: number; // optional coverage radius to visualize
}

// Map component that will be rendered inside the Wrapper
const MapComponent = ({
  center,
  zoom,
  mode,
  onLocationSelect,
  onLocationAdd,
  onLocationsChange,
  initialLocations,
  mapRef,
  searchInputRef,
  showSearch,
  radius,
  onPendingChange,
}: {
  center: google.maps.LatLngLiteral;
  zoom: number;
  mode: "single" | "multi";
  onLocationSelect?: (location: LocationSelect) => void;
  onLocationAdd?: (location: LocationSelect) => void;
  onLocationsChange?: (locations: LocationSelect[]) => void;
  initialLocations?: LocationSelect[];
  mapRef: React.RefObject<HTMLDivElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  showSearch?: boolean;
  radius: number;
  onPendingChange?: (loc: LocationSelect | null) => void;
}) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [singleMarker, setSingleMarker] = useState<google.maps.Marker | null>(
    null
  );
  const [multiMarkers, setMultiMarkers] = useState<google.maps.Marker[]>([]);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  // const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [singleCircle, setSingleCircle] = useState<google.maps.Circle | null>(
    null
  );
  const [multiCircles, setMultiCircles] = useState<google.maps.Circle[]>([]);
  // pending location is managed by parent via onPendingChange

  useEffect(() => {
    if (mapRef.current && !map) {
      const newMap = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      setMap(newMap);

      // Initialize geocoder
      setGeocoder(new google.maps.Geocoder());
      // new google.maps.places.PlacesService(newMap); // prepared if needed later
    }
  }, [mapRef, map, center, zoom]);

  useEffect(() => {
    if (!map || !geocoder) return;

    // Seed initial markers in multi mode
    if (
      mode === "multi" &&
      initialLocations &&
      initialLocations.length &&
      multiMarkers.length === 0
    ) {
      const seeded: google.maps.Marker[] = initialLocations.map(
        (loc) =>
          new google.maps.Marker({
            position: { lat: loc.lat, lng: loc.lng },
            map,
          })
      );
      setMultiMarkers(seeded);
    }

    // Setup Places Autocomplete
    let autocomplete: google.maps.places.Autocomplete | null = null;
    if (showSearch && searchInputRef.current) {
      autocomplete = new google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          fields: [
            "geometry",
            "formatted_address",
            "place_id",
            "address_components",
          ],
        }
      );
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete!.getPlace();
        if (!place.geometry || !place.geometry.location) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        map.setCenter({ lat, lng });
        map.setZoom(15);
        const locationData = extractLocationData(
          {
            formatted_address: place.formatted_address || "",
            place_id: place.place_id || "",
            address_components: place.address_components || [],
            geometry: place.geometry,
            types: [],
            html_attributions: [],
          } as unknown as google.maps.GeocoderResult,
          lat,
          lng
        );

        if (mode === "single") {
          if (singleMarker) singleMarker.setMap(null);
          const m = new google.maps.Marker({
            position: { lat, lng },
            map,
            draggable: true,
          });
          setSingleMarker(m);
          onLocationSelect && onLocationSelect(locationData);
        } else {
          const m = new google.maps.Marker({ position: { lat, lng }, map });
          setMultiMarkers((prev) => [...prev, m]);
          onPendingChange && onPendingChange(locationData);
        }
      });
    }

    // Add click listener to the map
    const clickListener = map.addListener(
      "click",
      (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

        if (mode === "single") {
          if (singleMarker) singleMarker.setMap(null);
          const newMarker = new google.maps.Marker({
            position: { lat, lng },
            map,
            draggable: true,
          });
          setSingleMarker(newMarker);
          if (singleCircle) singleCircle.setMap(null);
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            const next = buildLocationFromGeocoder(results, status, lat, lng);
            onLocationSelect && onLocationSelect(next);
          });
          newMarker.addListener(
            "dragend",
            (dragEvent: google.maps.MapMouseEvent) => {
              if (!dragEvent.latLng) return;
              const newLat = dragEvent.latLng.lat();
              const newLng = dragEvent.latLng.lng();
              geocoder.geocode(
                { location: { lat: newLat, lng: newLng } },
                (results, status) => {
                  const next = buildLocationFromGeocoder(
                    results,
                    status,
                    newLat,
                    newLng
                  );
                  onLocationSelect && onLocationSelect(next);
                }
              );
            }
          );
        } else {
          const newMarker = new google.maps.Marker({
            position: { lat, lng },
            map,
          });
          setMultiMarkers((prev) => [...prev, newMarker]);
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            const next = buildLocationFromGeocoder(results, status, lat, lng);
            onPendingChange && onPendingChange(next);
          });
        }
      }
    );

    // Cleanup function
    return () => {
      google.maps.event.removeListener(clickListener);
      if (mode === "single") {
        if (singleMarker) singleMarker.setMap(null);
        if (singleCircle) singleCircle.setMap(null);
      }
      // do not clear multi markers here to preserve state on small re-renders
      if (autocomplete) {
        // no explicit dispose, just let GC collect
      }
    };
  }, [
    map,
    geocoder,
    mode,
    onLocationSelect,
    onLocationAdd,
    initialLocations,
    multiMarkers.length,
    showSearch,
    singleCircle,
  ]);

  useEffect(() => {
    if (mode === "multi" && onLocationsChange && map) {
      // Report current markers positions
      const locations: LocationSelect[] = multiMarkers.map((m) => ({
        city: "",
        area: "",
        placeId: "",
        lat: m.getPosition()?.lat() || 0,
        lng: m.getPosition()?.lng() || 0,
      }));
      onLocationsChange(locations);
    }
  }, [multiMarkers, mode, onLocationsChange, map]);

  // Draw/update radius circles
  useEffect(() => {
    if (!map) return;
    if (mode === "single") {
      if (singleCircle) singleCircle.setMap(null);
      if (singleMarker && singleMarker.getPosition()) {
        const c = new google.maps.Circle({
          map,
          center: singleMarker.getPosition()!,
          radius,
          strokeColor: "#3B82F6",
          strokeOpacity: 0.5,
          strokeWeight: 1,
          fillColor: "#3B82F6",
          fillOpacity: 0.15,
        });
        setSingleCircle(c);
      }
    } else {
      // clear old circles
      multiCircles.forEach((c) => c.setMap(null));
      const cs: google.maps.Circle[] = multiMarkers.map(
        (m) =>
          new google.maps.Circle({
            map,
            center: m.getPosition()!,
            radius,
            strokeColor: "#22C55E",
            strokeOpacity: 0.5,
            strokeWeight: 1,
            fillColor: "#22C55E",
            fillOpacity: 0.12,
          })
      );
      setMultiCircles(cs);
    }
  }, [radius, singleMarker, multiMarkers, mode, map]);

  return null;
};

// Helper function to extract location data from geocoding results
const extractLocationData = (
  address: google.maps.GeocoderResult,
  lat: number,
  lng: number
): LocationSelect => {
  let city = "";
  let area = "";
  let placeId = address.place_id;
  let fullAddress = address.formatted_address;

  // Extract city and area from address components
  for (const component of address.address_components) {
    const types = component.types;

    if (
      types.includes("locality") ||
      types.includes("administrative_area_level_2")
    ) {
      city = component.long_name;
    }

    if (types.includes("sublocality") || types.includes("neighborhood")) {
      area = component.long_name;
    }

    // If we haven't found an area yet, try using route or political
    if (!area && (types.includes("route") || types.includes("political"))) {
      area = component.long_name;
    }
  }

  // Fallback for area if not found
  if (!area && city) {
    area = city;
  }

  return {
    city,
    area,
    placeId,
    lat,
    lng,
    fullAddress,
  };
};

const buildLocationFromGeocoder = (
  results: google.maps.GeocoderResult[] | null,
  status: string,
  lat: number,
  lng: number
): LocationSelect => {
  if (status === "OK" && results && results[0]) {
    const address = results[0];
    return extractLocationData(address, lat, lng);
  }
  return {
    city: "",
    area: "",
    placeId: "",
    lat,
    lng,
    fullAddress: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
  };
};

// Render function for Wrapper component
const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="flex justify-center items-center h-64">
          Loading map...
        </div>
      );
    case Status.FAILURE:
      return (
        <div className="flex justify-center items-center h-64 text-red-500">
          Error loading map
        </div>
      );
    case Status.SUCCESS:
      return <></>; // MapComponent will handle the rendering
  }
};

export const MapPicker = ({
  onLocationSelect,
  onLocationAdd,
  onLocationsChange,
  initialCenter = { lat: 28.6139, lng: 77.209 },
  initialZoom = 13,
  mode = "single",
  initialLocations,
  showSearch = true,
  hideDetails = mode === "multi",
  defaultRadiusMeters = 1000,
}: MapPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSelect | null>(null);
  const [radius, setRadius] = useState<number>(defaultRadiusMeters);
  const [pending, setPending] = useState<LocationSelect | null>(null);

  const handleLocationSelect = (location: LocationSelect) => {
    setSelectedLocation(location);
    onLocationSelect && onLocationSelect(location);
  };

  const handleAddLocation = () => {
    if (!pending) return;
    const withRadius: LocationSelect = { ...pending, radiusMeters: radius };
    onLocationAdd && onLocationAdd(withRadius);
    setPending(null);

    // Clear the search input
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }
  };

  // Calculate progress for the progress bar (1km to 50km range)
  const progress = ((radius - 1000) / (50000 - 1000)) * 100;

  return (
    <div className="mt-2">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-2">
        {showSearch && (
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search places..."
            className="w-full px-3 py-2 border rounded"
          />
        )}
      </div>

      {/* Coverage Radius Controls */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Coverage radius:
          </span>
          <span className="text-sm text-gray-600">
            {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
          </span>
        </div>

        {/* Quick selection buttons */}
        <div className="flex items-center gap-2 mb-3">
          {[1000, 2000, 5000, 10000, 20000].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadius(r)}
              className={`px-2 py-1 text-xs border rounded transition-colors ${
                radius === r
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {r >= 1000 ? `${r / 1000} km` : `${r} m`}
            </button>
          ))}
        </div>

        {/* Progress bar for 1km to 50km range */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>1 km</span>
            <span>50 km</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Custom range slider */}
        <div className="mb-3">
          <input
            type="range"
            min="1000"
            max="50000"
            step="1000"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1km</span>
            <span>10km</span>
            <span>20km</span>
            <span>30km</span>
            <span>40km</span>
            <span>50km</span>
          </div>
        </div>

        {mode === "multi" && (
          <button
            type="button"
            onClick={handleAddLocation}
            disabled={!pending}
            className={`w-full px-4 py-2 text-sm font-medium border rounded-md transition-colors ${
              pending
                ? "bg-green-500 text-white border-green-500 hover:bg-green-600"
                : "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
            }`}
          >
            Add Location with{" "}
            {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`} Radius
          </button>
        )}
      </div>

      <Wrapper
        apiKey={GOOGLE_MAPS_CONFIG.apiKey}
        render={render}
        libraries={["places", "geocoding"]}
      >
        <MapComponent
          center={initialCenter}
          zoom={initialZoom}
          mode={mode}
          onLocationSelect={handleLocationSelect}
          onLocationAdd={onLocationAdd}
          onLocationsChange={onLocationsChange}
          initialLocations={initialLocations}
          mapRef={mapRef}
          searchInputRef={searchInputRef}
          showSearch={showSearch}
          radius={radius}
          onPendingChange={setPending}
        />
      </Wrapper>

      <div
        ref={mapRef}
        style={{ height: "300px", width: "100%" }}
        className="border rounded"
      />

      {!hideDetails && selectedLocation && (
        <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
          <p>
            <strong>Selected Location:</strong>
          </p>
          <p>City: {selectedLocation.city || "Not specified"}</p>
          <p>Area: {selectedLocation.area || "Not specified"}</p>
          <p>Address: {selectedLocation.fullAddress || "Not available"}</p>
          <p>
            Coordinates: {selectedLocation.lat.toFixed(6)},{" "}
            {selectedLocation.lng.toFixed(6)}
          </p>
          <p>
            Coverage Radius:{" "}
            {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
          </p>
        </div>
      )}

      <p className="text-sm text-gray-500 mt-2">
        {mode === "single"
          ? "Click on the map to select a location. You can drag the marker to adjust the position."
          : "Click on the map or use the search to add multiple locations."}
      </p>

      <style dangerouslySetInnerHTML={{
        __html: `
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        `
      }} />
    </div>
  );
};

export default MapPicker;
