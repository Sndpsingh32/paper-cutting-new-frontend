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
import { ProductExtra } from "../../../types/productExtra";
import ProductModal from "../../../Modal/ProductModal/ProductModal";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

interface CKEditorEventHandler {
  _event: unknown;
  editor: {
    getData: () => string;
  };
}

export default function AddAndUpdateAddOn() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    price: number;
    productId: string;
    selectedProduct: { name: string; id: string } | null;
    maxQuantity: number;
    minQuantity: number;
    images: string[];
    isAvailable: boolean;
    selectedFiles: File[];
    imagePreviews: string[];
  }>({
    name: "",
    description: "",
    price: 0,
    productId: "",
    selectedProduct: null,
    maxQuantity: 1,
    minQuantity: 1,
    images: [],
    isAvailable: true,
    selectedFiles: [],
    imagePreviews: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showProductModal, setShowProductModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Initialize form in edit mode
  useEffect(() => {
    const addOnData = location.state?.productExtra as ProductExtra & {
      productName?: string;
    };
    if (addOnData && addOnData._id) {
      setIsEditMode(true);
      setFormData({
        name: addOnData.name,
        description: addOnData.description,
        price: addOnData.price,
        productId: addOnData.productId,
        selectedProduct: {
          name: "Selected Product",
          id: addOnData.productId,
        },
        maxQuantity: addOnData.maxQuantity,
        minQuantity: addOnData.minQuantity,
        images: addOnData.images,
        isAvailable: addOnData.isAvailable,
        selectedFiles: [],
        imagePreviews: addOnData.images,
      });
    }
  }, [location.state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "price" || name === "maxQuantity" || name === "minQuantity"
          ? Number(value)
          : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleDescriptionChange = (
    _event: CKEditorEventHandler["_event"],
    editor: CKEditorEventHandler["editor"]
  ) => {
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
      toast.error("Maximum 10 images allowed");
      return;
    }

    setUploadLoading(true);

    try {
      const newPreviews = imageFiles.map((file) => URL.createObjectURL(file));
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
    URL.revokeObjectURL(formData.imagePreviews[index]);
    setFormData((prev) => ({
      ...prev,
      selectedFiles: prev.selectedFiles.filter((_, i) => i !== index),
      imagePreviews: prev.imagePreviews.filter((_, i) => i !== index),
      images: prev.images.filter((_, i) => i !== index),
    }));
    toast.info("Image removed");
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.description.trim() || formData.description === "<p></p>")
      newErrors.description = "Description is required";
    if (!formData.productId) newErrors.productId = "Parent product is required";
    if (formData.price <= 0) newErrors.price = "Price must be greater than 0";
    if (formData.maxQuantity < formData.minQuantity)
      newErrors.maxQuantity = "Max quantity cannot be less than min quantity";
    if (formData.minQuantity < 0)
      newErrors.minQuantity = "Min quantity cannot be negative";
    if (formData.images.length === 0)
      newErrors.images = "At least one image is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isEditMode) {
        const addOnData = location.state?.productExtra as ProductExtra;
        await postData("/product-extra/update", {
          extraId: addOnData._id,
          name: formData.name,
          description: formData.description,
          price: formData.price,
          productId: formData.productId,
          maxQuantity: formData.maxQuantity,
          minQuantity: formData.minQuantity,
          images: formData.images,
          isAvailable: formData.isAvailable,
        });
        toast.success("Add-on updated successfully!");
      } else {
        await postData("/product-extra/create", {
          name: formData.name,
          description: formData.description,
          price: formData.price,
          productId: formData.productId,
          maxQuantity: formData.maxQuantity,
          minQuantity: formData.minQuantity,
          images: formData.images,
          isAvailable: formData.isAvailable,
        });
        toast.success("Add-on created successfully!");
      }
      navigate(-1);
    } catch (error) {
      console.error("Error saving add-on:", error);
      toast.error(`Failed to ${isEditMode ? "update" : "create"} add-on`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title={`${isEditMode ? "Edit" : "Add"} Add-on | Paper Cutting Service Dashboard`}
        description={`${isEditMode ? "Update" : "Create"} a product add-on`}
      />
      <PageBreadcrumb pageTitle={`${isEditMode ? "Edit" : "Add"} Add-on`} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {isEditMode ? "Edit Add-on" : "Add New Add-on"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEditMode
                ? "Update add-on details"
                : "Create a new product add-on"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            ← Back
          </Button>
        </div>

        <ComponentCard title={`${isEditMode ? "Edit Add-on" : "Add Add-on"}`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name and Price in one row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>
                  Name <span className="text-error-500">*</span>
                </Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter add-on name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-error-500">{errors.name}</p>
                )}
              </div>

              <div>
                <Label>
                  Price (₹) <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <Input
                    name="price"
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="pl-8"
                  />
                </div>
                {errors.price && (
                  <p className="mt-1 text-sm text-error-500">{errors.price}</p>
                )}
              </div>
            </div>

            {/* Parent Product Selection */}
            <div>
              <Label>
                Parent Product <span className="text-error-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={formData.selectedProduct?.name || ""}
                  readOnly
                  placeholder="Select a product"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowProductModal(true)}
                  className="h-[45px]"
                >
                  Select
                </Button>
              </div>
              {errors.productId && (
                <p className="mt-1 text-sm text-error-500">
                  {errors.productId}
                </p>
              )}
            </div>

            {/* Description with CKEditor */}
            <div>
              <Label>
                Description <span className="text-error-500">*</span>
              </Label>
              <div
                className={`border rounded-lg ${
                  errors.description
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
                    placeholder: "Enter add-on description...",
                  }}
                />
              </div>
              {errors.description && (
                <p className="mt-1 text-sm text-error-500">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Quantity Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>
                  Minimum Quantity <span className="text-error-500">*</span>
                </Label>
                <Input
                  name="minQuantity"
                  type="number"
                  min="0"
                  value={formData.minQuantity}
                  onChange={handleInputChange}
                  placeholder="1"
                />
                {errors.minQuantity && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.minQuantity}
                  </p>
                )}
              </div>

              <div>
                <Label>
                  Maximum Quantity <span className="text-error-500">*</span>
                </Label>
                <Input
                  name="maxQuantity"
                  type="number"
                  min="1"
                  value={formData.maxQuantity}
                  onChange={handleInputChange}
                  placeholder="1"
                />
                {errors.maxQuantity && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.maxQuantity}
                  </p>
                )}
              </div>
            </div>

            {/* Images Upload Section */}
            <div>
              <Label>
                Images <span className="text-error-500">*</span>
              </Label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
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
                    onClick={() => {
                      const fileInput = document.querySelector(
                        'input[type="file"]'
                      ) as HTMLInputElement;
                      if (fileInput) fileInput.click();
                    }}
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
                </div>
              )}
            </div>

            {/* Availability Status */}
            <div>
              <Label>Available Status</Label>
              <div className="flex items-center gap-2">
                <Switch
                  label="Is Available"
                  checked={formData.isAvailable}
                  onChange={(checked) =>
                    handleSwitchChange("isAvailable", checked)
                  }
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.isAvailable ? "Available" : "Not Available"}
                </span>
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
                ? "Update Add-on"
                : "Create Add-on"}
            </Button>
          </form>
        </ComponentCard>
      </div>

      {/* Product Selection Modal */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSelect={(product) => {
          setFormData((prev) => ({
            ...prev,
            productId: product._id,
            selectedProduct: {
              name: product.name,
              id: product._id,
            },
          }));
          setShowProductModal(false);
        }}
      />
    </>
  );
}
