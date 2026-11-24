import { Category } from "../../../types/category";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "react-toastify";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import ComponentCard from "../../../components/common/ComponentCard";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Label from "../../../components/form/Label";
import Loader from "../../../components/common/Loader";
import Switch from "../../../components/form/switch/Switch";
import { postData, uploadImageAndGetUrl } from "../../../utility/utility";

export default function CategoryAddAndUpdate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    image: string;
    isActive: boolean;
    selectedFile: File | null;
    imagePreview: string;
  }>({
    name: "",
    description: "",
    image: "",
    isActive: true,
    selectedFile: null,
    imagePreview: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; image?: string }>({});

  useEffect(() => {
    const categoryData = location.state?.category as Category;
    const categoryId = categoryData?._id || categoryData?.categoryId;

    if (categoryData && categoryId && categoryId.trim() !== "") {

      setIsEditMode(true);
      setFormData({
        name: categoryData.name || "",
        description: categoryData.description || "",
        image: categoryData.image || "",
        isActive: categoryData.isActive ?? true,
        selectedFile: null,
        imagePreview: categoryData.image || ""
      });
    } else {
      console.log("Not in edit mode - no valid category ID found");
      setIsEditMode(false);
    }
  }, [location.state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isActive: checked
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({
        ...prev,
        selectedFile: file,
        imagePreview: previewUrl,
        image: ""
      }));

      setUploadLoading(true);
      try {
        const imageUrl = await uploadImageAndGetUrl(file);
        setFormData(prev => ({
          ...prev,
          image: imageUrl
        }));
        toast.success("Image uploaded successfully!");
      } catch (error: unknown) {
        console.error("Error uploading image:", error);
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Failed to upload image");
        }
        setFormData(prev => ({
          ...prev,
          selectedFile: null,
          imagePreview: "",
          image: ""
        }));
      } finally {
        setUploadLoading(false);
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string; image?: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Category name is required";
    }

    if (!formData.image.trim()) {
      newErrors.image = "Please upload a category image";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const categoryData = location.state?.category as Category;
      const categoryId = categoryData?._id || categoryData?.categoryId;
      if (isEditMode && categoryId) {

        await postData(`/category/update`, {
          name: formData.name,
          description: formData.description,
          image: formData.image,
          isActive: formData.isActive,
          categoryId: categoryId
        });
        toast.success("Category updated successfully!");
      } else {

        await postData('/category/create', {
          name: formData.name,
          description: formData.description,
          image: formData.image,
          isActive: formData.isActive
        });
        toast.success("Category created successfully!");
      }

      navigate(-1);
    } catch (error: any) {
      console.error("Error saving category:", error);
      const errorMsg = error.response?.data?.message
        ? (Array.isArray(error.response.data.message) ? error.response.data.message[0] : error.response.data.message)
        : `Failed to ${isEditMode ? 'update' : 'create'} category`;
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title={`${isEditMode ? 'Edit' : 'Add'} Category | Paper Cutting Service Dashboard`}
        description={`${isEditMode ? 'Update' : 'Create'} a new service category for Paper Cutting`}
      />
      <PageBreadcrumb pageTitle={`${isEditMode ? 'Edit' : 'Add'} Category`} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {isEditMode ? 'Edit Category' : 'Add New Category'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEditMode ? 'Update the menu category for your restaurant' : 'Create a new menu category for your restaurant'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            ← Back
          </Button>
        </div>

        <ComponentCard title={`${isEditMode ? 'Edit Category Details' : 'Add New Category Information'}`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>
                Category Name <span className="text-error-500">*</span>
              </Label>
              <Input
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter category name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-error-500">{errors.name}</p>
              )}
            </div>

            <div>
              <Label>
                Description
              </Label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter category description"
                rows={3}
                className="h-20 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 mt-1"
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional: Provide a brief description of this category
              </p>
            </div>

            <div>
              <Label>
                Category Image <span className="text-error-500">*</span>
              </Label>

              {/* File Upload Option */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Upload Image File</Label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
                    onChange={handleFileChange}
                    className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 mt-1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Supported formats: JPG, JPEG, PNG, GIF, WebP (Max size: 5MB)
                  </p>
                </div>
              </div>

              {errors.image && (
                <p className="mt-1 text-sm text-error-500">{errors.image}</p>
              )}

              {/* Image Preview */}
              {(formData.selectedFile || formData.image) && (
                <div className="mt-3">
                  <Label className="text-sm font-medium">Image Preview</Label>
                  <div className="mt-2">
                    <img
                      src={formData.selectedFile ? formData.imagePreview : formData.image}
                      alt="Category preview"
                      className="h-50 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                  {formData.selectedFile && (
                    <p className="mt-2 text-xs text-green-600">
                      ✓ File selected: {formData.selectedFile.name} ({(formData.selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      {uploadLoading && " - Uploading..."}
                    </p>
                  )}
                  {formData.image && !formData.selectedFile && (
                    <p className="mt-2 text-xs text-green-600">
                      ✓ Image URL ready for submission
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>
                Category Status <span className="text-error-500">*</span>
              </Label>
              <div className="mt-2">
                <Switch
                  label={formData.isActive ? "Active" : "Inactive"}
                  checked={formData.isActive}
                  onChange={handleSwitchChange}
                  color="blue"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Set whether this category is active and visible to customers
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || uploadLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader size="sm" color="white" className="mr-2" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditMode ? 'Update Category' : 'Create Category'
                )}
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}
