import { BrowserRouter as Router, Routes, Route } from "react-router"; // UI components updated to .tsx
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Calendar from "./pages/Calendar";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ProductManagement from "./pages/ProductManagement/ProductManagementList/ProductManagementList";
import ProductAdd from "./pages/ProductManagement/AddandUpdateProduct/AddandUpdateProduct";
import AddOnProductList from "./pages/ProductManagement/AddOnProductManagement/AddOnProductList";
import AddAndUpdateAddOn from "./pages/ProductManagement/AddOnProductManagement/AddAndUpdateAddOn";
import UserManagementList from "./pages/UserManagement/UserManagementList";
import UserRegistration from "./pages/UserManagement/UserRegistration";
import EmployeeList from "./pages/EmployeeManagement/EmployeeList";
import EmployeeRegistration from "./pages/EmployeeManagement/EmployeeRegistration";
import VendorList from "./pages/VendorManagement/VendorList";
import VendorRegistration from "./pages/VendorManagement/VendorRegistration";
import NotificationList from "./pages/NotificationManagement/NotificationList";
import NotificationCreate from "./pages/NotificationManagement/NotificationCreate";
import OrderManagementList from "./pages/OrderManagement/OrderManagementList";
import OrderDetails from "./pages/OrderManagement/OrderDetails";
import ContactUsManagement from "./pages/ContactUsManagement/ContactUsManagement";
import ContentManagementList from "./pages/ContentManagement/ContentManagementList/ContentManagementList";
import AddandUpdateContent from "./pages/ContentManagement/AddandUpdateContent/AddandUpdateContent";
import WalletManagement from "./pages/WalletManagement/WalletManagement";
import PermissionManagement from "./pages/PermissionManagement/PermissionManagement";
import PermissionCreate from "./pages/PermissionManagement/PermissionCreate";
import ActivityLogList from "./pages/ActivityLog/ActivityLogList";
import ActivityLogDetails from "./pages/ActivityLog/ActivityLogDetails";
import GetServiceManagement from "./pages/ServiceManagement/GetServiceManagement";
import AddandUpdateServiceManagement from "./pages/ServiceManagement/AddandUpdateServiceManagement";
import BiddingManagement from "./pages/BiddingManagement/BiddingManagement";
import ReelManagementList from "./pages/ReelManagement/ReelManagementList/ReelManagementList";
import AddandUpdateReel from "./pages/ReelManagement/AddandUpdateReel/AddandUpdateReel";
import SheetManagementList from "./pages/SheetManagement/SheetManagementList/SheetManagementList";
import AddandUpdateSheet from "./pages/SheetManagement/AddandUpdateSheet/AddandUpdateSheet";
import CompanyList from "./pages/CompanyManagement/CompanyList";
import BuyerList from "./pages/CompanyManagement/BuyerList";
import SellerList from "./pages/CompanyManagement/SellerList";
import CompanyRegistration from "./pages/CompanyManagement/CompanyRegistration";
// import Dummy from "./pages/dummy/dumyy";
import InventorySystem from "./pages/Inventory/InventorySystem";
import NewSale from "./pages/Inventory/NewSale";
import ConsolidatedSale from "./pages/Inventory/ConsolidatedSale";
import PaymentDues from "./pages/Inventory/PaymentDues";
import ZeroWasteOptimizer from "./pages/Inventory/ZeroWasteOptimizer";
import InventoryAnalytics from "./pages/InventoryAnalytics/InventoryAnalytics";
import UserTimeline from "./pages/TrackingManagement/UserTimeline";
import LeadManagementList from "./pages/LeadManagement/LeadManagementList";
import AssignLead from "./pages/LeadManagement/AssignLead";

// @ts-ignore
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import { ProfileProvider } from "./context/ProfileContext";
import { useEffect } from "react";
import axios from "axios";

