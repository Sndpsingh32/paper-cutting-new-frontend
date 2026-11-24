import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'react-toastify';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import ComponentCard from '../../components/common/ComponentCard';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import Loader from '../../components/common/Loader';
import type { UserRegistration, User } from '../../types/user';
import { postData, formatDateToYYYYMMDD } from '../../utility/utility';
import { useProfile } from '../../context/ProfileContext';
import Switch from '../../components/form/switch/Switch';

const UserRegistration: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserRegistration>({
    mobileNumber: '',
    fullName: '',
    email: '',
    gender: 'male',
    dob: '',
    isBlocked: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const availableRoles = useMemo(() => {
    const currentUserRole = profile?.role?.toLowerCase();

    switch (currentUserRole) {
      case 'superadmin':
        return [
          { value: 'user', label: 'Regular User' },
          { value: 'franchise', label: 'Franchise' },
          { value: 'serviceProvider', label: 'Service Provider' }
        ];
      case 'franchise':
        return [
          { value: 'user', label: 'Regular User' },
          { value: 'serviceProvider', label: 'Service Provider' }
        ];
      default:
        return [
          { value: 'user', label: 'Regular User' }
        ];
    }
  }, [profile?.role]);

  useEffect(() => {
    if (location.state && (location.state as any).user) {
      const user = (location.state as any).user as User;

      setIsEditing(true);
      setEditingUserId(user._id);
      setFormData({
        mobileNumber: user.mobileNumber,
        fullName: user.fullName,
        email: user.email,
        role: user.role as 'superadmin' | 'franchise' | 'serviceProvider' | 'user',
        location: user.location,
        gender: user.gender as 'male' | 'female' | 'other' || 'male',
        dob: user.dob ? formatDateToYYYYMMDD(new Date(user.dob)) : '',
        isBlocked: user.isBlocked || false
      });
    } else {
      if (availableRoles.length > 0 && !formData.role) {
        setFormData(prev => ({
          ...prev,
          role: availableRoles[0].value as 'superadmin' | 'franchise' | 'serviceProvider' | 'user'
        }));
      }
    }
  }, [location.state, availableRoles]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.mobileNumber) {
      const errorMsg = 'Mobile number is required';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      return;
    }

    if (!/^\d{10}$/.test(formData.mobileNumber)) {
      const errorMsg = 'Mobile number must be exactly 10 digits';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      const errorMsg = 'Please provide a valid email address';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      return;
    }

    try {
      if (isEditing && editingUserId) {
        const res = await postData('/users/update', {
          userId: editingUserId,
          fullName: formData.fullName,
          email: formData.email,
          mobileNumber: formData.mobileNumber,
          role: formData.role,
          location: formData.location,
          isBlocked: formData.isBlocked
        });

        if (res.success) {
          toast.success('User updated successfully!');
          setFormData({
            mobileNumber: '',
            fullName: '',
            email: '',
            gender: 'male',
            dob: '',
            isBlocked: false,
            role: 'user'
          });
          navigate('/user-management');
        } else {
          toast.error(res.message || 'Failed to update user');
        }
      } else {
        const res = await postData('/users/create', formData);
        if (res.success) {
          toast.success('User created successfully!');
          setFormData({
            mobileNumber: '',
            fullName: '',
            email: '',
            gender: 'male',
            dob: '',
            isBlocked: false,
            role: 'user'
          });
          navigate('/user-management');
        } else {
          toast.error(res.message || 'Failed to register user');
        }
      }
    } catch (err: any) {
      const rawMessage = err.response?.data?.message || err.message || `Failed to ${isEditing ? 'update' : 'register'} user`;
      const finalMessage = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;
      setError(finalMessage);
      toast.error(finalMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="User Registration | Paper Cutting Service Dashboard"
        description="Register a new user for Paper Cutting service system"
      />
      <PageBreadcrumb pageTitle="User Registration" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {isEditing ? 'Edit User' : 'Add New User'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEditing ? 'Update existing user information' : 'Create a new user account for your business'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            ← Back
          </Button>
        </div>

        <ComponentCard title="User Information">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>
                  Full Name <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <Label>
                  Email Address
                </Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <Label>
                  Mobile Number <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  placeholder="Enter mobile number"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter a 10-digit mobile number
                </p>
              </div>


              <div>
                <Label>Gender</Label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 mt-1"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  max={formatDateToYYYYMMDD(new Date())}
                />
              </div>

              <div>
                <Label>Block Status</Label>
                <div className="mt-2">
                  <Switch
                    label={formData.isBlocked ? "Blocked" : "Active"}
                    checked={formData.isBlocked}
                    onChange={(checked) => setFormData(prev => ({ ...prev, isBlocked: checked }))}
                  />
                </div>
              </div>

            </div>

            {/* <LocationPicker
              value={formData.location}
              onChange={handleLocationChange}
            /> */}

            <div className="flex items-center gap-3 pt-4">
              <Button
                type="submit"
                size="sm"
                disabled={loading || availableRoles.length === 0}
                className="min-w-[120px]"
              >
                {loading ? (
                  <>
                    <Loader size="sm" color="white" className="mr-2" />
                    {isEditing ? 'Updating...' : 'Registering...'}
                  </>
                ) : (
                  isEditing ? 'Update User' : 'Register User'
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
};

export default UserRegistration;
