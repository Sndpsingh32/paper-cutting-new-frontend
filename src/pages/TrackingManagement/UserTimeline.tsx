import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import { postData } from "../../utility/utility";
import moment from "moment";
import { Wrapper, Status } from "@googlemaps/react-wrapper";
import { GOOGLE_MAPS_CONFIG } from "../../config/keys";
import {
  trackingSocketService,
  LocationUpdateEvent,
  VisitSavedEvent,
} from "../../services/trackingSocketService";

const km = (n: number) => Number(n || 0).toFixed(2);

const toRad = (v: number) => (v * Math.PI) / 180;

const distanceKmBetween = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calcTotalDistanceKm = (points: Array<{ latitude: number; longitude: number }>) => {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!prev || !curr) continue;
    total += distanceKmBetween(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
  }
  return Math.round(total * 100) / 100;
};

const TrackingGoogleMap = ({ points }: { points: Array<{ latitude: number; longitude: number; address?: string; createdAt?: string }> }) => {
  const mapRef = (node: HTMLDivElement | null) => {
    if (!node || points.length === 0 || typeof google === "undefined") return;

    const valid = points.filter(
      (p) =>
        Number.isFinite(Number(p.latitude)) &&
        Number.isFinite(Number(p.longitude)) &&
        !(Number(p.latitude) === 0 && Number(p.longitude) === 0)
    );

    if (valid.length === 0) return;

    const center = { lat: Number(valid[0].latitude), lng: Number(valid[0].longitude) };
    const map = new google.maps.Map(node, {
      center,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    const path = valid.map((p) => ({ lat: Number(p.latitude), lng: Number(p.longitude) }));
    new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#2563eb",
      strokeOpacity: 0.85,
      strokeWeight: 4,
      map,
    });

    const bounds = new google.maps.LatLngBounds();
    valid.forEach((point, idx) => {
      const marker = new google.maps.Marker({
        position: { lat: Number(point.latitude), lng: Number(point.longitude) },
        map,
        label: valid.length > 1 ? String(idx + 1) : undefined,
      });

      const info = new google.maps.InfoWindow({
        content: `
          <div style="font-size:12px;line-height:1.4">
            <div><b>Time:</b> ${point.createdAt ? moment(point.createdAt).format("lll") : "N/A"}</div>
            <div><b>Address:</b> ${point.address || "Address not available"}</div>
          </div>
        `,
      });
      marker.addListener("click", () => info.open({ anchor: marker, map }));
      bounds.extend(marker.getPosition() as google.maps.LatLng);
    });

    if (valid.length > 1) map.fitBounds(bounds);
  };

  return <div ref={mapRef} style={{ height: "100%", width: "100%" }} />;
};

const renderMapStatus = (status: Status) => {
  if (status === Status.LOADING) return <div className="h-full flex items-center justify-center text-gray-400">Loading map...</div>;
  if (status === Status.FAILURE) return <div className="h-full flex items-center justify-center text-red-500">Google map failed to load</div>;
  return <div className="h-full flex items-center justify-center text-gray-400">Initializing map...</div>;
};