export default function App() {
  useEffect(() => {
    const fetchLocation = async () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Free Nominatim Reverse Geocoding API
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );

          if (response.data && response.data.address) {
            const addr = response.data.address;
            const locationData = {
              latitude: latitude.toString(),
              longitude: longitude.toString(),
              address: response.data.display_name,
              country: addr.country || "",
              state: addr.state || addr.region || "",
              city: addr.city || addr.town || addr.village || addr.suburb || "",
              district: addr.state_district || addr.county || "",
              pincode: addr.postcode || "",
            };
            localStorage.setItem("currentLocation", JSON.stringify(locationData));
          }
        } catch (error) {
          console.error("Error fetching detailed address:", error);
          // Fallback if reverse geocoding fails
          localStorage.setItem("currentLocation", JSON.stringify({
            latitude: latitude.toString(),
            longitude: longitude.toString()
          }));
        }
      }, (error) => {
        console.warn("Geolocation permission denied or error:", error);
      });
    };

    fetchLocation();
  }, []);

  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Protected Routes - Require Authentication */}
          <Route element={<ProtectedRoute />}>
            <Route element={
              <ProfileProvider>
                <AppLayout />
              </ProfileProvider>
            }>
              {/* --- Core & Dashboard --- */}
              <Route index path="/" element={<Home />} />
              <Route path="/profile" element={<UserProfiles />} />
              <Route path="/calendar" element={<Calendar />} />

              {/* --- Business & Partners --- */}
              <Route path="/company-management" element={<CompanyList />} />
              <Route path="/buyer-list" element={<BuyerList />} />
              <Route path="/user-list" element={<SellerList />} />
              <Route path="/company-registration" element={<CompanyRegistration />} />
              <Route path="/vendor-management" element={<VendorList />} />
              <Route path="/vendor-registration" element={<VendorRegistration />} />
              <Route path="/employee-management" element={<EmployeeList />} />
              <Route path="/employee-registration" element={<EmployeeRegistration />} />
              <Route path="/user-timeline" element={<UserTimeline />} />
              <Route path="/lead-management" element={<LeadManagementList />} />
              <Route path="/assign-lead" element={<AssignLead />} />
              <Route path="/user-management" element={<UserManagementList />} />
              <Route path="/user-registration" element={<UserRegistration />} />

              {/* --- Stock & Production --- */}
              <Route path="/reel-management" element={<ReelManagementList />} />
              <Route path="/reel-management/add" element={<AddandUpdateReel />} />
              <Route path="/sheet-management" element={<SheetManagementList />} />
              <Route path="/sheet-management/add" element={<AddandUpdateSheet />} />

              {/* --- Inventory Intelligence --- */}
              <Route path="/inventory-intelligence" element={<InventorySystem />} />
              <Route path="/new-sale" element={<NewSale />} />
              <Route path="/consolidated-sale" element={<ConsolidatedSale />} />
              <Route path="/payment-dues" element={<PaymentDues />} />
              <Route path="/zero-waste-optimizer" element={<ZeroWasteOptimizer />} />
              <Route path="/inventory-analytics" element={<InventoryAnalytics />} />

              {/* --- Product & Category --- */}
              <Route path="/product-management" element={<ProductManagement />} />
              <Route path="/product-management/add" element={<ProductAdd />} />
              <Route path="/product-management/add-ons" element={<AddOnProductList />} />
              <Route path="/product-management/add-ons/add" element={<AddAndUpdateAddOn />} />
              <Route path="/product-management/add-ons/edit" element={<AddAndUpdateAddOn />} />

              {/* --- Orders & Bidding --- */}
              <Route path="/order-management" element={<OrderManagementList />} />
              <Route path="/order-management/details" element={<OrderDetails />} />
              <Route path="/bidding-management" element={<BiddingManagement />} />

              {/* --- Marketing & Content --- */}
              <Route path="/content-management" element={<ContentManagementList />} />
              <Route path="/content-management/add" element={<AddandUpdateContent />} />
              <Route path="/notification-management" element={<NotificationList />} />
              <Route path="/notification-create" element={<NotificationCreate />} />

              {/* --- Support & Wallet --- */}
              <Route path="/contact-us-management" element={<ContactUsManagement />} />
              <Route path="/wallet-management" element={<WalletManagement />} />

              {/* --- System & Settings --- */}
              <Route path="/permission-management" element={<PermissionManagement />} />
              <Route path="/permission-create" element={<PermissionCreate />} />
              <Route path="/activity-logs" element={<ActivityLogList />} />
              <Route path="/activity-logs/:id" element={<ActivityLogDetails />} />
              <Route path="/service-management" element={<GetServiceManagement />} />
              <Route path="/service-management/add" element={<AddandUpdateServiceManagement />} />
            </Route>
          </Route>

          {/* Public Routes - Redirect to dashboard if already authenticated */}
          <Route element={<PublicRoute />}>
            <Route path="/signin" element={<SignIn />} />
            {/* <Route path="/signup" element={<SignUp />} /> */}
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}
