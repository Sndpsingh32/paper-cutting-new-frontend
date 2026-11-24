import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'react-toastify';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import ComponentCard from '../../components/common/ComponentCard';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import Loader from '../../components/common/Loader';
import LocationPicker from '../../components/location/LocationPicker';
import { postData, formatDateToYYYYMMDD } from '../../utility/utility';
import type { Location } from '../../types/user';
import DatePicker from '../../components/form/date-picker';

const fiveYearsAgo = new Date();
fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

interface EmployeeFormData {
    mobileNumber: string;
    fullName: string;
    email: string;
    role?: string;
    gender?: 'male' | 'female' | 'other';
    dob?: string;
    isBlocked?: boolean;
    location?: Location;
}

const EmployeeRegistration: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isEditing, setIsEditing] = useState(false);
    const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
    const [formData, setFormData] = useState<EmployeeFormData>({
        mobileNumber: '',
        fullName: '',
        email: '',
        role: 'employee',
        gender: 'male',
        dob: '',
        isBlocked: false,
        location: undefined
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (location.state && (location.state as any).employee) {
            const employee = (location.state as any).employee;

            setIsEditing(true);
            setEditingEmployeeId(employee._id);
            setFormData({
                mobileNumber: employee.mobileNumber || '',
                fullName: employee.fullName || '',
                email: employee.email || '',
                role: employee.role || 'employee',
                gender: employee.gender || 'male',
                dob: employee.dob ? formatDateToYYYYMMDD(new Date(employee.dob)) : '',
                isBlocked: employee.isBlocked || false,
                location: employee.location
            });
        }
    }, [location.state]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === "mobileNumber") {
            const numericValue = value.replace(/\D/g, "");
            if (numericValue.length > 10) return;
            setFormData(prev => ({ ...prev, [name]: numericValue }));
            if (fieldErrors[name]) {
                setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[name];
                    return newErrors;
                });
            }
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleLocationChange = (location: Location | undefined) => {
        setFormData(prev => ({
            ...prev,
            location
        }));
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!formData.fullName.trim()) {
            errors.fullName = 'Full name is required';
        }

        if (!formData.email.trim()) {
            errors.email = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (!formData.mobileNumber.trim()) {
            errors.mobileNumber = 'Mobile number is required';
        } else if (!/^\d{10}$/.test(formData.mobileNumber)) {
            errors.mobileNumber = 'Mobile number must be exactly 10 digits';
        }



        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let response;
            if (isEditing && editingEmployeeId) {
                response = await postData('/employees/update', {
                    employeeId: editingEmployeeId,
                    ...formData
                });
            } else {
                response = await postData('/employees/create', formData);
            }

            if (response && response.success) {
                toast.success(response.message || `Employee ${isEditing ? 'updated' : 'created'} successfully!`);
                navigate('/employee-management');
            } else {
                const errorMessage = response?.message || `Failed to ${isEditing ? 'update' : 'create'} employee`;
                setError(errorMessage);
                toast.error(errorMessage);
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || `Failed to ${isEditing ? 'update' : 'create'} employee`;
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageMeta
                title="Employee Registration | Paper Cutting Service Dashboard"
                description="Create or edit an employee for Paper Cutting service system"
            />
            <PageBreadcrumb pageTitle="Employee Registration" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            {isEditing ? 'Edit Employee' : 'Add New Employee'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isEditing ? 'Update existing employee information' : 'Create a new super admin/staff account'}
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

                <ComponentCard title="Employee Details">
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
                                {fieldErrors.fullName && <p className="mt-1 text-sm text-red-500">{fieldErrors.fullName}</p>}
                            </div>

                            <div>
                                <Label>
                                    Email Address <span className="text-error-500">*</span>
                                </Label>
                                <Input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="Enter email address"
                                />
                                {fieldErrors.email && <p className="mt-1 text-sm text-red-500">{fieldErrors.email}</p>}
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
                                    placeholder="9898123456"
                                />
                                {fieldErrors.mobileNumber && <p className="mt-1 text-sm text-red-500">{fieldErrors.mobileNumber}</p>}
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
                                <DatePicker
                                    id="dob"
                                    label="Date of Birth"
                                    defaultDate={formData.dob}
                                    maxDate={fiveYearsAgo}
                                    onChange={(dates) => {
                                        if (dates && dates[0]) {
                                            setFormData(prev => ({
                                                ...prev,
                                                dob: formatDateToYYYYMMDD(dates[0])
                                            }));
                                        }
                                    }}
                                    placeholder="Select date of birth"
                                />
                            </div>

                            <div>
                                <Label>Account Status</Label>
                                <select
                                    name="isBlocked"
                                    value={formData.isBlocked ? "true" : "false"}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isBlocked: e.target.value === "true" }))}
                                    className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 mt-1"
                                >
                                    <option value="false">Active</option>
                                    <option value="true">Blocked</option>
                                </select>
                            </div>
                        </div>

                        <LocationPicker
                            value={formData.location}
                            onChange={handleLocationChange}
                        />

                        <div className="flex items-center gap-3 pt-4">
                            <Button
                                type="submit"
                                size="sm"
                                disabled={loading}
                                className="min-w-[120px]"
                            >
                                {loading ? (
                                    <>
                                        <Loader size="sm" color="white" className="mr-2" />
                                        {isEditing ? 'Updating...' : 'Creating...'}
                                    </>
                                ) : (
                                    isEditing ? 'Update Employee' : 'Create Employee'
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

export default EmployeeRegistration;