export default function UserTimeline() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  const employee = state.employee || {};

  const [selectedEmployee] = useState(employee._id || "");
  const [employeeInfo] = useState(employee);
  const [startDate, setStartDate] = useState(moment().format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(moment().format("YYYY-MM-DD"));
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [totalDistanceKm, setTotalDistanceKm] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    if (!employee._id) {
      navigate('/employee-management');
    }
  }, [employee._id]);

  const fetchHistory = async () => {
    if (!selectedEmployee) return;
    try {
      setIsLoading(true);
      const startIso = moment(startDate).startOf('day').toISOString();
      const endIso = moment(endDate).endOf('day').toISOString();

      const response = await postData("/tracking/summary", {
        employeeId: selectedEmployee,
        startDate: startIso,
        endDate: endIso
      });
      const payload = response?.success ? response.data : null;
      setHistory(payload?.history || []);
      setTotalDistanceKm(Number(payload?.totalDistanceKm || 0));
      setLastUpdatedAt(payload?.lastUpdatedAt || null);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVisits = async () => {
    if (!selectedEmployee) return;
    try {
      setIsLoadingVisits(true);
      const startIso = moment(startDate).startOf('day').toISOString();
      const endIso = moment(endDate).endOf('day').toISOString();
      const response = await postData('/field-visits/list', {
        assignedToEmployeeId: selectedEmployee,
        startDate: startIso,
        endDate: endIso,
        page: 1,
        limit: 50,
      });
      const rows = response?.success ? response.data?.rows || [] : [];
      setVisits(rows);
    } catch (error) {
      console.error("Error fetching field visits:", error);
    } finally {
      setIsLoadingVisits(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchVisits();
  }, [selectedEmployee, startDate, endDate]);

  const handleLocationUpdate = useCallback((data: LocationUpdateEvent) => {
    if (data.employeeId !== selectedEmployee) return;

    const point = {
      _id: data._id || `ws-${data.createdAt}`,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address || '',
      createdAt: data.createdAt,
    };

    setHistory((prev) => {
      if (prev.some((p) => p._id === point._id)) return prev;
      const next = [...prev, point];
      setTotalDistanceKm(calcTotalDistanceKm(next));
      setLastUpdatedAt(point.createdAt);
      return next;
    });
  }, [selectedEmployee]);

  const handleVisitSaved = useCallback((data: VisitSavedEvent) => {
    if (data.employeeId !== selectedEmployee) return;
    const visit = data.visit as any;
    if (!visit?._id) return;
    setVisits((prev) => {
      const idx = prev.findIndex((v) => v._id === visit._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...visit };
        return next;
      }
      return [visit, ...prev];
    });
  }, [selectedEmployee]);

  useEffect(() => {
    if (!selectedEmployee || !isLiveMode) {
      trackingSocketService.disconnect();
      setSocketConnected(false);
      return;
    }

    trackingSocketService.connect();
    trackingSocketService.subscribe(selectedEmployee);
    setSocketConnected(trackingSocketService.isConnected());

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    trackingSocketService.onConnect(onConnect);
    trackingSocketService.onDisconnect(onDisconnect);

    trackingSocketService.onLocationUpdate(handleLocationUpdate);
    trackingSocketService.onVisitSaved(handleVisitSaved);

    return () => {
      trackingSocketService.offLocationUpdate(handleLocationUpdate);
      trackingSocketService.offVisitSaved(handleVisitSaved);
      trackingSocketService.offConnect(onConnect);
      trackingSocketService.offDisconnect(onDisconnect);
      trackingSocketService.unsubscribe(selectedEmployee);
    };
  }, [selectedEmployee, isLiveMode, handleLocationUpdate, handleVisitSaved]);

  // Fallback polling if WebSocket disconnects
  useEffect(() => {
    if (!isLiveMode || socketConnected) return;
    const id = setInterval(() => {
      fetchHistory();
      fetchVisits();
    }, 30000);
    return () => clearInterval(id);
  }, [isLiveMode, socketConnected, selectedEmployee, startDate, endDate]);

  return (
    <>
      <PageMeta title="User Timeline | Admin" description="Track user locations on Google Maps Timeline" />
      <PageBreadcrumb pageTitle={`${employeeInfo.fullName || 'Employee'}'s Timeline`} />

      <div className="space-y-6">
        <ComponentCard title="Employee Details & Filters">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Employee Info Display */}
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee Name</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{employeeInfo.fullName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{employeeInfo.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Number</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{employeeInfo.mobileNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Distance Covered</p>
                <p className="mt-1 text-sm font-bold text-emerald-600">{km(totalDistanceKm)} km</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Update</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {lastUpdatedAt ? moment(lastUpdatedAt).fromNow() : 'No update'}
                </p>
              </div>
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 px-3 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 px-3 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-700 text-sm"
                />
              </div>
              <button
                onClick={fetchHistory}
                className="h-10 px-4 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition text-sm font-medium"
              >
                {isLoading ? "Loading..." : "Refresh"}
              </button>
              <button
                onClick={() => setIsLiveMode((v) => !v)}
                className={`h-10 px-4 rounded-md transition text-sm font-medium ${
                  isLiveMode
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                {isLiveMode
                  ? socketConnected
                    ? 'Live ON (WebSocket)'
                    : 'Live ON (polling...)'
                  : 'Live OFF'}
              </button>
              <button
                onClick={() => navigate('/employee-management')}
                className="h-10 px-4 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 transition text-sm font-medium"
              >
                Back to List
              </button>
            </div>
          </div>
        </ComponentCard>

        {/* 50/50 Map and Timeline Section */}
        <div className="flex flex-col lg:flex-row gap-6 h-[760px]">
          {/* Map Section (50%) */}
          <div className="lg:w-1/2 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            {history.length > 0 ? (
              GOOGLE_MAPS_CONFIG.apiKey ? (
                <Wrapper
                  apiKey={GOOGLE_MAPS_CONFIG.apiKey}
                  libraries={GOOGLE_MAPS_CONFIG.libraries as ("places" | "geocoding" | "geometry" | "marker" | "drawing" | "visualization")[]}
                  render={renderMapStatus}
                >
                  <TrackingGoogleMap
                    key={`map-${history.length}-${history[history.length - 1]?._id || 'empty'}`}
                    points={history}
                  />
                </Wrapper>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-red-500 bg-red-50 dark:bg-red-900/20">
                  <p className="text-sm font-semibold">Missing Google Maps API key</p>
                  <p className="text-xs mt-1">Set VITE_GOOGLE_MAPS_API_KEY in admin .env</p>
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800">
                <p className="text-lg font-medium">Map View</p>
                <p className="text-sm">No data selected</p>
              </div>
            )}
          </div>

          {/* Timeline + Visits Section (50%) */}
          <div className="lg:w-1/2 flex flex-col gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 italic">Tracking Activity</h3>
                <span className="text-xs font-medium px-2 py-1 bg-brand-100 text-brand-700 rounded-full">
                  {history.length} Checkpoints
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {history.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

                    <div className="space-y-6">
                      {history.map((point) => (
                        <div key={point._id} className="relative pl-8">
                          <div className="absolute left-0 top-1.5 w-5 h-5 bg-white dark:bg-gray-900 border-2 border-brand-500 rounded-full z-10 flex items-center justify-center">
                            <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                          </div>

                          <div className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-800 transition-colors cursor-pointer group">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                                {moment(point.createdAt).format('hh:mm A')}
                              </span>
                              <span className="text-[10px] text-gray-400 italic">
                                {moment(point.createdAt).format('DD MMM YYYY')}
                              </span>
                            </div>

                            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 mb-2 group-hover:text-gray-900 dark:group-hover:text-white">
                              {point.address || 'Address not available'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 py-20">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm">No tracking activity found in this period</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 h-[300px] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 italic">Visit Details</h3>
                <span className="text-xs font-medium px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                  {isLoadingVisits ? 'Loading...' : `${visits.length} Visits`}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {visits.length > 0 ? (
                  <div className="space-y-3">
                    {visits.map((v: any) => (
                      <div key={v._id} className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{v.leadName}</div>
                            <div className="text-xs text-gray-500">{v.leadContact || 'No contact'} • {v.leadCompany || 'No company'}</div>
                          </div>
                          <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-brand-100 text-brand-700">
                            {v.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                          {v.remarks || 'No remarks'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">
                          {v.visitedAt ? moment(v.visitedAt).format('DD MMM YYYY, hh:mm A') : 'Not visited yet'}
                        </div>
                        {Array.isArray(v.shopPhotos) && v.shopPhotos.length > 0 && (
                          <div className="text-[11px] text-emerald-600 mt-1 font-semibold">
                            {v.shopPhotos.length} shop photo(s) uploaded
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    No visit details found in this period
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
