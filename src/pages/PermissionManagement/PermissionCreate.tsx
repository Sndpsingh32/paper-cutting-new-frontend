import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import { postData } from "../../utility/utility";
import type { Permission } from "../../types/permission";
import { Resource, Action } from "../../types/permission";

interface PermissionFormState {
  userId: string;
  permissions: Permission[];
}

export default function PermissionCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const existingPermission = location.state?.permission;
  const isEdit = location.state?.isEdit || false;
  const selectedUser = location.state?.user;

  const [formData, setFormData] = useState<PermissionFormState>({
    userId: existingPermission?.userId || selectedUser?._id || "",
    permissions: existingPermission?.permissions || []
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resourceOptions = Object.values(Resource).filter(res =>
    [
      Resource.DASHBOARD,
      Resource.USER,
      Resource.EMPLOYEE,
      Resource.VENDOR,
      Resource.NOTIFICATION,
      Resource.PERMISSION,
      Resource.REEL,
      Resource.SHEET,
      Resource.COMPANY
    ].includes(res)
  );
  const actionOptions = Object.values(Action);

  useEffect(() => {
    if (selectedUser?.permissions && !isEdit) {
      const userPermissions: Permission[] = [];
      const permissionMap = (selectedUser.permissions as any)?.permissions || selectedUser.permissions;

      Object.entries(permissionMap).forEach(([resource, actions]) => {
        if (Array.isArray(actions) && actions.length > 0) {
          const normalizedResource = resource.toLowerCase() as Resource;
          const normalizedActions = actions
            .map(action => action.toLowerCase().replace(/_/g, '-'))
            .filter(action => Object.values(Action).includes(action as Action)) as Action[];

          if (normalizedActions.length > 0 && Object.values(Resource).includes(normalizedResource)) {
            userPermissions.push({
              resource: normalizedResource,
              action: normalizedActions
            });
          }
        }
      });

      if (userPermissions.length > 0) {
        setFormData(prev => ({
          ...prev,
          permissions: userPermissions
        }));
      }
    } else if (existingPermission && isEdit) {
      setFormData({
        userId: existingPermission.userId,
        permissions: existingPermission.permissions
      });
    }
  }, [selectedUser, existingPermission, isEdit]);

  const handleActionChange = (resource: Resource, action: Action, checked: boolean) => {
    setFormData(prev => {
      const existingPermIndex = prev.permissions.findIndex(p => p.resource === resource);
      let newPermissions = [...prev.permissions];

      if (existingPermIndex > -1) {
        const currentActions = [...newPermissions[existingPermIndex].action];
        if (checked) {
          if (!currentActions.includes(action)) {
            newPermissions[existingPermIndex] = { ...newPermissions[existingPermIndex], action: [...currentActions, action] };
          }
        } else {
          newPermissions[existingPermIndex] = { ...newPermissions[existingPermIndex], action: currentActions.filter(a => a !== action) };
        }
      } else if (checked) {
        newPermissions.push({ resource, action: [action] });
      }

      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSelectAllResource = (resource: Resource, checked: boolean) => {
    setFormData(prev => {
      const existingPermIndex = prev.permissions.findIndex(p => p.resource === resource);
      let newPermissions = [...prev.permissions];

      if (checked) {
        if (existingPermIndex > -1) {
          newPermissions[existingPermIndex] = { ...newPermissions[existingPermIndex], action: [...actionOptions] };
        } else {
          newPermissions.push({ resource, action: [...actionOptions] });
        }
      } else {
        if (existingPermIndex > -1) {
          newPermissions[existingPermIndex] = { ...newPermissions[existingPermIndex], action: [] };
        }
      }

      return { ...prev, permissions: newPermissions };
    });
  };

  const handleGlobalToggle = (checked: boolean) => {
    if (checked) {
      const allPermissions = resourceOptions.map(resource => ({
        resource,
        action: [...actionOptions]
      }));
      setFormData(prev => ({ ...prev, permissions: allPermissions }));
    } else {
      setFormData(prev => ({ ...prev, permissions: [] }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const hasExistingPermissions = selectedUser?.permissions && Object.keys(selectedUser.permissions).length > 0;

    if (!hasExistingPermissions && formData.permissions.length === 0) {
      newErrors.permissions = "At least one permission is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userId = selectedUser?._id || formData.userId;
      if (!userId) {
        setErrors({ submit: "User ID is required" });
        return;
      }

      const formattedPermissions = resourceOptions.map(resource => {
        const permission = formData.permissions.find(p => p.resource === resource);
        return { resource, action: permission?.action || [] };
      });

      const hasExistingPermissions = selectedUser?.permissions && Object.keys(selectedUser.permissions).length > 0;
      const endpoint = hasExistingPermissions ? "/permissions/update" : "/permissions/create";

      const payload = {
        userId,
        permissions: formattedPermissions,
        [hasExistingPermissions ? 'updatedBy' : 'createBy']: "admin"
      };

      const response = await postData(endpoint, payload);
      if (response.success) {
        navigate(-1);
      } else {
        setErrors({ submit: response.message || "Failed to save permission" });
      }
    } catch (error) {
      console.error("Error saving permission:", error);
      setErrors({ submit: "An error occurred while saving permission" });
    } finally {
      setIsLoading(false);
    }
  };

  const isActionSelected = (resource: Resource, action: Action) => {
    const permission = formData.permissions.find(p => p.resource === resource);
    return permission?.action.includes(action) || false;
  };

  const filteredResources = resourceOptions.filter(res =>
    res.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <PageMeta
        title={`${isEdit ? "Update" : "Create"} Permission | Paper Cutting Service Dashboard`}
        description={`${isEdit ? "Update" : "Create"} user permissions for Paper Cutting service system`}
      />
      <PageBreadcrumb pageTitle={`${isEdit ? "Update" : "Create"} Permission`} />

      <div className="space-y-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEdit ? "Update Permission" : "Assign Permissions"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEdit ? "Update existing user permissions" : "Manage access control for this employee"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </div>

        {/* User Details Section */}
        {selectedUser && (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl">
                {selectedUser.fullName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">{selectedUser.fullName}</h4>
                <p className="text-sm text-gray-500">{selectedUser.email} • {selectedUser.role?.toUpperCase()}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-50 dark:border-gray-800">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone Number</span>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{selectedUser.mobileNumber}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Status</span>
                <p className="text-sm font-semibold">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${selectedUser.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {selectedUser.isBlocked ? "Blocked" : "Active"}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">User ID</span>
                <p className="text-sm font-mono text-gray-500">{selectedUser._id}</p>
              </div>
            </div>
          </div>
        )}

        <ComponentCard title="Permission Configuration">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleGlobalToggle(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 py-2 px-4 rounded-xl transition-colors"
                >
                  Grant All Permissions
                </button>
                <button
                  type="button"
                  onClick={() => handleGlobalToggle(false)}
                  className="text-xs font-bold text-gray-600 hover:text-gray-700 bg-gray-50 py-2 px-4 rounded-xl transition-colors"
                >
                  Revoke All
                </button>
              </div>
            </div>

            {errors.permissions && (
              <p className="text-sm font-bold text-red-600 bg-red-50 p-3 rounded-xl">{errors.permissions}</p>
            )}

            <div className="border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Resource Name</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Available Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-50 dark:divide-gray-800">
                  {filteredResources.map((resource) => {
                    const isAllSelected = actionOptions.every(action => isActionSelected(resource, action));

                    return (
                      <tr key={resource} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${isAllSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                              {resource.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-gray-900 dark:text-gray-100">
                              {resource.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-4">
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={(e) => handleSelectAllResource(resource, e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="text-xs font-black uppercase tracking-tighter text-blue-600 group-hover:underline">Select All</span>
                            </label>
                            <div className="flex flex-wrap gap-4">
                              {actionOptions.map(action => (
                                <label key={action} className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={isActionSelected(resource, action)}
                                    onChange={(e) => handleActionChange(resource, action, e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900 transition-colors uppercase">
                                    {action}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredResources.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-6 py-10 text-center text-sm text-gray-500">
                        No resources found matching "{searchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-red-600">{errors.submit}</p>
              </div>
            )}

            <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-50 dark:border-gray-800">
              <div className="mr-auto hidden md:block">
                <p className="text-xs text-gray-400">Selected Permissions: <span className="font-bold text-gray-900 dark:text-gray-100">{formData.permissions.reduce((acc, p) => acc + p.action.length, 0)}</span></p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="px-8"
              >
                {isLoading ? "Saving..." : (isEdit ? "Update Permissions" : "Save Changes")}
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}
