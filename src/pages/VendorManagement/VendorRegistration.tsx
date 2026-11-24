import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'react-toastify';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import ComponentCard from '../../components/common/ComponentCard';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import Select from '../../components/form/Select';
import Loader from '../../components/common/Loader';
import { postData, uploadImageAndGetUrl } from '../../utility/utility';
import { TrashBinIcon } from "../../icons";

const CloudUploadIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

interface VendorFormData {
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    alternatePhone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    gstNumber?: string;
    paperTypesSupplied?: string[];
    images?: string[];
    documents?: string[];
    notes?: string;
    isActive: boolean;
}

const VendorRegistration: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isEditing, setIsEditing] = useState(false);
    const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
    const [paperTypesInput, setPaperTypesInput] = useState('');
    const [formData, setFormData] = useState<VendorFormData>({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        alternatePhone: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
        gstNumber: '',
        paperTypesSupplied: [],
        images: [],
        documents: [],
        notes: '',
        isActive: true
    });

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState<{ images: boolean, documents: boolean }>({ images: false, documents: false });
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const [statesList, setStatesList] = useState<{ name: string }[]>([]);
    const [citiesList, setCitiesList] = useState<string[]>([]);
    const [isLoadingStates, setIsLoadingStates] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    // Fetch States on Mount
    useEffect(() => {
        const fetchStates = async () => {
            setIsLoadingStates(true);
            try {
                const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ country: "India" }),
                });
                const result = await res.json();
                if (!result.error && result.data && result.data.states) {
                    setStatesList(result.data.states);
                }
            } catch (err) {
                console.error("Error fetching states:", err);
            } finally {
                setIsLoadingStates(false);
            }
        };
        fetchStates();
    }, []);

    // Fetch Cities when State changes
    useEffect(() => {
        if (formData.state) {
            const fetchCities = async () => {
                setIsLoadingCities(true);
                try {
                    const res = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ country: "India", state: formData.state }),
                    });
                    const result = await res.json();
                    if (!result.error && result.data) {
                        setCitiesList(result.data);
                    } else {
                        setCitiesList([]);
                    }
                } catch (err) {
                    console.error("Error fetching cities:", err);
                    setCitiesList([]);
                } finally {
                    setIsLoadingCities(false);
                }
            };
            fetchCities();
        } else {
            setCitiesList([]);
        }
    }, [formData.state]);

    useEffect(() => {
        if (location.state && (location.state as any).vendor) {
            const vendor = (location.state as any).vendor;

            setIsEditing(true);
            setEditingVendorId(vendor._id);
            setFormData({
                companyName: vendor.companyName || '',
                contactPerson: vendor.contactPerson || '',
                email: vendor.email || '',
                phone: vendor.phone || '',
                alternatePhone: vendor.alternatePhone || '',
                address: vendor.address || '',
                city: vendor.city || '',
                state: vendor.state || '',
                country: vendor.country || 'India',
                gstNumber: vendor.gstNumber || '',
                paperTypesSupplied: vendor.paperTypesSupplied || [],
                images: vendor.images || [],
                documents: vendor.documents || [],
                notes: vendor.notes || '',
                isActive: vendor.isActive !== undefined ? vendor.isActive : true
            });
            setPaperTypesInput((vendor.paperTypesSupplied || []).join(', '));
        }
    }, [location.state]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (name === "phone" || name === "alternatePhone") {
            const numericValue = value.replace(/\D/g, "");
            if (numericValue.length > 10) return;
            setFormData(prev => ({ ...prev, [name]: numericValue }));
            if (fieldErrors[name]) setFieldErrors(prev => { const ne = { ...prev }; delete ne[name]; return ne; });
            return;
        }

        if (name === "gstNumber") {
            setFormData(prev => ({ ...prev, [name]: value.toUpperCase().slice(0, 15) }));
            if (fieldErrors[name]) setFieldErrors(prev => { const ne = { ...prev }; delete ne[name]; return ne; });
            return;
        }

        if (name === "state") {
            setFormData(prev => ({ ...prev, state: value, city: "" }));
            if (fieldErrors[name]) setFieldErrors(prev => { const ne = { ...prev }; delete ne[name]; return ne; });
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));

        // Clear field error when user types
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handlePaperTypesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPaperTypesInput(e.target.value);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'images' | 'documents') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(prev => ({ ...prev, [field]: true }));
        try {
            const uploadPromises = Array.from(files).map(file => uploadImageAndGetUrl(file));
            const uploadedUrls = await Promise.all(uploadPromises);

            setFormData(prev => ({
                ...prev,
                [field]: [...(prev[field] || []), ...uploadedUrls]
            }));
            toast.success(`${files.length} ${field} uploaded successfully!`);
        } catch (err: any) {
            toast.error(`Failed to upload ${field}: ${err.message}`);
        } finally {
            setUploading(prev => ({ ...prev, [field]: false }));
            e.target.value = '';
        }
    };

    const removeFile = (index: number, field: 'images' | 'documents') => {
        setFormData(prev => ({
            ...prev,
            [field]: (prev[field] || []).filter((_, i) => i !== index)
        }));
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!formData.companyName.trim()) {
            errors.companyName = 'Company name is required';
        }

        if (!formData.contactPerson.trim()) {
            errors.contactPerson = 'Contact person is required';
        }

        // Email validation
        if (!formData.email.trim()) {
            errors.email = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        // Phone validation
        if (!formData.phone.trim()) {
            errors.phone = 'Phone number is required';
        } else if (!/^\d{10}$/.test(formData.phone)) {
            errors.phone = 'Phone number must be exactly 10 digits';
        }

        // GST validation (now required)
        if (!formData.gstNumber || !formData.gstNumber.trim()) {
            errors.gstNumber = 'GST number is required';
        } else {
            const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstRegex.test(formData.gstNumber)) {
                errors.gstNumber = 'Please enter a valid GST number (e.g., 22AAAAA1234A1Z5)';
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

        // Process paper types
        const paperTypes = paperTypesInput
            .split(',')
            .map(t => t.trim())
            .filter(t => t !== '');

        const submissionData = {
            ...formData,
            paperTypesSupplied: paperTypes
        };

        try {
            let response;
            if (isEditing && editingVendorId) {
                response = await postData('/vendor/update', {
                    vendorId: editingVendorId,
                    ...submissionData
                });
            } else {
                response = await postData('/vendor/create', submissionData);
            }

            if (response && response.success) {
                toast.success(response.message || `Vendor ${isEditing ? 'updated' : 'created'} successfully!`);
                navigate('/vendor-management');
            } else {
                const errorMessage = response?.message || `Failed to ${isEditing ? 'update' : 'create'} vendor`;
                setError(errorMessage);
                toast.error(errorMessage);
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || `Failed to ${isEditing ? 'update' : 'create'} vendor`;
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageMeta
                title="Vendor Registration | Paper Cutting Service Dashboard"
                description="Create or edit a vendor for Paper Cutting service system"
            />
            <PageBreadcrumb pageTitle="Vendor Registration" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            {isEditing ? 'Edit Vendor' : 'Add New Vendor'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isEditing ? 'Update existing vendor information' : 'Register a new material vendor'}
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

                <ComponentCard title="Vendor Details">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Basic Info */}
                            <div>
                                <Label>Company Name <span className="text-error-500">*</span></Label>
                                <Input
                                    type="text"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleInputChange}
                                    placeholder="Enter company name"
                                />
                                {fieldErrors.companyName && <p className="mt-1 text-sm text-red-500">{fieldErrors.companyName}</p>}
                            </div>

                            <div>
                                <Label>Contact Person <span className="text-error-500">*</span></Label>
                                <Input
                                    type="text"
                                    name="contactPerson"
                                    value={formData.contactPerson}
                                    onChange={handleInputChange}
                                    placeholder="Enter contact person name"
                                />
                                {fieldErrors.contactPerson && <p className="mt-1 text-sm text-red-500">{fieldErrors.contactPerson}</p>}
                            </div>

                            <div>
                                <Label>Email Address <span className="text-error-500">*</span></Label>
                                <Input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="vendor@example.com"
                                />
                                {fieldErrors.email && <p className="mt-1 text-sm text-red-500">{fieldErrors.email}</p>}
                            </div>

                            <div>
                                <Label>Phone Number <span className="text-error-500">*</span></Label>
                                <Input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="1234567890"
                                />
                                {fieldErrors.phone && <p className="mt-1 text-sm text-red-500">{fieldErrors.phone}</p>}
                            </div>

                            <div>
                                <Label>Alternate Phone (Optional)</Label>
                                <Input
                                    type="tel"
                                    name="alternatePhone"
                                    value={formData.alternatePhone}
                                    onChange={handleInputChange}
                                    placeholder="Alternate number"
                                />
                            </div>

                            <div>
                                <Label>Paper Types Supplied (Optional)</Label>
                                <Input
                                    type="text"
                                    name="paperTypes"
                                    value={paperTypesInput}
                                    onChange={handlePaperTypesChange}
                                    placeholder="Kraft, Duplex, Coated (comma separated)"
                                />
                            </div>

                            {/* Address Info */}
                            <div>
                                <Label>State</Label>
                                <Select
                                    options={statesList.map(st => ({ value: st.name, label: st.name }))}
                                    value={formData.state}
                                    onChange={(val) => handleInputChange({ target: { name: 'state', value: val, type: 'select-one' } } as any)}
                                    placeholder={isLoadingStates ? "Loading states..." : "Select State"}
                                />
                            </div>

                            <div>
                                <Label>City</Label>
                                <Select
                                    options={citiesList.map(city => ({ value: city, label: city }))}
                                    value={formData.city}
                                    onChange={(val) => handleInputChange({ target: { name: 'city', value: val, type: 'select-one' } } as any)}
                                    placeholder={isLoadingCities ? "Loading cities..." : "Select City"}
                                    className={!formData.state || isLoadingCities ? "opacity-50 pointer-events-none cursor-not-allowed" : ""}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Label>Full Address</Label>
                                <Input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="Enter street address"
                                />
                            </div>

                            <div>
                                <Label>GST Number <span className="text-error-500">*</span></Label>
                                <Input
                                    type="text"
                                    name="gstNumber"
                                    value={formData.gstNumber}
                                    onChange={handleInputChange}
                                    placeholder="Enter GSTIN"
                                />
                                {fieldErrors.gstNumber && <p className="mt-1 text-sm text-red-500">{fieldErrors.gstNumber}</p>}
                            </div>

                            <div>
                                <Label>Status</Label>
                                <select
                                    name="isActive"
                                    value={formData.isActive ? "true" : "false"}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === "true" }))}
                                    className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 mt-1"
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>

                            {/* File Uploads */}
                            <div className="md:col-span-2">
                                <Label>Images (Company/Warehouse)</Label>
                                <div className="mt-2 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg text-sm font-medium hover:bg-brand-100 cursor-pointer transition-colors shadow-sm">
                                            <CloudUploadIcon className="w-5 h-5" />
                                            <span>Upload Images</span>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={(e) => handleFileChange(e, 'images')}
                                                className="hidden"
                                            />
                                        </label>
                                        {uploading.images && <Loader size="sm" />}
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {(formData.images || []).map((url, index) => (
                                            <div key={index} className="relative group aspect-square">
                                                <img src={url} alt={`Upload ${index}`} className="w-full h-full object-cover rounded-lg border border-gray-200" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index, 'images')}
                                                    className="absolute -top-2 -right-2 bg-error-500 hover:bg-error-600 text-white rounded-full p-1.5 shadow-md flex items-center justify-center transition-colors"
                                                    title="Delete Image"
                                                >
                                                    <TrashBinIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <Label>Documents (GST Cert/Agreements)</Label>
                                <div className="mt-2 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 cursor-pointer transition-colors shadow-sm">
                                            <CloudUploadIcon className="w-5 h-5" />
                                            <span>Upload Documents</span>
                                            <input
                                                type="file"
                                                multiple
                                                onChange={(e) => handleFileChange(e, 'documents')}
                                                className="hidden"
                                            />
                                        </label>
                                        {uploading.documents && <Loader size="sm" />}
                                    </div>
                                    <ul className="space-y-2">
                                        {(formData.documents || []).map((url, index) => (
                                            <li key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                                                <span className="text-sm truncate max-w-xs">{url.split('/').pop()}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index, 'documents')}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-error-50 text-error-600 hover:bg-error-100 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <TrashBinIcon className="w-4 h-4" />
                                                    <span>Remove</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <Label>Notes</Label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-transparent dark:text-white/90 mt-1"
                                    placeholder="Any additional notes about the vendor..."
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-4">
                            <Button
                                type="submit"
                                size="sm"
                                disabled={loading || uploading.images || uploading.documents}
                                className="min-w-[120px]"
                            >
                                {loading ? (
                                    <>
                                        <Loader size="sm" color="white" className="mr-2" />
                                        {isEditing ? 'Updating...' : 'Creating...'}
                                    </>
                                ) : (
                                    isEditing ? 'Update Vendor' : 'Create Vendor'
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

export default VendorRegistration;
