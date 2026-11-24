import React, { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import Switch from "../../components/form/switch/Switch";
import { postData } from "../../utility/utility";
import { toast } from "react-toastify";
import Loader from "../../components/common/Loader";
import { Settings as SettingsType } from "../../types/settings";

const Settings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsList, setSettingsList] = useState<any[]>([]);
  const [formData, setFormData] = useState<SettingsType>({
    referralCoinsForReferrer: 0,
    referralCoinsForReferred: 0,
    referralEnabled: false,
    minimumWithdrawalAmount: 100,
    referRewardEnabled: true,
    referRewardAmount: 50,
    supportEmail: "",
    supportPhone: "",
    supportWhatsApp: "",
    facebookUrl: "",
    instagramUrl: "",
    twitterUrl: "",
  });


  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await postData("/setting/get", {});

      if (response.success && response.data?.settings && response.data.settings.length > 0) {
         setSettingsList(response.data.settings);
        const settingsData = response.data.settings[0];
        setFormData({
          ...formData,
          minimumWithdrawalAmount: settingsData.minimumWithdrawalAmount || 100,
          referRewardEnabled: settingsData.referRewardEnabled || true,
          referRewardAmount: settingsData.referRewardAmount || 50,
        });
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error(error?.message || "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSwitchChange = (fieldName: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      const payload = {
        minimumWithdrawalAmount: formData.minimumWithdrawalAmount,
        referRewardEnabled: formData.referRewardEnabled,
        referRewardAmount: formData.referRewardAmount,
      };

      const response = await postData("/setting", payload);

      if (response.success) {
        toast.success(response.message || "Settings saved successfully");
        fetchSettings();
      }
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error?.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader size="lg" color="primary" />
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Settings - Paper Cutting Admin"
        description="Manage application settings and configurations"
      />
      <PageBreadCrumb pageTitle="Settings" />
      <div className="space-y-6">
          <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                ⚙️ Settings
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Manage withdrawal limits and referral rewards
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 dark:bg-green-900/30">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings List */}
        <ComponentCard title="📋 Settings History" className="border-0 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left pb-3 text-sm font-semibold text-gray-900 dark:text-white">ID</th>
                  <th className="text-left pb-3 text-sm font-semibold text-gray-900 dark:text-white">Min Withdrawal</th>
                  <th className="text-left pb-3 text-sm font-semibold text-gray-900 dark:text-white">Reward Enabled</th>
                  <th className="text-left pb-3 text-sm font-semibold text-gray-900 dark:text-white">Reward Amount</th>
                  <th className="text-left pb-3 text-sm font-semibold text-gray-900 dark:text-white">Created By</th>
                  <th className="text-left pb-3 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {settingsList.length > 0 ? (
                  settingsList.map((setting, index) => (
                    <tr key={setting.settingId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 text-sm text-gray-600 dark:text-gray-400">#{String(index + 1).padStart(3, '0')}</td>
                      <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">₹{setting.minimumWithdrawalAmount}</td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          setting.referRewardEnabled 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {setting.referRewardEnabled ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">{setting.referRewardAmount} 🪙</td>
                      <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{setting.createdBy?.fullName || 'Unknown'}</div>
                          <div className="text-xs">{setting.createdBy?.email || ''}</div>
                        </div>
                      </td>
                      <td className="py-3">
                        <button
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>No settings found</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ComponentCard>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Withdrawal Settings */}
            <ComponentCard title="💰 Withdrawal Settings" className="h-fit border-0 shadow-xl">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="minimumWithdrawalAmount"
                    className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                  >
                    Minimum Withdrawal Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      id="minimumWithdrawalAmount"
                      name="minimumWithdrawalAmount"
                      value={formData.minimumWithdrawalAmount}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pl-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-500"
                      placeholder="100"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">INR</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Users must have at least this amount to request withdrawal
                  </p>
                </div>
              </div>
            </ComponentCard>

            {/* Reward Settings */}
            <ComponentCard title="🎁 Reward Settings" className="h-fit border-0 shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Enable Refer Rewards
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Allow users to earn rewards for referrals
                    </p>
                  </div>
                  <Switch
                    label=""
                    checked={formData.referRewardEnabled}
                    onChange={(checked) => handleSwitchChange('referRewardEnabled', checked)}
                    color="blue"
                  />
                </div>

                <div className={`space-y-2 ${!formData.referRewardEnabled && 'opacity-50'}`}>
                  <label
                    htmlFor="referRewardAmount"
                    className="block text-sm font-medium text-gray-900 dark:text-white"
                  >
                    Reward Amount per Referral
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      🪙
                    </span>
                    <input
                      type="number"
                      id="referRewardAmount"
                      name="referRewardAmount"
                      value={formData.referRewardAmount || ''}
                      onChange={handleInputChange}
                      min="0"
                      disabled={!formData.referRewardEnabled}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pl-8 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-green-500"
                      placeholder="50"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Coins</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Amount of coins awarded for each successful referral
                  </p>
                </div>
              </div>
            </ComponentCard>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 rounded-xl bg-gray-50 p-6 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Save Changes
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Apply the new settings to your application
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchSettings}
                  disabled={isSaving}
                  className="h-9 px-4 text-sm"
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="h-9 px-4 text-sm"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <Loader size="sm" color="white" />
                      Saving...
                    </span>
                  ) : (
                    'Save Settings'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default Settings;
