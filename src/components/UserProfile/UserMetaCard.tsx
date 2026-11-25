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
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      <div className="relative h-32 overflow-hidden sm:h-36">
        <img
          src="/images/warehouse-paper-rolls.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/45 via-gray-900/20 to-brand-950/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5" />
      </div>

      <div className="px-5 pb-6 sm:px-8">
        <div className="-mt-14 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-5">
            <div className="relative group shrink-0">
              <div className="h-28 w-28 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl ring-1 ring-black/5 dark:border-gray-900 dark:bg-gray-800 dark:ring-white/10 sm:h-32 sm:w-32">
                {isUploading ? (
                  <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-800">
                    <Loader size="sm" />
                  </div>
                ) : profile?.avatar && !imgError ? (
                  <img
                    src={profile.avatar}
                    alt="user"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <DefaultUserIcon />
                )}
              </div>
              <button
                onClick={handleAvatarClick}
                disabled={isUploading}
                className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-lg transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-600 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-brand-400"
                title="Change Profile Picture"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

            <div className="pb-1 text-center sm:text-left">
              <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                {profile?.fullName || "User Name"}
              </h2>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
                  {profile?.role || "Member"}
                </span>
                {profile?.email && (
                  <span className="inline-flex max-w-full items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <span className="truncate">{profile.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={openModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:-translate-y-0.5 hover:bg-brand-700 active:translate-y-0"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Profile
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
