import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import { postData, uploadImageAndGetUrl } from "../../utility/utility";
import { toast } from "react-toastify";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { MapPicker } from "../../components/map/MapPicker";
import LocationPicker from "../../components/location/LocationPicker";
import Select from "../../components/form/Select";
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";
import Switch from "../../components/form/switch/Switch";

// Types for the service form
interface ServiceLocation {
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  radius: number;
}

interface MapLocation {
  lat: number;
  lng: number;
  city: string;
  area: string;
  placeId: string;
  fullAddress?: string;
  radiusMeters?: number;
}

interface ServiceFormData {
  name: string;
  shortDescription: string;
  description: string;
  images: string[];
  location: ServiceLocation;
  categoryId: string;
  subcategoryId: string;
  basePrice: number;
  discountPrice: number;
  duration: number;
  tags: string[];
  isActive: boolean;
}

interface Category {
  _id: string;
  name: string;
}

interface Subcategory {
  _id: string;
  name: string;
  categoryId: string;
}

export default function AddandUpdateServiceManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = location.state?.service ? true : false;
  const editingService = location.state?.service;

  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    shortDescription: "",
    description: "",
    images: [],
    location: {
      lat: 28.6139,
      lng: 77.2090,
      address: "",
      city: "",
      state: "",
      country: "India",
      pincode: "",
      radius: 5,
    },
    categoryId: "",
    subcategoryId: "",
    basePrice: 0,
    discountPrice: 0,
    duration: 60,
    tags: [],
    isActive: true,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tagInput, setTagInput] = useState("");

   useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesRes = await postData("/category/list", {});
        
        if (categoriesRes.success) {
          setCategories(categoriesRes.data.categories || []);
        }
        if (formData.categoryId) {
          const subcategoriesRes = await postData("/subcategory/list", {
            categoryId: formData.categoryId,
            page: 1,
            limit: 100,
            isActive: true
          });
          
          if (subcategoriesRes.success) {
            setSubcategories(subcategoriesRes.data.subcategories || []);
          }
        } else {
          setSubcategories([]);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load categories");
      }
    };

    fetchCategories();
  }, []);

 
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (formData.categoryId) {
        try {
          const response = await postData("/subcategory/list", {
            categoryId: formData.categoryId,
            page: 1,
            limit: 100,
            isActive: true
          });
          
          if (response.success) {
            setSubcategories(response.data.subcategories || []);
          }
        } catch (error) {
          console.error("Error fetching subcategories:", error);
          toast.error("Failed to load subcategories");
        }
      } else {
        setSubcategories([]);
        setFormData(prev => ({ ...prev, subcategoryId: "" }));
      }
    };

    fetchSubcategories();
  }, [formData.categoryId]);

  useEffect(() => {
    if (isEditing && editingService?.categoryId && formData.categoryId) {
      const fetchSubcategoriesForEdit = async () => {
        try {
          const response = await postData("/subcategory/list", {
            categoryId: formData.categoryId,
            page: 1,
            limit: 100,
            isActive: true
          });
          
          if (response.success) {
            setSubcategories(response.data.subcategories || []);
          }
        } catch (error) {
          console.error("Error fetching subcategories for edit:", error);
        }
      };

      fetchSubcategoriesForEdit();
    }
  }, [isEditing, editingService?.categoryId, formData.categoryId]);

  useEffect(() => {
    if (isEditing && editingService) {
      setFormData({
        name: editingService.name || "",
        shortDescription: editingService.shortDescription || "",
        description: editingService.description || "",
        images: editingService.images || [],
        location: editingService.location || {
          lat: 28.6139,
          lng: 77.2090,
          address: "",
          city: "",
          state: "",
          country: "India",
          pincode: "",
          radius: 5,
        },
        categoryId: editingService.categoryId?._id || editingService.categoryId || "",
        subcategoryId: editingService.subcategoryId?._id || editingService.subcategoryId || "",
        basePrice: editingService.basePrice || 0,
        discountPrice: editingService.discountPrice || 0,
        duration: editingService.duration || 60,
        tags: editingService.tags || [],
        isActive: editingService.isActive ?? true,
      });
    }
  }, [isEditing, editingService]);

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isActive: checked,
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === "number") {
      // Prevent negative values for pricing fields
      if ((name === "basePrice" || name === "discountPrice") && Number(value) < 0) {
        return; // Don't update if negative
      }
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? 0 : Number(value), // Convert empty string to 0
      }));
    } else if (name.includes("location.")) {
      const locationField = name.split(".")[1];
      // Prevent negative values for radius
      if (locationField === "radius" && Number(value) < 0) {
        return; // Don't update if negative
      }
      setFormData((prev) => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: locationField === "lat" || locationField === "lng" || locationField === "radius"
            ? (value === '' ? 0 : Number(value))
            : value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleDescriptionChange = (_: any, editor: any) => {
    const data = editor.getData();
    setFormData((prev) => ({
      ...prev,
      description: data,
    }));
  };

  const handleLocationPickerChange = (location: any) => {
    if (location) {
      setFormData((prev) => ({
        ...prev,
        location: {
          ...prev.location,
          lat: location.lat,
          lng: location.lng,
          address: location.address || "",
          city: location.city || "",
          state: location.state || "",
          country: location.country || "",
          pincode: location.pincode || "",
        },
      }));
    }
  };

  const handleMapLocationSelect = (mapLocation: MapLocation) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        lat: mapLocation.lat,
        lng: mapLocation.lng,
        address: mapLocation.fullAddress || "",
        city: mapLocation.city || "",
        state: mapLocation.area || "",
        country: "India", // Default country
        pincode: "",
        radius: mapLocation.radiusMeters ? mapLocation.radiusMeters / 1000 : prev.location.radius, // Convert meters to km
      },
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    try {
      const uploadPromises = files.map((file) => uploadImageAndGetUrl(file));
      const uploadedUrls = await Promise.all(uploadPromises);
      
      setFormData((prev: ServiceFormData) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
      
      toast.success("Images uploaded successfully");
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images");
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = isEditing ? "/service/update" : "/service/create";
      
      const payload = {
        name: formData.name,
        shortDescription: formData.shortDescription,
        description: formData.description,
        images: formData.images,
        location: {
          lat: formData.location.lat,
          lng: formData.location.lng,
          address: formData.location.address,
          city: formData.location.city,
          state: formData.location.state,
          country: formData.location.country,
          pincode: formData.location.pincode || "110001", // Default pincode if empty
        },
        categoryId: formData.categoryId,
        subcategoryId: formData.subcategoryId,
        basePrice: formData.basePrice,
        discountPrice: formData.discountPrice,
        duration: formData.duration,
        tags: formData.tags,
        isActive: formData.isActive,
        ...(isEditing && { serviceId: editingService?._id })
      };

      const response = await postData(endpoint, payload);

      if (response.success) {
        toast.success(
          isEditing ? "Service updated successfully!" : "Service created successfully!"
        );
        navigate("/service-management");
      } else {
        toast.error(response.message || "Failed to save service");
      }
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error("Failed to save service");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title={`${isEditing ? "Edit" : "Add"} Service | Paper Cutting Service Dashboard`}
        description={`${isEditing ? "Edit" : "Add new"} service for Paper Cutting platform`}
      />
      <PageBreadcrumb pageTitle={`${isEditing ? "Edit" : "Add"} Service`} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {isEditing ? "Edit Service" : "Add New Service"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEditing 
                ? "Update the service details and information"
                : "Fill in the details to create a new service"
              }
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/service-management")}
            size="sm"
          >
            Back to Services
          </Button>
        </div>

        <ComponentCard title={isEditing ? "Edit Service" : "Add New Service"}>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Category and Subcategory */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                Category & Classification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <Select
                    options={categories.map((category) => ({
                      value: category._id,
                      label: category.name,
                    }))}
                    placeholder="Select Category"
                    value={formData.categoryId}
                    onChange={(value) => handleInputChange({ target: { name: 'categoryId', value } } as any)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Subcategory *
                  </label>
                  <Select
                    options={subcategories.map((subcategory: Subcategory) => ({
                      value: subcategory._id,
                      label: subcategory.name,
                    }))}
                    placeholder="Select Subcategory"
                    value={formData.subcategoryId}
                    onChange={(value) => handleInputChange({ target: { name: 'subcategoryId', value } } as any)}
                    className={!formData.categoryId ? 'opacity-50 cursor-not-allowed' : ''}
                  />
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Service Name *
                  </label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter service name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Short Description *
                  </label>
                  <TextArea
                    value={formData.shortDescription}
                    onChange={(value) => handleInputChange({ target: { name: 'shortDescription', value } } as any)}
                    rows={3}
                    placeholder="Brief description of the service"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Pricing & Duration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Base Price (₹) *
                  </label>
                  <Input
                    type="number"
                    name="basePrice"
                    value={formData.basePrice === 0 ? '' : formData.basePrice}
                    onChange={handleInputChange}
                    step={0.01}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Discount Price (₹)
                  </label>
                  <Input
                    type="number"
                    name="discountPrice"
                    value={formData.discountPrice === 0 ? '' : formData.discountPrice}
                    onChange={handleInputChange}
                    step={0.01}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Duration (minutes) *
                  </label>
                  <Input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    placeholder="60"
                  />
                </div>
              </div>
            </div>

   {/* Description with CKEditor */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Detailed Description
              </h3>
              <div className="border border-gray-300 rounded-lg dark:border-gray-600" style={{ minHeight: '250px' }}>
                <style>{`
                  .ck-editor__editable {
                    min-height: 200px !important;
                  }
                  .ck-content {
                    min-height: 200px !important;
                  }
                `}</style>
                <CKEditor
                  editor={ClassicEditor as any}
                  data={formData.description}
                  onChange={handleDescriptionChange}
                  config={{
                    toolbar: [
                      "heading",
                      "|",
                      "bold",
                      "italic",
                      "link",
                      "bulletedList",
                      "numberedList",
                      "blockQuote",
                      "insertTable",
                      "|",
                      "undo",
                      "redo",
                    ],
                    placeholder: "Provide detailed description of the service...",
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Provide detailed description of the service, including features, benefits, and what customers can expect
              </p>
            </div>
       

            {/* Tags */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                Service Tags
              </h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag and press Enter"
                    className="flex-1"
                  />
                </div>
                <Button type="button" onClick={handleAddTag} size="sm" className="px-6">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Tag
                </Button>
              </div>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-white/80 hover:text-white transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Images */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                Service Images
              </h3>
              
              {/* Image Upload Area */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Click to upload images
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      PNG, JPG, GIF up to 10MB each
                    </div>
                  </div>
                </label>
              </div>
              

              {/* Image Gallery */}
              {formData.images.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    Uploaded Images ({formData.images.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                          <img
                            src={image}
                            alt={`Service image ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 shadow-lg"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <p className="text-white text-xs truncate">Image {index + 1}</p>
                        </div>
                      </div>
                    ))}
                    {/* Add More Images Button */}
                    <div className="relative group">
                      <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id={`add-more-images-${formData.images.length}`}
                        />
                        <label htmlFor={`add-more-images-${formData.images.length}`} className="cursor-pointer">
                          <div className="flex flex-col items-center">
                            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Add More</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            

            {/* Enhanced Location with MapPicker and LocationPicker */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                Service Location & Coverage Area
              </h3>
              
              {/* LocationPicker for basic location search */}
              <LocationPicker
                value={{
                  lat: formData.location.lat,
                  lng: formData.location.lng,
                  address: formData.location.address,
                  city: formData.location.city,
                  state: formData.location.state,
                  country: formData.location.country,
                  pincode: formData.location.pincode
                }}
                onChange={handleLocationPickerChange}
                label="Search Location"
                placeholder="Search for service location..."
              />

              {/* MapPicker for visual location selection and radius */}
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Visual Location Selection & Service Radius
                </label>
                <MapPicker
                  onLocationSelect={handleMapLocationSelect}
                  initialCenter={{
                    lat: formData.location.lat,
                    lng: formData.location.lng
                  }}
                  defaultRadiusMeters={formData.location.radius * 1000} // Convert km to meters
                  mode="single"
                  showSearch={false} // Hide search since we have LocationPicker above
                />
              </div>

              {/* Manual override fields for fine-tuning */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Service Radius (km)
                  </label>
                  <Input
                    type="number"
                    name="location.radius"
                    value={formData.location.radius}
                    onChange={handleInputChange}
                    min="0.5"
                    max="50"
                    step={0.5}
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Pincode
                  </label>
                  <Input
                    type="text"
                    name="location.pincode"
                    value={formData.location.pincode}
                    onChange={handleInputChange}
                    placeholder="Pincode"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Country
                  </label>
                  <Input
                    type="text"
                    name="location.country"
                    value={formData.location.country}
                    onChange={handleInputChange}
                    placeholder="Country"
                  />
                </div>
              </div>

              {/* Current location display */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Current Location Details</h5>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div><strong>Address:</strong> {formData.location.address || "Not set"}</div>
                    <div><strong>City:</strong> {formData.location.city || "Not set"}</div>
                    <div><strong>State:</strong> {formData.location.state || "Not set"}</div>
                    <div><strong>Country:</strong> {formData.location.country || "Not set"}</div>
                    <div><strong>Pincode:</strong> {formData.location.pincode || "Not set"}</div>
                    <div><strong>Service Radius:</strong> {formData.location.radius} km</div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    <strong>Coordinates:</strong> {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}
                  </div>
                </div>
              </div>
            </div>

         

            {/* Status */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Service Status
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active Service
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enable this service to make it visible to customers
                  </p>
                </div>
                <Switch
                  label=""
                  checked={formData.isActive}
                  onChange={handleSwitchChange}
                  color="blue"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 pt-8 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/service-management")}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                size="sm"
                className="px-8"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V8C12 2.962 6.038 2 2 2h4l2 2h4l2-2h4c4.038 0 8 2.962 8 8v4c0 4.038-2.962 8-8 8H4z"></path>
                    </svg>
                    {isEditing ? "Updating..." : "Creating..."}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {isEditing ? "Update Service" : "Create Service"}
                  </div>
                )}
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}
