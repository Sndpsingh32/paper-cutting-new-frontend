import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode; // Button text or content
  size?: "sm" | "md"; // Button size
  variant?: "primary" | "outline" | "danger"; // Button variant
  startIcon?: ReactNode; // Icon before the text
  endIcon?: ReactNode; // Icon after the text
  onClick?: () => void; // Click handler
  disabled?: boolean; // Disabled state
  className?: string; // Additional CSS classes
  type?: "button" | "submit" | "reset"; // Button type
  form?: string; // Form id to link with
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  type = "button",
  form,
}) => {
  // Size Classes
  const sizeClasses = {
    sm: "px-4 py-3 text-sm",
    md: "px-5 py-3.5 text-sm",
  };

  // Variant Classes
  const variantClasses = {
    primary:
      "bg-gradient-to-r from-[#0084C1] to-[#005a84] text-white shadow-theme-xs hover:from-[#0071a3] hover:to-[#004266] disabled:from-brand-200 disabled:to-brand-300",
    outline:
      "bg-white text-[#0084C1] ring-1 ring-inset ring-[#0084C1]/20 hover:bg-[#0084C1]/5 dark:bg-gray-900 dark:text-[#00a3ed] dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-[#00a3ed]",
    danger:
      "bg-[#E31B23] text-white shadow-theme-xs hover:bg-[#c6161f] disabled:bg-[#ffadad]",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition ${className} ${sizeClasses[size]
        } ${variantClasses[variant]} ${disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
      onClick={onClick}
      disabled={disabled}
      type={type}
      form={form}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
