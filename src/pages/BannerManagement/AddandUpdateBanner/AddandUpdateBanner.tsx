import { Banner } from "../../../types/banner";
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

export default function BannerAddAndUpdate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<{
    name: string;
    image: string;
    isActive: boolean;
    selectedFile: File | null;
    imagePreview: string;
  }>({
    name: "",
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
    const bannerData = location.state?.banner as Banner;
    if (bannerData && bannerData._id) {
      setIsEditMode(true);

      let isActiveStatus = true;

      if (bannerData.status) {
        isActiveStatus = bannerData.status === 'active';
      } else if (bannerData.isActive !== undefined) {
        isActiveStatus = bannerData.isActive;
      } else {
        isActiveStatus = true;
      }

      setFormData({
        name: bannerData.name,
        image: bannerData.image,
        isActive: isActiveStatus,
        selectedFile: null,
        imagePreview: bannerData.image
      });
    }
  }, [location.state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      newErrors.name = "Banner name is required";
    }

    if (!formData.image.trim()) {
      newErrors.image = "Please upload a banner image";
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
      const bannerData = location.state?.banner as Banner;

      if (isEditMode && bannerData?._id) {
        // Update existing banner
        await postData(`/banner/update`, {
          name: formData.name,
          image: formData.image,
          status: formData.isActive ? "active" : "inactive",
          bannerId: bannerData._id
        });
        toast.success("Banner updated successfully!");
      } else {
        // Create new banner
        await postData('/banner/create', {
          name: formData.name,
          image: formData.image,
          status: formData.isActive ? "active" : "inactive"
        });
        toast.success("Banner created successfully!");
      }

      navigate(-1);
    } catch (error: any) {
      console.error("Error saving banner:", error);
      const errorMsg = error.response?.data?.message
        ? (Array.isArray(error.response.data.message) ? error.response.data.message[0] : error.response.data.message)
        : `Failed to ${isEditMode ? 'update' : 'create'} banner`;
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title={`${isEditMode ? 'Edit' : 'Add'} Banner | Paper Cutting Service Dashboard`}
        description={`${isEditMode ? 'Update' : 'Create'} a new promotional banner for Paper Cutting with active status control`}
      />
      <PageBreadcrumb pageTitle={`${isEditMode ? 'Edit' : 'Add'} Banner`} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {isEditMode ? 'Edit Banner' : 'Add New Banner'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEditMode ? 'Update the promotional banner and its active status for your restaurant' : 'Create a new promotional banner with active status control for your restaurant'}
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

        <ComponentCard title={`${isEditMode ? 'Edit Banner Details' : 'Add New Banner Information'}`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>
                Banner Name <span className="text-error-500">*</span>
              </Label>
              <Input
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter banner name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-error-500">{errors.name}</p>
              )}
            </div>

            <div>
              <Label>
                Banner Image <span className="text-error-500">*</span>
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
                      alt="Banner preview"
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
                Banner Status <span className="text-error-500">*</span>
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
                Set whether this banner is active and visible to customers
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
                  isEditMode ? 'Update Banner' : 'Create Banner'
                )}
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}