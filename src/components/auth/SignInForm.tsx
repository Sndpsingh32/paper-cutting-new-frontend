import { useState, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import { postData } from "../../utility/utility";
import { toast } from "react-toastify";
import { UserIcon, LockIcon } from "../../icons";

export default function SignInForm() {
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    mobileNumber: "",
    otp: ""
  });
  const [errors, setErrors] = useState({
    mobileNumber: "",
    otp: ""
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setApiError(null);
    const { name, value } = e.target;

    if (name === "mobileNumber") {
      const numericValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));

      if (numericValue.length > 0) {
        if (numericValue.length !== 10) {
          setErrors(prev => ({
            ...prev,
            mobileNumber: "Mobile number must be 10 digits"
          }));
        } else if (numericValue[0] < '6') {
          setErrors(prev => ({
            ...prev,
            mobileNumber: "Must start with 6, 7, 8, or 9"
          }));
        } else {
          setErrors(prev => ({
            ...prev,
            mobileNumber: ""
          }));
        }
      } else {
        setErrors(prev => ({
          ...prev,
          mobileNumber: ""
        }));
      }
    } else if (name === "otp") {
      const numericValue = value.replace(/\D/g, "").slice(0, 4);
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));

      if (numericValue.length > 0 && numericValue.length !== 4) {
        setErrors(prev => ({
          ...prev,
          otp: "OTP must be 4 digits"
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          otp: ""
        }));
      }
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError(null);

    let isValid = true;
    const newErrors = {
      mobileNumber: "",
      otp: ""
    };

    if (step === 1) {
      if (formData.mobileNumber.length !== 10) {
        newErrors.mobileNumber = "Mobile number must be 10 digits";
        isValid = false;
      }
    } else {
      if (formData.otp.length !== 4) {
        newErrors.otp = "OTP must be 4 digits";
        isValid = false;
      }
    }

    setErrors(newErrors);

    if (!isValid) return;

    setIsLoading(true);

    try {
      if (step === 1) {
        const response = await postData("/employees/login", {
          mobileNumber: formData.mobileNumber
        });

        if (response.success) {
          toast.success("OTP sent!");
          setStep(2);
        } else {
          setApiError(response.message || "Failed to send OTP");
          toast.error(response.message || "Failed to send OTP");
        }
      } else {
        const response = await postData("/employees/login", {
          mobileNumber: formData.mobileNumber,
          otp: formData.otp
        });

        if (response.success && response.data && response.data.token) {
          localStorage.setItem("peparToken", response.data.token);
          if (response.data.user) {
            localStorage.setItem("adminData", JSON.stringify(response.data.user));
            localStorage.setItem("role", response.data.user.role || "user");
          }
          toast.success("Login successful!");
          navigate("/");
        } else {
          setApiError(response.message || "Invalid OTP");
          toast.error(response.message || "Invalid OTP");
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Something went wrong";
      setApiError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const response = await postData("/employees/login", {
        mobileNumber: formData.mobileNumber
      });

      if (response.success) {
        toast.success("OTP resent successfully!");
      } else {
        setApiError(response.message || "Failed to resend OTP");
        toast.error(response.message || "Failed to resend OTP");
      }
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      const errorMessage = error.response?.data?.message || "Failed to resend OTP. Please try again.";
      setApiError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="text-center mb-3 lg:mb-10">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          USER LOGIN
        </h1>
        <div className="h-1 w-12 lg:w-20 bg-brand-500 mx-auto mt-1 rounded-full"></div>
      </div>

      {apiError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl flex items-center gap-3 animate-shake">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
        {step === 1 ? (
          <div className="space-y-1 transform transition-all duration-300">
            <Input
              name="mobileNumber"
              type="tel"
              value={formData.mobileNumber}
              onChange={handleInputChange}
              placeholder="Username / Mobile"
              icon={<UserIcon className="w-5 h-5" />}
              error={!!errors.mobileNumber}
              className="bg-gray-50 border-gray-200 focus:bg-white"
            />
            {errors.mobileNumber && (
              <p className="text-xs text-red-500 ml-1">{errors.mobileNumber}</p>
            )}
          </div>
        ) : (
          <div className="space-y-1 transform transition-all duration-300">
            <Input
              name="otp"
              type="text"
              value={formData.otp}
              onChange={handleInputChange}
              placeholder="Password / OTP"
              icon={<LockIcon className="w-5 h-5" />}
              error={!!errors.otp}
              className="bg-gray-50 border-gray-200 focus:bg-white"
            />
            {errors.otp && (
              <p className="text-xs text-red-500 ml-1">{errors.otp}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer group">
            <Checkbox checked={isChecked} onChange={setIsChecked} />
            <span className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              Remember
            </span>
          </label>
          {/* <button type="button" className="text-gray-500 hover:text-brand-600 font-medium transition-colors">
            Forgot password?
          </button> */}
        </div>

        <div className="pt-2 lg:pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full relative group overflow-hidden bg-linear-to-r from-brand-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span className="relative z-10">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{step === 1 ? "Processing..." : "Verifying..."}</span>
                </div>
              ) : (
                "LOGIN"
              )}
            </span>
            <div className="absolute inset-0 bg-white/20 transform translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
          </button>
        </div>

        {step === 2 && (
          <div className="flex flex-col gap-2 text-center mt-2">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={isLoading}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50 transition-colors"
            >
              Didn't receive code? Resend OTP
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Change Mobile Number
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
