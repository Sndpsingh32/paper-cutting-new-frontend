import { PortionSize } from "../../../types/product";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "react-toastify";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import ComponentCard from "../../../components/common/ComponentCard";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Label from "../../../components/form/Label";
import { postData, uploadImageAndGetUrl } from "../../../utility/utility";
import Switch from "../../../components/form/switch/Switch";
import { LocationType } from "../../../types/product";
import { MapPicker } from "../../../components/map/MapPicker";
import CategoryModal from "../../../Modal/CategoryModal/CategoryModal";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

// Minimal interface for product data we need
interface ProductData {
  _id: string;
  name: string;
  description: string;
  images: string[];
  categoryId: {
    _id: string;
    name: string;
    image: string;
  };
  categoryName?: string;
  isAvailable?: boolean;
  pricing: {
    portionSize: string;
    price: number;
    coinsEarned?: number;
    referCoinsEarned?: number;
    _id: string;
    createdAt: string;
    updatedAt: string;
  }[];
  availableLocations: {
    type: LocationType;
    city: string;
    area?: string;
    googlePlaceId?: string;
    googleLocation?: {
      lat: number;
      lng: number;
    };
    fullAddress?: string;
    radiusMeters?: number;
  }[];
}

export default function AddAndUpdateProduct() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    images: string[];
    categoryId: string;
    pricing: {
      portionSize: string;
      price: number;
      coinsEarned: number;
      referCoinsEarned: number;
    }[];
    availableLocations: {
      type: LocationType;
      city: string;
      area?: string;
      googlePlaceId?: string;
      googleLocation?: {
        lat: number;
        lng: number;
      };
      fullAddress?: string;
      radiusMeters?: number;
    }[];
    isAvailable: boolean;
    selectedFiles: File[];
    imagePreviews: string[];
  }>({
    name: "",
    description: "",
    images: [],
    categoryId: "",
    pricing: [
      {
        portionSize: PortionSize.QUARTER,
        price: 0,
        coinsEarned: 0,
        referCoinsEarned: 0,
      },
      {
        portionSize: PortionSize.HALF,
        price: 0,
        coinsEarned: 0,
        referCoinsEarned: 0,
      },
      {
        portionSize: PortionSize.FULL,
        price: 0,
        coinsEarned: 0,
        referCoinsEarned: 0,
      },
    ],
    availableLocations: [], // EMPTY ARRAY - NO DEFAULT LOCATION
    isAvailable: true,
    selectedFiles: [],
    imagePreviews: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{
    name: string;
    id: string;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Initialize form in edit mode
  useEffect(() => {
    const productData: ProductData | undefined = location.state?.product;
    if (productData && productData._id) {
      setIsEditMode(true);

      // Initialize pricing with all three portion sizes
      const existingPricing = productData.pricing || [];
      const defaultPricing = [
        {
          portionSize: PortionSize.QUARTER,
          price: 0,
          coinsEarned: 0,
          referCoinsEarned: 0,
        },
        {
          portionSize: PortionSize.HALF,
          price: 0,
          coinsEarned: 0,
          referCoinsEarned: 0,
        },
        {
          portionSize: PortionSize.FULL,
          price: 0,
          coinsEarned: 0,
          referCoinsEarned: 0,
        },
      ];

      // Merge existing pricing with default structure
      const mergedPricing = defaultPricing.map((defaultItem) => {
        const existingItem = existingPricing.find(
          (p: ProductData["pricing"][0]) =>
            p.portionSize === defaultItem.portionSize
        );
        return existingItem
          ? {
            ...existingItem,
            price: existingItem.price || 0,
            coinsEarned: existingItem.coinsEarned || 0,
            referCoinsEarned: existingItem.referCoinsEarned || 0,
          }
          : defaultItem;
      });

      setFormData({
        name: productData.name,
        description: productData.description,
        images: productData.images,
        categoryId: productData.categoryId?._id,
        pricing: mergedPricing,
        availableLocations: productData.availableLocations || [], // EMPTY ARRAY FOR EDIT MODE TOO
        isAvailable: productData.isAvailable ?? true,
        selectedFiles: [],
        imagePreviews: productData.images.map((image: string) => image),
      });

      // Set selected category if in edit mode
      if (productData.categoryId) {
        setSelectedCategory({
          name: productData.categoryId.name || "Selected Category",
          id: productData.categoryId._id,
        });
      }
    }
  }, [location.state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handle description change from CKEditor
  const handleDescriptionChange = (_: any, editor: any) => {
    const data = editor.getData();
    setFormData((prev) => ({
      ...prev,
      description: data,
    }));
    if (errors.description) {
      setErrors((prev) => ({ ...prev, description: "" }));
    }
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  // Process selected files
  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);

    // Filter only image files
    const imageFiles = fileArray.filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) {
      toast.error("Please select valid image files only");
      return;
    }

    // Check total images limit (max 10)
    const totalImages = formData.imagePreviews.length + imageFiles.length;
    if (totalImages > 10) {
      toast.error(
        "Maximum 10 images allowed. Please remove some images before adding more."
      );
      return;
    }

    setUploadLoading(true);

    try {
      // Create previews
      const newPreviews = imageFiles.map((file) => URL.createObjectURL(file));

      // Upload images and get URLs
      const uploadPromises = imageFiles.map((file) =>
        uploadImageAndGetUrl(file)
      );
      const uploadedUrls = await Promise.all(uploadPromises);

      setFormData((prev) => ({
        ...prev,
        selectedFiles: [...prev.selectedFiles, ...imageFiles],
        imagePreviews: [...prev.imagePreviews, ...newPreviews],
        images: [...prev.images, ...uploadedUrls],
      }));

      toast.success(`${imageFiles.length} image(s) uploaded successfully!`);
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload images"
      );
    } finally {
      setUploadLoading(false);
    }
  };

  const removeImage = (index: number) => {
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(formData.imagePreviews[index]);

    setFormData((prev) => ({
      ...prev,
      selectedFiles: prev.selectedFiles.filter((_, i) => i !== index),
      imagePreviews: prev.imagePreviews.filter((_, i) => i !== index),
      images: prev.images.filter((_, i) => i !== index),
    }));

    toast.info("Image removed");
  };

  // Update pricing field
  const updatePricingField = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const newPricing = [...formData.pricing];

    if (field === "price") {
      newPricing[index].price =
        typeof value === "string" ? parseFloat(value) || 0 : (value as number);
    } else if (field === "coinsEarned") {
      newPricing[index].coinsEarned =
        typeof value === "string" ? parseFloat(value) || 0 : (value as number);
    } else if (field === "referCoinsEarned") {
      newPricing[index].referCoinsEarned =
        typeof value === "string" ? parseFloat(value) || 0 : (value as number);
    }

    setFormData({ ...formData, pricing: newPricing });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Product name is required";
    if (!formData.description.trim() || formData.description === "<p></p>")
      newErrors.description = "Description is required";
    if (!formData.categoryId) newErrors.categoryId = "Category is required";
    if (formData.images.length === 0)
      newErrors.images = "At least one image is required";

    // Validate pricing
    const hasValidPricing = formData.pricing.some((p) => p.price > 0);
    if (!hasValidPricing) {
      newErrors.pricing =
        "At least one pricing option with valid price is required";
    }

    if (
      formData.pricing.some((p) => p.coinsEarned < 0 || isNaN(p.coinsEarned))
    ) {
      newErrors.pricing = "Valid coins earned value is required";
    }

    if (
      formData.pricing.some(
        (p) => p.referCoinsEarned < 0 || isNaN(p.referCoinsEarned)
      )
    ) {
      newErrors.pricing = "Valid refer coins earned value is required";
    }

    // Only validate locations if they exist
    if (
      formData.availableLocations.length > 0 &&
      formData.availableLocations.some((l) => !l.city)
    ) {
      newErrors.availableLocations = "City is required for all locations";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isEditMode) {
        const productData: ProductData | undefined = location.state?.product;

        // Remove createdAt, updatedAt, and _id from pricing items before sending to API
        const pricingForUpdate = formData.pricing.map((item) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { createdAt, updatedAt, _id, ...pricingItem } = item as any;
          return pricingItem;
        });

        const updatePayload = {
          productId: productData!._id,
          name: formData.name,
          description: formData.description,
          images: formData.images,
          categoryId: formData.categoryId, // This will be just the string ID
          pricing: pricingForUpdate,
          availableLocations: formData.availableLocations,
          isAvailable: formData.isAvailable,
        };

        console.log("📤 Update Payload being sent:", updatePayload);
        console.log("📋 CategoryId type:", typeof updatePayload.categoryId, "Value:", updatePayload.categoryId);

        await postData("/product/update", updatePayload);
        toast.success("Product updated successfully!");
      } else {
        const createPayload = {
          name: formData.name,
          description: formData.description,
          images: formData.images,
          categoryId: formData.categoryId, // This will be just the string ID
          pricing: formData.pricing,
          availableLocations: formData.availableLocations,
          isAvailable: formData.isAvailable,
        };

        console.log("📤 Create Payload being sent:", createPayload);
        console.log("📋 CategoryId type:", typeof createPayload.categoryId, "Value:", createPayload.categoryId);

        await postData("/product/create", createPayload);
        toast.success("Product created successfully!");
      }
      navigate(-1);
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error(`Failed to ${isEditMode ? "update" : "create"} product`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get portion size display name
  const getPortionSizeDisplayName = (portionSize: string): string => {
    switch (portionSize) {
      case PortionSize.QUARTER:
        return "Quarter";
      case PortionSize.HALF:
        return "Half";
      case PortionSize.FULL:
        return "Full";
      default:
        return portionSize;
    }
  };

  // Format price in Indian Rupees
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <>
      <PageMeta
        title={`${isEditMode ? "Edit" : "Add"} Product | Paper Cutting Service Dashboard`}
        description={`${isEditMode ? "Update" : "Create"} a new product`}
      />
      <PageBreadcrumb pageTitle={`${isEditMode ? "Edit" : "Add"} Product`} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {isEditMode ? "Edit Product" : "Add New Product"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEditMode ? "Update product details" : "Create a new product"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            ← Back
          </Button>
        </div>

        <ComponentCard title={`${isEditMode ? "Edit Product" : "Add Product"}`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Name and Category in one row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div>
                <Label>
                  Product Name <span className="text-error-500">*</span>
                </Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-error-500">{errors.name}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <Label>
                  Category <span className="text-error-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={selectedCategory?.name || ""}
                    readOnly
                    placeholder="Select a category"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCategoryModal(true)}
                    className="h-[45px]"
                  >
                    Select
                  </Button>
                </div>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.categoryId}
                  </p>
                )}
              </div>
            </div>

            {/* Description with CKEditor */}
            <div>
              <Label>
                Description <span className="text-error-500">*</span>
              </Label>
              <div
                className={`border rounded-lg ${errors.description
                  ? "border-error-500"
                  : "border-gray-300 dark:border-gray-600"
                  }`}
              >
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
                      "|",
                      "outdent",
                      "indent",
                      "|",
                      "blockQuote",
                      "insertTable",
                      "undo",
                      "redo",
                    ],
                    placeholder: "Enter product description...",
                  }}
                />
              </div>
              {errors.description && (
                <p className="mt-1 text-sm text-error-500">
                  {errors.description}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Provide detailed description about the product, ingredients, and
                special features
              </p>
            </div>

            {/* Images - Enhanced Upload Section */}
            <div>
              <Label>
                Product Images <span className="text-error-500">*</span>
              </Label>

              {/* Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500"
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  multiple
                />

                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-primary-600 dark:text-primary-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {uploadLoading
                        ? "Uploading images..."
                        : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      PNG, JPG, JPEG up to 10MB each (Max 10 images)
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      (
                        document.querySelector(
                          'input[type="file"]'
                        ) as HTMLInputElement
                      )?.click()
                    }
                    disabled={uploadLoading}
                  >
                    {uploadLoading ? "Uploading..." : "Choose Files"}
                  </Button>
                </div>
              </div>

              {errors.images && (
                <p className="mt-1 text-sm text-error-500">{errors.images}</p>
              )}

              {/* Image Previews */}
              {formData.imagePreviews.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <Label>
                      Uploaded Images ({formData.imagePreviews.length}/10)
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Revoke all object URLs
                        formData.imagePreviews.forEach((url) =>
                          URL.revokeObjectURL(url)
                        );
                        setFormData((prev) => ({
                          ...prev,
                          selectedFiles: [],
                          imagePreviews: [],
                          images: [],
                        }));
                        toast.info("All images removed");
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove All
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {formData.imagePreviews.map((preview, index) => (
                      <div
                        key={index}
                        className="relative group border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800"
                      >
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover"
                        />

                        {/* Image overlay with remove button */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                            title="Remove image"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>

                        {/* Image number badge */}
                        <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>

                  {formData.imagePreviews.length >= 10 && (
                    <p className="text-sm text-warning-600 dark:text-warning-400 mt-2 text-center">
                      Maximum 10 images reached. Remove some images to add more.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Pricing - All 3 portion sizes with Indian Rupees */}
            <div>
              <Label>
                Pricing <span className="text-error-500">*</span>
              </Label>
              <div className="space-y-4">
                {formData.pricing.map((price, index) => (
                  <div
                    key={price.portionSize}
                    className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {getPortionSizeDisplayName(price.portionSize)} Portion
                      </h4>
                      {price.price > 0 && (
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {formatPrice(price.price)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Price in Indian Rupees */}
                      <div>
                        <Label className="text-xs text-gray-600 dark:text-gray-400">
                          Price (₹){" "}
                          {price.price > 0 ? (
                            ""
                          ) : (
                            <span className="text-error-500">*</span>
                          )}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            ₹
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step={0.01}
                            value={price.price || ""}
                            onChange={(e) =>
                              updatePricingField(index, "price", e.target.value)
                            }
                            placeholder="0"
                            className={`pl-8 ${price.price > 0
                              ? "border-green-300 bg-green-50 dark:bg-green-900/20"
                              : ""
                              }`}
                          />
                        </div>
                        {price.price > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            ✓ Price set for{" "}
                            {getPortionSizeDisplayName(
                              price.portionSize
                            ).toLowerCase()}{" "}
                            portion
                          </p>
                        )}
                      </div>

                      {/* Coins Earned */}
                      <div>
                        <Label className="text-xs text-gray-600 dark:text-gray-400">
                          Coins Earned
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step={0.01}
                          value={price.coinsEarned || ""}
                          onChange={(e) =>
                            updatePricingField(
                              index,
                              "coinsEarned",
                              e.target.value
                            )
                          }
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Coins customer earns when purchasing this portion
                        </p>
                      </div>

                      {/* Refer Coins Earned */}
                      <div>
                        <Label className="text-xs text-gray-600 dark:text-gray-400">
                          Refer Coins Earned
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step={0.01}
                          value={price.referCoinsEarned || ""}
                          onChange={(e) =>
                            updatePricingField(
                              index,
                              "referCoinsEarned",
                              e.target.value
                            )
                          }
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Coins earned when this product is referred
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {errors.pricing && (
                <p className="mt-1 text-sm text-error-500">{errors.pricing}</p>
              )}

              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 <strong>Note:</strong> Set prices for all three portion
                  sizes in Indian Rupees (₹). At least one portion size must
                  have a valid price greater than 0.
                </p>
              </div>
            </div>

            {/* Available Locations */}
            <div>
              <Label>Available Locations</Label>
              <div className="mb-4">
                <MapPicker
                  mode="multi"
                  showSearch
                  initialCenter={{ lat: 28.6139, lng: 77.209 }} // Delhi, India
                  initialLocations={formData.availableLocations
                    .filter((l) => l.googleLocation)
                    .map((l) => ({
                      city: l.city,
                      area: l.area || "",
                      placeId: l.googlePlaceId || "",
                      lat: l.googleLocation!.lat,
                      lng: l.googleLocation!.lng,
                      fullAddress: l.fullAddress,
                      radiusMeters: l.radiusMeters,
                    }))}
                  onLocationAdd={({
                    city,
                    area,
                    placeId,
                    lat,
                    lng,
                    fullAddress,
                    radiusMeters,
                  }) => {
                    setFormData((prev) => ({
                      ...prev,
                      availableLocations: [
                        ...prev.availableLocations,
                        {
                          type: LocationType.AREA,
                          city,
                          area,
                          googlePlaceId: placeId,
                          googleLocation: { lat, lng },
                          fullAddress,
                          radiusMeters,
                        },
                      ],
                    }));
                  }}
                />
              </div>

              {/* Cards list - ONLY SHOW WHEN LOCATIONS EXIST */}
              {formData.availableLocations.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.availableLocations.map((location, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Location {index + 1}
                        </h4>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newLocations =
                              formData.availableLocations.filter(
                                (_, i) => i !== index
                              );
                            setFormData({
                              ...formData,
                              availableLocations: newLocations,
                            });
                          }}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          Remove
                        </Button>
                      </div>

                      {location.googlePlaceId ? (
                        <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                          <div className="flex items-start gap-2">
                            <span className="text-green-600 dark:text-green-400 text-lg">
                              ✓
                            </span>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Location Selected
                              </p>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {location.city && location.area
                                  ? `${location.area}, ${location.city}`
                                  : location.city || "Location"}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-green-200 dark:border-green-700">
                            <div>
                              <Label className="text-xs text-gray-600 dark:text-gray-400">
                                City <span className="text-error-500">*</span>
                              </Label>
                              <Input
                                value={location.city}
                                readOnly
                                placeholder="Selected from map"
                                className="bg-white dark:bg-gray-800 cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600 dark:text-gray-400">
                                Area
                              </Label>
                              <Input
                                value={location.area || ""}
                                readOnly
                                placeholder="Selected from map"
                                className="bg-white dark:bg-gray-800 cursor-not-allowed"
                              />
                            </div>
                          </div>

                          {typeof location.radiusMeters === "number" && (
                            <div className="pt-2 border-t border-green-200 dark:border-green-700">
                              <span className="text-gray-600 dark:text-gray-400 font-medium text-xs">
                                Radius:
                              </span>
                              <p className="text-gray-800 dark:text-gray-200 text-sm mt-1">
                                {location.radiusMeters >= 1000
                                  ? `${(location.radiusMeters / 1000).toFixed(
                                    1
                                  )} km`
                                  : `${location.radiusMeters} m`}
                              </p>
                            </div>
                          )}

                          {location.fullAddress && (
                            <div className="pt-2 border-t border-green-200 dark:border-green-700">
                              <span className="text-gray-600 dark:text-gray-400 font-medium text-xs">
                                Full Address:
                              </span>
                              <p className="text-gray-800 dark:text-gray-200 text-sm mt-1">
                                {location.fullAddress}
                              </p>
                            </div>
                          )}

                          {location.googleLocation && (
                            <div className="pt-2 border-t border-green-200 dark:border-green-700 space-y-2">
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                                    Latitude:
                                  </span>
                                  <p className="text-gray-800 dark:text-gray-200 font-mono">
                                    {location.googleLocation.lat.toFixed(6)}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                                    Longitude:
                                  </span>
                                  <p className="text-gray-800 dark:text-gray-200 font-mono">
                                    {location.googleLocation.lng.toFixed(6)}
                                  </p>
                                </div>
                              </div>
                              {location.googlePlaceId && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400 font-medium text-xs">
                                    Place ID:
                                  </span>
                                  <p className="text-gray-800 dark:text-gray-200 font-mono text-xs break-all">
                                    {location.googlePlaceId}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
                            Click on the map above to add location details
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {errors.availableLocations && (
                <p className="mt-1 text-sm text-error-500">
                  {errors.availableLocations}
                </p>
              )}
            </div>

            {/* Featured and Active in one row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Active */}
              <div>
                <Label>Active Status</Label>
                <Switch
                  label="Product Availability"
                  checked={formData.isAvailable}
                  onChange={(checked) =>
                    handleSwitchChange("isAvailable", checked)
                  }
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || uploadLoading}
              className="w-full md:w-auto"
            >
              {isLoading
                ? "Saving..."
                : isEditMode
                  ? "Update Product"
                  : "Create Product"}
            </Button>
          </form>
        </ComponentCard>
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSelect={(category) => {
          setSelectedCategory({
            name: category.name,
            id: category._id,
          });
          setFormData({
            ...formData,
            categoryId: category._id,
          });
          setShowCategoryModal(false);
        }}
      />
    </>
  );
}
