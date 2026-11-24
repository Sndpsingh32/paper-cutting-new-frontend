import { useProfile } from "../../context/ProfileContext";

export default function UserInfoCard() {
  const { profile } = useProfile();

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const InfoItem = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
    <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-white/5 group hover:border-brand-500/30 transition-all duration-300">
      <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 text-brand-500 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">
          {label}
        </p>
        <p className="text-sm font-bold text-gray-800 dark:text-white truncate max-w-[180px]">
          {value || "N/A"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-3xl dark:border-gray-800 dark:bg-white/5 shadow-sm lg:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-6 bg-brand-500 rounded-full"></div>
        <h4 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
          Account Details
        </h4>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <InfoItem label="Full Name" value={profile?.fullName || ""} icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        } />
        <InfoItem label="Email Address" value={profile?.email || ""} icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        } />
        <InfoItem label="Phone Number" value={profile?.mobileNumber || ""} icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
        } />
        <InfoItem label="Gender" value={profile?.gender || ""} icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
        } />
        <div className="lg:col-span-2">
          <InfoItem label="Date of Birth" value={formatDate(profile?.dob || "")} icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          } />
        </div>
      </div>
    </div>
  );
}
