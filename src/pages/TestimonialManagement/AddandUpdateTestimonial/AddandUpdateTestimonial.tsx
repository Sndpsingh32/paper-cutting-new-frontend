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
import { Testimonial } from "../../../types/testimonial";

const MAX_CONTENT_LENGTH = 200;

export default function AddandUpdateTestimonial() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<{
    image: string;
    title: string;
    content: string;
    status: "active" | "inactive";
    selectedFile: File | null;
    imagePreview: string;
  }>({
    image: "",
    title: "",
    content: "",
    status: "active",
    selectedFile: null,
    imagePreview: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [errors, setErrors] = useState<{ image?: string; title?: string; content?: string }>({});

  useEffect(() => {
    const data = location.state?.testimonial as Testimonial | undefined;
    if (data && data._id) {
      setIsEditMode(true);
      setFormData({
        image: data.image || "",
        title: data.title || "",
        content: data.content || "",
        status: data.status || "inactive",
        selectedFile: null,
        imagePreview: data.image || "",
      });
    }
  }, [location.state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleStatusChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, status: checked ? "active" : "inactive" }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, selectedFile: file, imagePreview: previewUrl, image: "" }));

      setUploadLoading(true);
      try {
        const imageUrl = await uploadImageAndGetUrl(file);
        setFormData((prev) => ({ ...prev, image: imageUrl }));
        toast.success("Image uploaded successfully!");
      } catch (error: unknown) {
        console.error("Error uploading image:", error);
        toast.error("Failed to upload image");
        setFormData((prev) => ({ ...prev, selectedFile: null, imagePreview: "", image: "" }));
      } finally {
        setUploadLoading(false);
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { image?: string; title?: string; content?: string } = {};
    if (!formData.image.trim()) newErrors.image = "Please upload an image";
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.content.trim()) newErrors.content = "Content is required";
    if (formData.content.length > MAX_CONTENT_LENGTH) newErrors.content = `Content must be at most ${MAX_CONTENT_LENGTH} characters`;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const testimonialData = location.state?.testimonial as Testimonial | undefined;
      if (isEditMode && testimonialData?._id) {
        await postData(`/testimonial/update`, {
          id: testimonialData._id,
          image: formData.image,
          title: formData.title,
          content: formData.content,
          status: formData.status,
        });
        toast.success("Testimonial updated successfully!");
      } else {
        await postData(`/testimonial/create`, {
          image: formData.image,
          title: formData.title,
          content: formData.content,
          status: formData.status,
        });
        toast.success("Testimonial created successfully!");
      }
      navigate(-1);
    } catch (error: unknown) {
      console.error("Error saving testimonial:", error);
      toast.error(`Failed to ${isEditMode ? "update" : "create"} testimonial`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title={`${isEditMode ? "Edit" : "Add"} Testimonial | Paper Cutting Service Dashboard`}
        description={`${isEditMode ? "Update" : "Create"} a customer testimonial for Paper Cutting`}
      />
      <PageBreadcrumb pageTitle={`${isEditMode ? "Edit" : "Add"} Testimonial`} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {isEditMode ? "Edit Testimonial" : "Add New Testimonial"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEditMode ? "Update the testimonial details" : "Create a new customer testimonial"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            ← Back
          </Button>
        </div>

        <ComponentCard title={`${isEditMode ? "Edit Testimonial Details" : "Add New Testimonial Information"}`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>
                Image <span className="text-error-500">*</span>
              </Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Upload Image File</Label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
                    onChange={handleFileChange}
                    className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 mt-1"
                  />
                  <p className="mt-1 text-xs text-gray-500">Supported formats: JPG, JPEG, PNG, GIF, WebP (Max size: 5MB)</p>
                </div>
              </div>
              {errors.image && <p className="mt-1 text-sm text-error-500">{errors.image}</p>}
              {(formData.selectedFile || formData.image) && (
                <div className="mt-3">
                  <Label className="text-sm font-medium">Image Preview</Label>
                  <div className="mt-2">
                    <img
                      src={formData.selectedFile ? formData.imagePreview : formData.image}
                      alt="Testimonial preview"
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
                    <p className="mt-2 text-xs text-green-600">✓ Image URL ready for submission</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>
                Title <span className="text-error-500">*</span>
              </Label>
              <Input
                name="title"
                type="text"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter testimonial title"
              />
              {errors.title && <p className="mt-1 text-sm text-error-500">{errors.title}</p>}
            </div>

            <div>
              <Label>
                Content <span className="text-error-500">*</span>
              </Label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Enter testimonial content"
                maxLength={MAX_CONTENT_LENGTH}
                className="h-28 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 mt-1"
              />
              <p className="mt-1 text-xs text-gray-500">{formData.content.length}/{MAX_CONTENT_LENGTH}</p>
              {errors.content && <p className="mt-1 text-sm text-error-500">{errors.content}</p>}
            </div>

            <div>
              <Label>
                Status <span className="text-error-500">*</span>
              </Label>
              <div className="mt-2">
                <Switch
                  label={formData.status === "active" ? "Active" : "Inactive"}
                  checked={formData.status === "active"}
                  onChange={handleStatusChange}
                  color="blue"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" size="sm" disabled={isLoading || uploadLoading} className="min-w-[140px]">
                {isLoading ? (
                  <>
                    <Loader size="sm" color="white" className="mr-2" />
                    {isEditMode ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  isEditMode ? "Update Testimonial" : "Create Testimonial"
                )}
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}
