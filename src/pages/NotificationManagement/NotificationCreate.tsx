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
import { postData } from '../../utility/utility';
import { GroupIcon, UserCircleIcon, BoxIcon } from '../../icons';

interface NotificationFormData {
    title: string;
    description: string;
    targetGroup: 'all' | 'employees' | 'vendors';
    receiverType?: 'employee' | 'vendor' | 'both';
    scheduledAt?: string;
}

const NotificationCreate: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isEditing, setIsEditing] = useState(false);
    const [editingNotificationId, setEditingNotificationId] = useState<string | null>(null);
    const formatToLocalISO = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const [formData, setFormData] = useState<NotificationFormData>({
        title: '',
        description: '',
        targetGroup: 'all',
        receiverType: 'both',
        scheduledAt: formatToLocalISO(new Date())
    });

    const minDateTime = formatToLocalISO(new Date());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (location.state && (location.state as any).notification) {
            const notification = (location.state as any).notification;
            setIsEditing(true);
            setEditingNotificationId(notification._id);
            setFormData({
                title: notification.title || '',
                description: notification.description || '',
                targetGroup: notification.targetGroup || 'all',
                receiverType: notification.receiverType || 'both',
                scheduledAt: notification.scheduledAt ? formatToLocalISO(new Date(notification.scheduledAt)) : formatToLocalISO(new Date())
            });
        }
    }, [location.state]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'targetGroup') {
            let receiverType: 'employee' | 'vendor' | 'both' = 'both';
            if (value === 'employees') receiverType = 'employee';
            if (value === 'vendors') receiverType = 'vendor';

            setFormData(prev => ({
                ...prev,
                targetGroup: value as any,
                receiverType
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }

        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!formData.title.trim()) {
            errors.title = 'Title is required';
        }

        if (!formData.description.trim()) {
            errors.description = 'Description is required';
        }

        if (!formData.targetGroup) {
            errors.targetGroup = 'Target group is required';
        }

        if (formData.scheduledAt) {
            const selectedDate = new Date(formData.scheduledAt);
            const now = new Date();
            if (selectedDate < now) {
                errors.scheduledAt = 'Scheduled time cannot be in the past';
                toast.error('Scheduled time cannot be in the past');
            }
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
            if (isEditing && editingNotificationId) {
                response = await postData('/notifications-admin/update', {
                    notificationId: editingNotificationId,
                    ...formData
                });
            } else {
                response = await postData('/notifications-admin/create', formData);
            }

            if (response && response.success) {
                toast.success(response.message || `Notification ${isEditing ? 'updated' : 'created'} successfully!`);
                navigate('/notification-management');
            } else {
                const errorMessage = response?.message || `Failed to ${isEditing ? 'update' : 'send'} notification`;
                setError(errorMessage);
                toast.error(errorMessage);
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || `Failed to ${isEditing ? 'update' : 'send'} notification`;
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageMeta
                title="Send Notification | Paper Cutting Service Dashboard"
                description="Send or schedule a notification for employees and vendors"
            />
            <PageBreadcrumb pageTitle="Send Notification" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            {isEditing ? 'Edit Notification' : 'Send New Notification'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isEditing ? 'Update existing notification details' : 'Broadcast a message to your team'}
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

                <ComponentCard title="Notification Details">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <Label>
                                    Message Title <span className="text-error-500">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="Enter notification title"
                                />
                                {fieldErrors.title && <p className="mt-1 text-sm text-red-500">{fieldErrors.title}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <Label>
                                    Message Description <span className="text-error-500">*</span>
                                </Label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange as any}
                                    placeholder="Enter your message here..."
                                    rows={4}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-transparent dark:text-white/90 mt-1"
                                />
                                {fieldErrors.description && <p className="mt-1 text-sm text-red-500">{fieldErrors.description}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <Label>Audience Targeting <span className="text-error-500">*</span></Label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-1">
                                    {[
                                        { id: 'all', label: 'All', sub: 'Employees & Vendors', icon: <GroupIcon className="w-6 h-6" /> },
                                        { id: 'employees', label: 'Employees', sub: 'Staff Only', icon: <UserCircleIcon className="w-6 h-6" /> },
                                        { id: 'vendors', label: 'Vendors', sub: 'Suppliers Only', icon: <BoxIcon className="w-6 h-6" /> }
                                    ].map((option) => {
                                        const isActive = formData.targetGroup === option.id;
                                        return (
                                            <div
                                                key={option.id}
                                                onClick={() => handleInputChange({ target: { name: 'targetGroup', value: option.id } } as any)}
                                                className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all flex flex-col items-center text-center gap-2 group ${isActive
                                                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 shadow-lg shadow-brand-500/10'
                                                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-brand-200'
                                                    }`}
                                            >
                                                <div className={`p-3 rounded-full transition-colors ${isActive ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:text-brand-500'
                                                    }`}>
                                                    {option.icon}
                                                </div>
                                                <div>
                                                    <p className={`font-bold text-sm ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {option.label}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-medium">
                                                        {option.sub}
                                                    </p>
                                                </div>
                                                {isActive && (
                                                    <div className="absolute top-2 right-2">
                                                        <div className="w-4 h-4 bg-brand-500 rounded-full flex items-center justify-center">
                                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                {fieldErrors.targetGroup && <p className="mt-1 text-sm text-red-500">{fieldErrors.targetGroup}</p>}
                            </div>

                            <div>
                                <Label>Schedule Delivery (Optional)</Label>
                                <Input
                                    type="datetime-local"
                                    name="scheduledAt"
                                    value={formData.scheduledAt}
                                    onChange={handleInputChange}
                                    min={minDateTime}
                                    error={!!fieldErrors.scheduledAt}
                                />
                                {fieldErrors.scheduledAt ? (
                                    <p className="mt-1 text-xs text-red-500">{fieldErrors.scheduledAt}</p>
                                ) : (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Leave as current time to send immediately. Past dates/times are disabled.
                                    </p>
                                )}
                            </div>
                        </div>

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
                                        {isEditing ? 'Updating...' : 'Sending...'}
                                    </>
                                ) : (
                                    isEditing ? 'Update Notification' : 'Send Notification'
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

export default NotificationCreate;
