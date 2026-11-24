import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserProfile, ProfileResponse } from "../types/profile";
import { postData } from "../utility/utility";
import { toast } from "react-toastify";

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  fetchProfile: () => Promise<void>;
  updateProfile: (profileData: any) => Promise<void>;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
};

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response: ProfileResponse = await postData("/employees/profile", {});
      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        toast.error(response.message || "Failed to fetch profile");
      }
    } catch (error: unknown) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData: any) => {
    try {
      const response: ProfileResponse = await postData("/employees/profile-update", profileData);
      if (response.success && response.data) {
        setProfile(response.data);
        toast.success("Profile updated successfully!");
      } else {
        toast.error(response.message || "Failed to update profile");
        throw new Error(response.message || "Failed to update profile");
      }
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const clearProfile = () => {
    setProfile(null);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const value = {
    profile,
    loading,
    fetchProfile,
    updateProfile,
    clearProfile,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};
