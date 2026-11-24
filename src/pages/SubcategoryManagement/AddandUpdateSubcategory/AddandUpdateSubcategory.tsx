import { Subcategory } from "../../../types/subcategory";
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

export default function SubcategoryAddAndUpdate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    image: string;
    categoryId: string;
    isActive: boolean;
    selectedFile: File | null;
    imagePreview: string;
  }>({
    name: "",
    description: "",
    image: "",
    categoryId: "",
    isActive: true,
    selectedFile: null,
    imagePreview: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; image?: string; categoryId?: string }>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Fetch categories for dropdown
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await postData("/category/list", {});
      if (response.success) {
        const uniqueCategories = (response.data.categories || []).reduce((acc: Category[], category: Category) => {
          if (!acc.some(cat => (cat._id || cat.categoryId) === (category._id || category.categoryId))) {
            acc.push(category);
          }
          return acc;
        }, []);
        setCategories(uniqueCategories);

      }
    } catch (error: unknown) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to fetch categories");
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const subcategoryData = location.state?.subcategory as Subcategory;
    const subcategoryId = subcategoryData?._id || subcategoryData?.subcategoryId;

    if (subcategoryData && subcategoryId && subcategoryId.trim() !== "") {
      console.log("Setting edit mode to true for subcategoryId:", subcategoryId);
      setIsEditMode(true);

      let categoryIdValue = "";
      if (typeof subcategoryData.categoryId === 'string') {
        categoryIdValue = subcategoryData.categoryId;
      } else if (subcategoryData.categoryId && typeof subcategoryData.categoryId === 'object') {
        categoryIdValue = subcategoryData.categoryId._id;
      } else if (subcategoryData.category?.categoryId) {
        categoryIdValue = subcategoryData.category.categoryId;
      }

      setFormData({
        name: subcategoryData.name || "",
        description: subcategoryData.description || "",
        image: subcategoryData.image || "",
        categoryId: categoryIdValue,
        isActive: subcategoryData.isActive ?? true,
        selectedFile: null,
        imagePreview: subcategoryData.image || ""
      });
    } else {
      console.log("Not in edit mode - no valid subcategoryId found");
      setIsEditMode(false);
    }
  }, [location.state]);

  useEffect(() => {
    if (isEditMode && formData.categoryId && categories.length > 0) {
      const categoryExists = categories.some(cat => (cat._id || cat.categoryId) === formData.categoryId);
      if (!categoryExists) {
        const subcategoryData = location.state?.subcategory as Subcategory;
        if (subcategoryData?.category) {
          setCategories(prev => {
            const categoryObj = subcategoryData.category as any;
            const categoryId = categoryObj._id || categoryObj.categoryId;
            const alreadyExists = prev.some(cat => (cat._id || cat.categoryId) === categoryId);
            if (!alreadyExists) {
              return [...prev, subcategoryData.category as Category];
            }
            return prev;
          });
        }
      }
    }
  }, [isEditMode, formData.categoryId, categories, location.state]);

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

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
    const newErrors: { name?: string; image?: string; categoryId?: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Subcategory name is required";
    }

    if (!formData.categoryId.trim()) {
      newErrors.categoryId = "Please select a category";
    }

    if (!formData.image.trim()) {
      newErrors.image = "Please upload a subcategory image";
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
      const subcategoryData = location.state?.subcategory as Subcategory;
      const subcategoryId = subcategoryData?._id || subcategoryData?.subcategoryId;

      if (isEditMode && subcategoryId) {
        await postData(`/subcategory/update`, {
          name: formData.name,
          description: formData.description,
          image: formData.image,
          categoryId: formData.categoryId,
          isActive: formData.isActive,
          subcategoryId: subcategoryId
        });
        toast.success("Subcategory updated successfully!");
      } else {
        await postData('/subcategory/create', {
          name: formData.name,
          description: formData.description,
          image: formData.image,
          categoryId: formData.categoryId,
          isActive: formData.isActive
        });
        toast.success("Subcategory created successfully!");
      }

      navigate(-1);
    } catch (error: any) {
      console.error("Error saving subcategory:", error);
      const errorMsg = error.response?.data?.message
        ? (Array.isArray(error.response.data.message) ? error.response.data.message[0] : error.response.data.message)
        : `Failed to ${isEditMode ? 'update' : 'create'} subcategory`;
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title={`${isEditMode ? 'Edit' : 'Add'} Subcategory | Paper Cutting Service Dashboard`}
        description={`${isEditMode ? 'Update' : 'Create'} a new service subcategory for Paper Cutting`}
      />
      <PageBreadcrumb pageTitle={`${isEditMode ? 'Edit' : 'Add'} Subcategory`} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {isEditMode ? 'Edit Subcategory' : 'Add New Subcategory'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEditMode ? 'Update the subcategory for your business' : 'Create a new subcategory for your business'}
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

        <ComponentCard title={`${isEditMode ? 'Edit Subcategory Details' : 'Add New Subcategory Information'}`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>
                Subcategory Name <span className="text-error-500">*</span>
              </Label>
              <Input
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter subcategory name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-error-500">{errors.name}</p>
              )}
            </div>

            <div>
              <Label>
                Category <span className="text-error-500">*</span>
              </Label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleSelectChange}
                disabled={categoriesLoading}
                className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 mt-1"
              >
                <option value="">Select a category</option>
                {categories.map((category) => {
                  const categoryId = category._id || category.categoryId;
                  return (
                    <option key={categoryId} value={categoryId}>
                      {category.name}
                    </option>
                  );
                })}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-error-500">{errors.categoryId}</p>
              )}
              {categoriesLoading && (
                <p className="mt-1 text-xs text-gray-500">Loading categories...</p>
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
                placeholder="Enter subcategory description"
                rows={3}
                className="h-20 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 mt-1"
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional: Provide a brief description of this subcategory
              </p>
            </div>

            <div>
              <Label>
                Subcategory Image <span className="text-error-500">*</span>
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
                      alt="Subcategory preview"
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
                Subcategory Status <span className="text-error-500">*</span>
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
                Set whether this subcategory is active and visible to customers
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || uploadLoading || categoriesLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader size="sm" color="white" className="mr-2" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditMode ? 'Update Subcategory' : 'Create Subcategory'
                )}
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}
