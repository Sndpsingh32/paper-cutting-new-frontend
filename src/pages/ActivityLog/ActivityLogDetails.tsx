import { useState, useEffect } from "react";
import { useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import { postData } from "../../utility/utility";
import moment from "moment";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function ActivityLogDetails() {
  const { id } = useParams();
  const [log, setLog] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        setErrorMsg(null);
        console.log("Fetching activity details for ID:", id);
        const response = await postData("/activity-log/details", { id });
        console.log("Activity details response:", response);
        
        if (response.success) {
          setLog(response.data);
        } else {
          setErrorMsg(response.message || "Activity log not found.");
        }
      } catch (error: any) {
        console.error("Error fetching activity details:", error);
        setErrorMsg(error.message || "Failed to load activity details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (isLoading) return (
    <div className="p-20 text-center flex flex-col items-center justify-center">
       <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
       <p className="font-bold text-gray-500">Loading activity details...</p>
    </div>
  );
  
  if (errorMsg || !log) return (
    <div className="p-20 text-center flex flex-col items-center justify-center">
       <div className="bg-red-50 text-red-600 p-8 rounded-3xl border-2 border-red-100 max-w-md w-full shadow-xl shadow-red-500/5">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-600">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
             </svg>
          </div>
          <h3 className="text-xl font-black uppercase mb-2">Not Found</h3>
          <p className="text-sm font-bold text-red-500/70 mb-6">{errorMsg || "This activity log record could not be found."}</p>
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200"
          >
            Go Back
          </button>
       </div>
    </div>
  );

  const lat = parseFloat(log.locationInfo?.latitude);
  const lng = parseFloat(log.locationInfo?.longitude);
  const hasValidCoords = !isNaN(lat) && !isNaN(lng);

  return (
    <>
      <PageMeta title="Log Details | Admin" description="Activity Log Detailed View" />
      <PageBreadcrumb pageTitle="Activity Log Details" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info Cards */}
        <div className="lg:col-span-2 space-y-6">
          <ComponentCard title="Log Overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold">Action</p>
                <p className="text-lg font-semibold text-brand-600">{log.action}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold">Status</p>
                <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                  log.statusCode >= 200 && log.statusCode < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  HTTP {log.statusCode}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold">API Endpoint</p>
                <code className="text-sm bg-gray-50 px-2 py-1 rounded block mt-1">{log.method} {log.endpoint}</code>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold">Timestamp</p>
                <p className="text-sm">{moment(log.createdAt).format("DD MMMM YYYY, hh:mm:ss A")}</p>
              </div>
            </div>
          </ComponentCard>

          <ComponentCard title="Employee Information">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-xl uppercase">
                {log.employeeId?.fullName?.charAt(0) || "G"}
              </div>
              <div>
                <h4 className="font-bold text-gray-800">{log.employeeId?.fullName || "Guest User"}</h4>
                <p className="text-sm text-gray-500">{log.employeeId?.email || "No email"}</p>
                <div className="flex gap-3 mt-1">
                   <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full font-medium text-gray-600 uppercase italic">
                      {log.employeeId?.role || "Visitor"}
                   </span>
                   {log.employeeId?.mobileNumber && <span className="text-xs text-gray-400 font-medium">Mob: {log.employeeId.mobileNumber}</span>}
                </div>
              </div>
            </div>
          </ComponentCard>

          <ComponentCard title="Request Payload">
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs max-h-[400px]">
              {JSON.stringify(log.payload, null, 2) || "No payload data"}
            </pre>
          </ComponentCard>
        </div>

        {/* Right Column: Device & Location */}
        <div className="space-y-6">
          <ComponentCard title="Device Details">
            <div className="space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500 text-sm">OS / Platform</span>
                <span className="font-bold text-sm uppercase">{log.deviceInfo?.platform} ({log.deviceInfo?.osVersion})</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500 text-sm">Model</span>
                <span className="font-bold text-sm">{log.deviceInfo?.brand} {log.deviceInfo?.model}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500 text-sm">Processor</span>
                <span className="font-bold text-sm text-right max-w-[150px] truncate" title={log.deviceInfo?.processor}>{log.deviceInfo?.processor}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500 text-sm">RAM</span>
                <span className="font-bold text-sm text-right">{log.deviceInfo?.ramTotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Device Name</span>
                <span className="font-bold text-sm">{log.deviceInfo?.deviceName}</span>
              </div>
            </div>
          </ComponentCard>

          <ComponentCard title="Location Map">
             {hasValidCoords ? (
               <div className="space-y-4">
                 <div className="h-[250px] w-full rounded-lg overflow-hidden border">
                    <MapContainer center={[lat, lng]} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                      />
                      <Marker position={[lat, lng]}>
                        <Popup>
                          {log.employeeId?.fullName || "Activity Location"}<br />
                          {log.locationInfo?.city}
                        </Popup>
                      </Marker>
                    </MapContainer>
                 </div>
                 <div className="text-sm">
                    <p className="font-bold text-gray-800">{log.locationInfo?.city}, {log.locationInfo?.state}</p>
                    <p className="text-gray-500 text-xs mt-1">{log.locationInfo?.address}</p>
                    {log.locationInfo?.pincode && <p className="text-gray-400 text-xs font-medium mt-1">PIN: {log.locationInfo.pincode}</p>}
                 </div>
               </div>
             ) : (
               <div className="h-[250px] bg-gray-50 flex items-center justify-center text-gray-400 italic text-sm border rounded">
                  Map coordinates not available
               </div>
             )}
          </ComponentCard>
        </div>
      </div>
    </>
  );
}
