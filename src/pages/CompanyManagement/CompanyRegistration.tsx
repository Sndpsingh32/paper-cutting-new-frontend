import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { postData, uploadImageAndGetUrl } from "../../utility/utility";
import { toast } from "react-toastify";
import { TrashBinIcon } from "../../icons";

const PhotoIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const CloudUploadIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

export default function CompanyRegistration() {
    const navigate = useNavigate();
    const location = useLocation();
    const editData = location.state?.company;

    const [isLoading, setIsLoading] = useState(false);
    const [statesList, setStatesList] = useState<{name: string}[]>([]);
    const [citiesList, setCitiesList] = useState<string[]>([]);
    const [isLoadingStates, setIsLoadingStates] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    const [formData, setFormData] = useState({
        companyName: "",
        contactPerson: "",
        email: "",
        phone: "",
        alternatePhone: "",
        city: "",
        state: "",
        address: "",
        gstNumber: "",
        type: (location.state?.defaultType as "buyer" | "seller") || "buyer",
        website: "",
        logo: "",
        notes: "",
        isActive: true,
    });

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
        if (editData) {
            setFormData({
                companyName: editData.companyName || "",
                contactPerson: editData.contactPerson || "",
                email: editData.email || "",
                phone: editData.phone || "",
                alternatePhone: editData.alternatePhone || "",
                city: editData.city || "",
                state: editData.state || "",
                address: editData.address || "",
                gstNumber: editData.gstNumber || "",
                type: (editData.type as "buyer" | "seller") || "buyer",
                website: editData.website || "",
                logo: editData.logo || "",
                notes: editData.notes || "",
                isActive: editData.isActive ?? true,
            });
        }
    }, [editData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (name === "phone" || name === "alternatePhone") {
            const numericValue = value.replace(/\D/g, "");
            if (numericValue.length > 10) return;
            setFormData((prev) => ({
                ...prev,
                [name]: numericValue,
            }));
            return;
        }

        if (name === "gstNumber") {
            setFormData((prev) => ({
                ...prev,
                [name]: value.toUpperCase().slice(0, 15),
            }));
            return;
        }

        if (name === "state") {
            setFormData((prev) => ({
                ...prev,
                state: value,
                city: "", // Reset city when state changes
            }));
            return;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsLoading(true);
            const url = await uploadImageAndGetUrl(file);
            setFormData(prev => ({ ...prev, logo: url }));
            toast.success("Logo uploaded successfully");
        } catch (error) {
            toast.error("Logo upload failed");
        } finally {
            setIsLoading(false);
            e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // GST must be provided
        if (!formData.gstNumber || !formData.gstNumber.trim()) {
            toast.error('GST number is required');
            return;
        }

        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(formData.gstNumber)) {
            toast.error('Please enter a valid GST number (e.g., 22AAAAA1234A1Z5)');
            return;
        }

        if (formData.phone.length !== 10) {
            toast.error('Phone number must be exactly 10 digits');
            return;
        }

        if (formData.alternatePhone && formData.alternatePhone.length !== 10) {
            toast.error('Alternate phone number must be exactly 10 digits');
            return;
        }

        try {
            setIsLoading(true);
            const endpoint = editData ? "/company/update" : "/company/create";
            const payload = editData ? { ...formData, companyId: editData._id } : formData;

            const response = await postData(endpoint, payload);
            if (response.success) {
                toast.success(editData ? "Saved successfully" : "Registered successfully");
                // Navigate back to the appropriate list
                if (formData.type === 'seller') {
                    navigate("/user-list");
                } else {
                    navigate("/buyer-list");
                }
            } else {
                toast.error(response.message || "Operation failed");
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <PageMeta
                title={`${editData ? "Edit" : "Register"} Company | Admin Dashboard`}
                description="Manage company registration"
            />
            <PageBreadcrumb pageTitle={editData ? "Edit Company" : "Register Company"} />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            {editData ? "Edit Company" : "Register Company"}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {editData ? "Update existing company information" : "Create a new company account"}
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
                <ComponentCard title="Company Details">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <Label>Company Name <span className="text-error-500">*</span></Label>
                                <Input
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleInputChange}
                                    placeholder="Enter company name"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Contact Person <span className="text-error-500">*</span></Label>
                                <Input
                                    name="contactPerson"
                                    value={formData.contactPerson}
                                    onChange={handleInputChange}
                                    placeholder="Enter contact person name"
                                    required
                                />
                            </div>


                            <div className="space-y-1">
                                <Label>Phone Number <span className="text-error-500">*</span></Label>
                                <Input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="Enter primary phone number"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Alternate Phone</Label>
                                <Input
                                    name="alternatePhone"
                                    value={formData.alternatePhone}
                                    onChange={handleInputChange}
                                    placeholder="Enter alternate phone number"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Email Address <span className="text-error-500">*</span></Label>
                                <Input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="Enter company email"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>State <span className="text-error-500">*</span></Label>
                                <Select
                                    options={statesList.map(st => ({ value: st.name, label: st.name }))}
                                    value={formData.state}
                                    onChange={(val) => handleInputChange({ target: { name: 'state', value: val, type: 'select-one' } } as any)}
                                    placeholder={isLoadingStates ? "Loading states..." : "Select State"}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>City <span className="text-error-500">*</span></Label>
                                <Select
                                    options={citiesList.map(city => ({ value: city, label: city }))}
                                    value={formData.city}
                                    onChange={(val) => handleInputChange({ target: { name: 'city', value: val, type: 'select-one' } } as any)}
                                    placeholder={isLoadingCities ? "Loading cities..." : "Select City"}
                                    className={!formData.state || isLoadingCities ? "opacity-50 pointer-events-none cursor-not-allowed" : ""}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>GST Number <span className="text-error-500">*</span></Label>
                                <Input
                                    name="gstNumber"
                                    value={formData.gstNumber}
                                    onChange={handleInputChange}
                                    placeholder="Enter GST number"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Website</Label>
                                <Input
                                    name="website"
                                    value={formData.website}
                                    onChange={handleInputChange}
                                    placeholder="e.g. www.example.com"
                                />
                            </div>

                            <div className="md:col-span-2 space-y-1">
                                <Label>Address <span className="text-error-500">*</span></Label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    rows={2}
                                    className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                    placeholder="Enter complete office address"
                                    required
                                />
                            </div>
                        </div>

                        {/* Logo Upload Section */}
                        <div className="space-y-4">
                            <Label>Company Logo (Optional)</Label>
                            <div className="flex items-center gap-6">
                                <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 overflow-hidden relative group">
                                    {formData.logo ? (
                                        <>
                                            <img src={formData.logo} alt="Logo Preview" className="h-full w-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, logo: "" }))}
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <TrashBinIcon className="h-5 w-5 text-white" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-[#811f13] to-[#a0321f] flex flex-col items-center justify-center">
                                            <span className="text-white text-2xl font-bold uppercase">
                                                {formData.companyName ? formData.companyName.charAt(0) : <PhotoIcon className="h-8 w-8 text-white/50" />}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                                        <CloudUploadIcon className="h-4 w-4" />
                                        Upload Logo
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isLoading} />
                                    </label>
                                    <p className="mt-2 text-xs text-gray-500">PNG, JPG or SVG. Max 2MB.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <Label>Additional Notes</Label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows={2}
                                    className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                    placeholder="Any extra information..."
                                />
                            </div>

                            <div className="flex items-center space-x-3 pt-6">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                    className="h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                />
                                <Label htmlFor="isActive" className="mb-0 cursor-pointer">Active Status</Label>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-4">
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isLoading}
                                className="min-w-[120px]"
                            >
                                {isLoading ? "Saving..." : (editData ? "Update Company" : "Register Company")}
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
}
