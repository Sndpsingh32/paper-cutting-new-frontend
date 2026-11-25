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
          title="User Profile | Paper Sheet Trade"
          description="User profile page for Paper Sheet Trade"
        />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader size="lg" color="primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="User Profile | Paper Sheet Trade"
        description="User profile management"
      />

      <div className="space-y-6 pb-10">
        <PageBreadcrumb pageTitle="My Profile" />

        <div className="mx-auto max-w-6xl space-y-6">
          <UserMetaCard />
          <UserInfoCard />
        </div>
      </div>
    </>
  );
}
