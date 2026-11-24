import { useState, useEffect, ChangeEvent, FormEvent, useRef } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import { ProfileUpdateRequest } from "../../types/profile";
import { useProfile } from "../../context/ProfileContext";
import Loader from "../common/Loader";
import { uploadImageAndGetUrl, formatDateToYYYYMMDD } from "../../utility/utility";
import { toast } from "react-toastify";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import DatePicker from "../form/date-picker";

export default function UserMetaCard() {
  const { profile, updateProfile } = useProfile();
  const { isOpen, openModal, closeModal } = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ProfileUpdateRequest>({
    fullName: profile?.fullName || "",
    email: profile?.email || "",
    gender: profile?.gender || "male",
    dob: profile?.dob || ""
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const imageUrl = await uploadImageAndGetUrl(file);
      await updateProfile({ avatar: imageUrl });
      toast.success("Profile picture updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfile(formData);
      closeModal();
    } catch (error: unknown) {
      // Error is already handled in the context
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || "",
        email: profile.email || "",
        gender: profile.gender || "male",
        dob: profile.dob || ""
      });
    }
  }, [profile]);

  const [imgError, setImgError] = useState(false);

  const DefaultUserIcon = () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-50 dark:bg-gray-800 text-gray-400">
      <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );

  return (
    <div className="overflow-hidden bg-white border border-gray-200 rounded-3xl dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
      {/* Banner Area */}
      <div className="relative h-28 bg-linear-to-r from-brand-500/10 via-indigo-500/5 to-accent-500/10 dark:from-brand-500/20 dark:to-accent-500/20">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
      </div>
      
      <div className="px-5 pb-6 -mt-12 lg:px-8">
        <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-end">
            {/* Avatar Section */}
            <div className="relative group">
              <div className="w-28 h-28 overflow-hidden border-4 border-white rounded-full shadow-xl dark:border-gray-900 ring-1 ring-gray-100 dark:ring-white/10">
                {isUploading ? (
                  <div className="flex items-center justify-center w-full h-full bg-gray-50 dark:bg-gray-800">
                    <Loader size="sm" />
                  </div>
                ) : (
                  profile?.avatar && !imgError ? (
                    <img
                      src={profile.avatar}
                      alt="user"
                      className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <DefaultUserIcon />
                  )
                )}
              </div>
              <button
                onClick={handleAvatarClick}
                disabled={isUploading}
                className="absolute bottom-1 right-1 flex items-center justify-center w-9 h-9 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:scale-110 hover:border-brand-500 transition-all z-10 group/edit"
                title="Change Profile Picture"
              >
                <svg className="w-5 h-5 text-gray-500 group-hover/edit:text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

            {/* Name Section */}
            <div className="mb-1 text-center lg:text-left">
              <h4 className="text-2xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
                {profile?.fullName || "User Name"}
              </h4>
              <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 uppercase tracking-widest mt-1.5 border border-brand-100 dark:border-brand-500/20">
                {profile?.role || "Member"}
              </p>
            </div>
          </div>

          {/* Edit Button */}
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white transition-all rounded-xl bg-brand-600 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-500/30 active:scale-95 mb-1"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Information
          </button>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="relative w-full p-6 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-10">
          <div className="pr-12">
            <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Edit Profile
            </h4>
            <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Update your personal details below.
            </p>
          </div>
          <form className="mt-8" onSubmit={handleSave}>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wider text-gray-500">Full Name</Label>
                <Input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Full Name"
                  className="bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wider text-gray-500">Email Address</Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  className="bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wider text-gray-500">Gender</Label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-800 dark:text-white outline-hidden transition-all"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <DatePicker
                  id="dob"
                  label="Date of Birth"
                  defaultDate={formData.dob}
                  maxDate={new Date()}
                  onChange={(dates) => dates && dates[0] && setFormData(prev => ({ ...prev, dob: formatDateToYYYYMMDD(dates[0]) }))}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-10 lg:justify-end">
              <Button size="md" variant="outline" onClick={closeModal} className="flex-1 lg:flex-none">
                Cancel
              </Button>
              <Button size="md" type="submit" disabled={isLoading} className="flex-1 lg:flex-none">
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
