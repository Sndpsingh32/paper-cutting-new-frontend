import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Paper Cutting - Super Admin Login | Service Management Dashboard"
        description="Secure login page for Paper Cutting service super admin dashboard. Access your service management system to manage operations, services, and users."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
