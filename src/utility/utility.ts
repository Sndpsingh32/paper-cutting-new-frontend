import axios, { AxiosResponse } from "axios";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Create an instance of axios
const api = axios.create({
  // baseURL: "http://172.20.10.5:7860/",
  // baseURL: "http://192.168.1.24:7860/",
  // baseURL: "http://10.63.249.230:7860/",
  // baseURL: "http://192.168.1.19:7860/",
  // baseURL: "https://api.jaintradelinks.in/",
  baseURL: "http://localhost:7860/",
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper to sanitize headers for browser (must be ISO-8859-1 compatible)
const sanitizeHeader = (val: any) => {
  if (!val) return "";
  // Remove non-ASCII characters that break browser's setRequestHeader
  return String(val).replace(/[^\x00-\x7F]/g, "");
};

// Helper to get device headers
const getDeviceHeaders = () => {
  const deviceId = localStorage.getItem("deviceId") || `web-${Math.random().toString(36).substr(2, 9)}`;
  if (!localStorage.getItem("deviceId")) localStorage.setItem("deviceId", deviceId);

  const locationInfo = JSON.parse(localStorage.getItem("currentLocation") || "{}");

  return {
    "X-Device-ID": sanitizeHeader(deviceId),
    "X-Device-Model": sanitizeHeader(navigator.userAgent.split(')')[0].split('(')[1] || "Browser"),
    "X-Device-Brand": sanitizeHeader(navigator.vendor || "Web"),
    "X-Device-OS-Version": sanitizeHeader(navigator.platform),
    "X-Device-Name": "Web Dashboard",
    "X-Device-RAM-Total": sanitizeHeader((navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : "N/A"),
    "X-Device-Processor": sanitizeHeader(navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} Cores` : "N/A"),
    "X-Device-Platform": "web",
    "X-Current-Latitude": sanitizeHeader(locationInfo.latitude),
    "X-Current-Longitude": sanitizeHeader(locationInfo.longitude),
    "X-Current-Address": sanitizeHeader(locationInfo.address),
    "X-Current-Country": sanitizeHeader(locationInfo.country),
    "X-Current-State": sanitizeHeader(locationInfo.state),
    "X-Current-City": sanitizeHeader(locationInfo.city),
    "X-Current-District": sanitizeHeader(locationInfo.district),
    "X-Current-Pincode": sanitizeHeader(locationInfo.pincode),
  };
};

// Add a request interceptor to dynamically set Authorization and Device headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("peparToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add device and location headers
    const deviceHeaders = getDeviceHeaders();
    Object.entries(deviceHeaders).forEach(([key, value]) => {
      if (value) config.headers[key] = value;
    });

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: unknown) => {
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "status" in error.response &&
      error.response.status === 403
    ) {
      toast.error("Session expired. Please login again.");
      localStorage.removeItem("peparToken");
      localStorage.removeItem("adminData");
      localStorage.removeItem("role");
      window.location.href = "/signin";
    }
    return Promise.reject(error);
  }
);

// Function to handle GET requests
export const getData = async (endpoint: string): Promise<any> => {
  try {
    const response: AxiosResponse = await api.get(endpoint);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

// Function to handle POST requests
export const postData = async (endpoint: string, data?: any): Promise<any> => {
  try {
    const response: AxiosResponse = await api.post(endpoint, data);
    return response.data;
  } catch (error: any) {
    console.error("Error posting data:", error);
    throw error;
  }
};

// Function to handle image file uploads
export const ImageFileUpload = async (
  ImageUrl: string,
  data: FormData
): Promise<any> => {
  try {
    const response: AxiosResponse = await api.post(ImageUrl, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error posting data:", error);
    throw error;
  }
};

// Function to validate image files
// Returns error message if validation fails, null if valid
export const validateImageFile = (file: File): string | null => {
  // Check if file exists
  if (!file) {
    return "Please select a file";
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return "File size should be less than 5MB";
  }

  // Check minimum file size (avoid empty files)
  if (file.size === 0) {
    return "Please select a valid file";
  }

  // Check file type
  const validImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (!validImageTypes.includes(file.type) && !file.type.startsWith("image/")) {
    return "Please select a valid image file (JPG, JPEG, PNG, GIF, WebP)";
  }

  return null; // Valid file
};

// Function to upload a single image file and return the URL
// Includes built-in validation for file type, size, and format
// Usage: const imageUrl = await uploadImageAndGetUrl(file, '/admin/upload-single');
export const uploadImageAndGetUrl = async (
  file: File,
  uploadEndpoint: string = "/users/upload"
): Promise<string> => {
  // Validate file type - check for common image formats
  const validImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!validImageTypes.includes(file.type) && !file.type.startsWith("image/")) {
    throw new Error(
      "Please select a valid image file (JPG, JPEG, PNG, GIF, WebP)"
    );
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    throw new Error("Image size should be less than 5MB");
  }

  // Validate minimum file size (avoid empty files)
  if (file.size === 0) {
    throw new Error("Please select a valid image file");
  }

  try {
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    const uploadResponse = await ImageFileUpload(
      uploadEndpoint,
      uploadFormData
    );

    if (uploadResponse.success) {
      return uploadResponse.data.url;
    } else {
      throw new Error(uploadResponse.message || "Failed to upload image");
    }
  } catch (error: unknown) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

// Function to handle PUT requests
export const putData = async (endpoint: string, data?: any): Promise<any> => {
  try {
    const response: AxiosResponse = await api.put(endpoint, data);
    return response.data;
  } catch (error: any) {
    console.error("Error updating data:", error);
    throw error;
  }
};

export const putFormData = async (
  endpoint: string,
  data: FormData
): Promise<any> => {
  try {
    const response: AxiosResponse = await api.put(endpoint, data);
    return response.data;
  } catch (error: any) {
    console.error("Error updating data:", error);
    throw error;
  }
};

// Function to handle DELETE requests
export const deleteData = async (
  endpoint: string,
  data?: Record<string, unknown>
): Promise<any> => {
  try {
    const response: AxiosResponse = await api.delete(endpoint, { data });
    return response.data;
  } catch (error: any) {
    console.error("Error deleting data:", error);
    throw error;
  }
};

// Common delete function with confirmation dialog

// Example: deleteWithConfirmation("Banner", "/banner/delete", { bannerId: banner._id }, () => refreshBanners(), "Banner deleted successfully!")

export const deleteWithConfirmation = async (
  itemName: string,
  apiEndpoint: string,
  payload: Record<string, unknown>,
  onSuccess?: () => void,
  customSuccessMessage?: string
): Promise<boolean> => {
  const result = await Swal.fire({
    title: "Are you sure?",
    text: `You want to delete "${itemName}"?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#E31B23",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
    customClass: {
      popup: "dark:bg-gray-800 dark:text-white",
      title: "dark:text-white",
      htmlContainer: "dark:text-gray-300",
      confirmButton: "dark:bg-[#E31B23] dark:hover:bg-[#c6161f]",
      cancelButton: "dark:bg-gray-600 dark:hover:bg-gray-700",
    },
  });

  if (!result.isConfirmed) {
    return false;
  }

  try {
    // Show loading state
    Swal.fire({
      title: "Deleting...",
      text: "Please wait while we delete the item.",
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      },
      customClass: {
        popup: "dark:bg-gray-800 dark:text-white",
        title: "dark:text-white",
        htmlContainer: "dark:text-gray-300",
      },
    });

    await deleteData(apiEndpoint, payload);

    // Close loading and show success
    Swal.fire({
      title: "Deleted!",
      text:
        customSuccessMessage || `"${itemName}" has been deleted successfully.`,
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
      customClass: {
        popup: "dark:bg-gray-800 dark:text-white",
        title: "dark:text-white",
        htmlContainer: "dark:text-gray-300",
      },
    });

    // Call success callback
    if (onSuccess) {
      onSuccess();
    }

    return true;
  } catch (error: unknown) {
    console.error("Error deleting item:", error);
    Swal.fire({
      title: "Error!",
      text: "Failed to delete the item. Please try again.",
      icon: "error",
      confirmButtonColor: "#E31B23",
      customClass: {
        popup: "dark:bg-gray-800 dark:text-white",
        title: "dark:text-white",
        htmlContainer: "dark:text-gray-300",
        confirmButton: "dark:bg-[#E31B23] dark:hover:bg-[#c6161f]",
      },
    });
    return false;
  }
};
export const deleteWithConfirmationpost = async (
  itemName: string,
  apiEndpoint: string,
  payload: Record<string, unknown>,
  onSuccess?: () => void,
  customSuccessMessage?: string
): Promise<boolean> => {
  const result = await Swal.fire({
    title: "Are you sure?",
    text: `You want to delete "${itemName}"?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#E31B23",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
    customClass: {
      popup: "dark:bg-gray-800 dark:text-white",
      title: "dark:text-white",
      htmlContainer: "dark:text-gray-300",
      confirmButton: "dark:bg-[#E31B23] dark:hover:bg-[#c6161f]",
      cancelButton: "dark:bg-gray-600 dark:hover:bg-gray-700",
    },
  });

  if (!result.isConfirmed) {
    return false;
  }

  try {
    // Show loading state
    Swal.fire({
      title: "Deleting...",
      text: "Please wait while we delete the item.",
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      },
      customClass: {
        popup: "dark:bg-gray-800 dark:text-white",
        title: "dark:text-white",
        htmlContainer: "dark:text-gray-300",
      },
    });

    await postData(apiEndpoint, payload);

    // Close loading and show success
    Swal.fire({
      title: "Deleted!",
      text:
        customSuccessMessage || `"${itemName}" has been deleted successfully.`,
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
      customClass: {
        popup: "dark:bg-gray-800 dark:text-white",
        title: "dark:text-white",
        htmlContainer: "dark:text-gray-300",
      },
    });

    // Call success callback
    if (onSuccess) {
      onSuccess();
    }

    return true;
  } catch (error: unknown) {
    console.error("Error deleting item:", error);
    Swal.fire({
      title: "Error!",
      text: "Failed to delete the item. Please try again.",
      icon: "error",
      confirmButtonColor: "#E31B23",
      customClass: {
        popup: "dark:bg-gray-800 dark:text-white",
        title: "dark:text-white",
        htmlContainer: "dark:text-gray-300",
        confirmButton: "dark:bg-[#E31B23] dark:hover:bg-[#c6161f]",
      },
    });
    return false;
  }
};

// Common verify function with confirmation dialog
export const verifyWithConfirmation = async (
  itemName: string,
  apiEndpoint: string,
  payload: Record<string, unknown>,
  onSuccess?: () => void,
  customSuccessMessage?: string
): Promise<boolean> => {
  const result = await Swal.fire({
    title: "Verify Service?",
    text: `Are you sure you want to verify "${itemName}"? This action confirms the service meets all quality standards.`,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#0084C1",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Yes, Verify",
    cancelButtonText: "Cancel",
    customClass: {
      popup: "dark:bg-gray-800 dark:text-white",
      title: "dark:text-white",
      htmlContainer: "dark:text-gray-300",
      confirmButton: "dark:bg-[#0084C1] dark:hover:bg-[#0071a3]",
      cancelButton: "dark:bg-gray-600 dark:hover:bg-gray-700",
    },
  });

  if (!result.isConfirmed) {
    return false;
  }

  try {
    // Show loading state
    Swal.fire({
      title: "Verifying...",
      text: "Please wait while we verify the item.",
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      },
      customClass: {
        popup: "dark:bg-gray-800 dark:text-white",
        title: "dark:text-white",
        htmlContainer: "dark:text-gray-300",
      },
    });

    await postData(apiEndpoint, payload);

    // Close loading and show success
    Swal.fire({
      title: "Verified!",
      text:
        customSuccessMessage || `"${itemName}" has been verified successfully.`,
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
      customClass: {
        popup: "dark:bg-gray-800 dark:text-white",
        title: "dark:text-white",
        htmlContainer: "dark:text-gray-300",
      },
    });

    // Call success callback
    if (onSuccess) {
      onSuccess();
    }

    return true;
  } catch (error: unknown) {
    console.error("Error verifying item:", error);
    Swal.fire({
      title: "Error!",
      text: "Failed to verify the item. Please try again.",
      icon: "error",
      confirmButtonColor: "#E31B23",
      customClass: {
        popup: "dark:bg-gray-800 dark:text-white",
        title: "dark:text-white",
        htmlContainer: "dark:text-gray-300",
        confirmButton: "dark:bg-[#E31B23] dark:hover:bg-[#c6161f]",
      },
    });
    return false;
  }
};
// Function to format date to YYYY-MM-DD in local time
export const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * UI/unit helper only (display/conversion). Not business inventory ownership.
 * Converts any value to Centimeters
 */
export const toCm = (val: number | string, unit: string): number => {
  const num = Number(val);
  if (isNaN(num)) return 0;
  const u = (unit || 'cm').toLowerCase();
  switch (u) {
    case 'mm': return num / 10;
    case 'inch': return num * 2.54;
    case 'cm': return num;
    default: return num;
  }
}

/**
 * UI/unit helper only (display/conversion). Not business inventory ownership.
 * Converts a value from one unit to another
 */
export const convertUnit = (val: number | string, fromUnit: string, toUnit: string): number => {
  const cm = toCm(val, fromUnit || 'cm');
  const u = (toUnit || 'cm').toLowerCase();
  switch (u) {
    case 'mm': return cm * 10;
    case 'inch': return cm / 2.54;
    default: return cm; // 'cm'
  }
}

/**
 * UI/unit helper only (display/conversion). Not business inventory ownership.
 * Converts any value to Meters
 */
export const toMeter = (val: number | string, unit: string): number => {
  const num = Number(val);
  if (isNaN(num)) return 0;
  const u = (unit || 'cm').toLowerCase();
  switch (u) {
    case 'mm': return num * 0.001;
    case 'inch': return num * 0.0254;
    case 'cm': return num * 0.01;
    default: return num * 0.01;
  }
}
