import React from "react";



export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative bg-white z-1 dark:bg-gray-900">
      <div className="relative flex flex-col items-center justify-start lg:justify-center w-full min-h-screen lg:flex-row">
        {/* Left Side: Illustration (Hidden on Mobile) */}
        <div className="hidden lg:flex w-full lg:w-1/2 min-h-screen bg-gray-50 dark:bg-white/5 items-center justify-center p-4 lg:p-12">
          <div className="relative w-full lg:max-w-2xl transform transition-all duration-500 hover:scale-105">
            <img
              src="/images/warehouse-no-text.png"
              alt="Warehouse Illustration"
              className="w-full h-auto drop-shadow-2xl rounded-2xl"
            />
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex flex-col justify-center items-center w-full max-w-md px-6 py-8 sm:px-12 lg:flex-1 lg:max-w-xl lg:px-20 lg:py-12 bg-white dark:bg-gray-900 mx-auto">
          {/* Company Logo */}
          <div className="mb-8 flex justify-center w-full">
            <div className="flex items-center justify-center gap-3">
              <div className="p-1.5 bg-white rounded-xl overflow-hidden border border-gray-100 shadow-xs dark:border-white/5 dark:bg-gray-800">
                <img
                  src="/images/papercutting.png"
                  alt="Logo"
                  className="h-10 w-10 object-cover rounded-lg"
                />
              </div>
              <div className="flex flex-col items-start w-max text-left">
                <span className="text-[18px] font-black leading-none tracking-tighter">
                  <span className="text-brand-500">JAIN </span>
                  <span className="text-black dark:text-white">TRADE </span>
                  <span className="text-[#cc2839]">LINKS</span>
                </span>
                <span className="text-[8px] font-black uppercase text-accent-500 tracking-[0.2em] mt-1">
                  Any Size. Any Time
                </span>
              </div>
            </div>
          </div>
          <div className="w-full text-center sm:text-left">
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}
