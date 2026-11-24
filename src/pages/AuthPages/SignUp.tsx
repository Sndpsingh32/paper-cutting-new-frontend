import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Sign Up | Paper Cutting - Service Management System"
        description="Sign up page for Paper Cutting service management system"
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
