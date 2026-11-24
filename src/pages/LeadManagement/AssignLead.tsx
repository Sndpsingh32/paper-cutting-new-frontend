import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import ComponentCard from '../../components/common/ComponentCard';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import Loader from '../../components/common/Loader';
import { postData } from '../../utility/utility';
import type { User } from '../../types/user';
import type { AssignLeadFormData } from '../../types/fieldVisit';
import ReadPermissionGuard from '../../components/auth/ReadPermissionGuard';
import PermissionGate from '../../components/common/PermissionGate';
import { Resource, Action } from '../../types/permission';

const AssignLead: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<User[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<AssignLeadFormData>({
    leadName: '',
    leadContact: '',
    leadCompany: '',
    leadAddress: '',
    assignedToEmployeeId: '',
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const response = await postData('/employees/list', { page: 1, limit: 200 });
        if (response.success) {
          const list = (response.data?.employees || []) as User[];
          setEmployees(list.filter(e => !e.isBlocked));
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast.error('Failed to load field employees');
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.leadName.trim()) errors.leadName = 'Lead name is required';
    if (!formData.assignedToEmployeeId) errors.assignedToEmployeeId = 'Select a field employee';
    if (formData.leadContact && !/^\d{10}$/.test(formData.leadContact.trim())) {
      errors.leadContact = 'Enter a valid 10-digit mobile number';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const response = await postData('/field-visits/assign', {
        leadName: formData.leadName.trim(),
        leadContact: formData.leadContact.trim() || undefined,
        leadCompany: formData.leadCompany.trim() || undefined,
        leadAddress: formData.leadAddress.trim() || undefined,
        assignedToEmployeeId: formData.assignedToEmployeeId,
      });

      if (response.success) {
        toast.success('Lead assigned successfully for field visit');
        navigate('/lead-management');
      } else {
        toast.error(response.message || 'Failed to assign lead');
      }
    } catch (error) {
      console.error('Assign lead error:', error);
      toast.error('Failed to assign lead');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ReadPermissionGuard resource={Resource.EMPLOYEE}>
      <PageMeta title="Assign Lead | Admin" description="Add and assign a lead for field visit" />
      <PageBreadcrumb pageTitle="Add & Assign Lead" />

      <ComponentCard title="Lead Details">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div>
            <Label>Lead / Customer Name *</Label>
            <Input
              name="leadName"
              value={formData.leadName}
              onChange={handleChange}
              placeholder="e.g. Sharma Paper Mart"
            />
            {fieldErrors.leadName && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.leadName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Contact Number</Label>
              <Input
                name="leadContact"
                value={formData.leadContact}
                onChange={handleChange}
                placeholder="10-digit mobile"
                maxLength={10}
              />
              {fieldErrors.leadContact && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.leadContact}</p>
              )}
            </div>
            <div>
              <Label>Company / Shop Name</Label>
              <Input
                name="leadCompany"
                value={formData.leadCompany}
                onChange={handleChange}
                placeholder="Business name"
              />
            </div>
          </div>

          <div>
            <Label>Address / Location</Label>
            <textarea
              name="leadAddress"
              value={formData.leadAddress}
              onChange={handleChange}
              rows={3}
              placeholder="Shop address or area for the field visit"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <Label>Assign to Field Employee *</Label>
            {loadingEmployees ? (
              <div className="py-4">
                <Loader size="sm" />
              </div>
            ) : (
              <select
                name="assignedToEmployeeId"
                value={formData.assignedToEmployeeId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select field employee</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} — {emp.mobileNumber}
                    {emp.role ? ` (${emp.role})` : ''}
                  </option>
                ))}
              </select>
            )}
            {fieldErrors.assignedToEmployeeId && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.assignedToEmployeeId}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <PermissionGate resource={Resource.EMPLOYEE} action={Action.UPDATE}>
              <Button type="submit" disabled={submitting || loadingEmployees}>
                {submitting ? 'Assigning...' : 'Assign for Field Visit'}
              </Button>
            </PermissionGate>
            <Button type="button" variant="outline" onClick={() => navigate('/lead-management')}>
              Cancel
            </Button>
          </div>
        </form>
      </ComponentCard>
    </ReadPermissionGuard>
  );
};

export default AssignLead;
