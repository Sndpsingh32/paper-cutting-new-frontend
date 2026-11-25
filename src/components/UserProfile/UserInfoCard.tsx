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
    <div className="group flex items-start gap-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 transition-all duration-200 hover:border-brand-200 hover:bg-white hover:shadow-sm dark:border-gray-800 dark:bg-gray-800/40 dark:hover:border-brand-500/30 dark:hover:bg-gray-800">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:text-brand-400 dark:ring-gray-700">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white sm:text-base">
          {value || "N/A"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/60 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Personal Info
          </div>
          <h3 className="mt-3 text-xl font-black tracking-tight text-gray-900 dark:text-white">
            Account Details
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your basic profile information used across the system.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <div className="md:col-span-2">
          <InfoItem label="Date of Birth" value={formatDate(profile?.dob || "")} icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          } />
        </div>
      </div>
    </div>
  );
}
