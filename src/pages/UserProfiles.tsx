import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import PageMeta from "../components/common/PageMeta";
import { useProfile } from "../context/ProfileContext";
import Loader from "../components/common/Loader";

export default function UserProfiles() {
  const { loading } = useProfile();

  if (loading) {
    return (
      <>
        <PageMeta
          title="User Profile | Paper Cutting - Service Management System"
          description="User profile page for Paper Cutting service management system"
        />
        <div className="flex items-center justify-center min-h-screen">
          <Loader size="lg" color="primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="User Profile | Jain Trade Links"
        description="User profile management"
      />
      <PageBreadcrumb pageTitle="My Profile" />
      <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8 pb-10 px-4">
        <UserMetaCard />
        <UserInfoCard />
      </div>
    </>
  );
}
