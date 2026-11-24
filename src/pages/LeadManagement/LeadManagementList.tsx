import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import moment from 'moment';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import ComponentCard from '../../components/common/ComponentCard';
import CommonTable from '../../components/common/CommonTable';
import Button from '../../components/ui/button/Button';
import { postData } from '../../utility/utility';
import type { TableColumn } from '../../types/table';
import type { FieldVisit, FieldVisitStatus } from '../../types/fieldVisit';
import type { User } from '../../types/user';
import { TimeIcon } from '../../icons';
import { Resource, Action } from '../../types/permission';
import ReadPermissionGuard from '../../components/auth/ReadPermissionGuard';
import PermissionGate from '../../components/common/PermissionGate';
import { usePermissions } from '../../hooks/usePermissions';
import { filterTableActions } from '../../utils/filterTableActions';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'visited', label: 'Visited' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'closed', label: 'Closed' },
];

const statusBadge = (status: FieldVisitStatus) => {
  const styles: Record<FieldVisitStatus, string> = {
    assigned: 'bg-blue-100 text-blue-800',
    visited: 'bg-green-100 text-green-800',
    follow_up: 'bg-amber-100 text-amber-800',
    closed: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.assigned}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
};

const getEmployeeName = (ref: FieldVisit['assignedToEmployeeId']) => {
  if (!ref) return '—';
  if (typeof ref === 'string') return ref;
  return ref.fullName || '—';
};

function LeadTable() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [state, setState] = useState({
    searchTerm: '',
    debouncedSearch: '',
    statusFilter: '',
    employeeFilter: '',
    pagination: { currentPage: 1, totalPages: 1, totalCount: 0, limit: 10 },
    leads: [] as FieldVisit[],
    employees: [] as User[],
    isLoading: true,
  });

  const { searchTerm, debouncedSearch, statusFilter, employeeFilter, pagination, leads, employees, isLoading } = state;

  useEffect(() => {
    const timer = setTimeout(() => {
      setState(prev => ({
        ...prev,
        debouncedSearch: prev.searchTerm,
        pagination: { ...prev.pagination, currentPage: 1 },
      }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    postData('/employees/list', { page: 1, limit: 200 }).then(res => {
      if (res.success) {
        setState(prev => ({ ...prev, employees: res.data?.employees || [] }));
      }
    });
  }, []);

  const fetchLeads = useCallback(
    async (page = pagination.currentPage) => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        const response = await postData('/field-visits/list', {
          page,
          limit: pagination.limit,
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          assignedToEmployeeId: employeeFilter || undefined,
        });

        if (response.success) {
          setState(prev => ({
            ...prev,
            leads: response.data?.rows || [],
            pagination: {
              ...prev.pagination,
              currentPage: response.data?.page || page,
              totalPages: response.data?.totalPages || 1,
              totalCount: response.data?.total || 0,
            },
          }));
        }
      } catch (error) {
        console.error('Error fetching leads:', error);
      } finally {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    },
    [debouncedSearch, statusFilter, employeeFilter, pagination.limit],
  );

  useEffect(() => {
    fetchLeads(pagination.currentPage);
  }, [pagination.currentPage, fetchLeads]);

  const handlePageChange = (selectedItem: { selected: number }) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, currentPage: selectedItem.selected + 1 },
    }));
  };

  const handleViewTimeline = (row: Record<string, unknown>) => {
    const visit = row as unknown as FieldVisit;
    const empRef = visit.assignedToEmployeeId;
    if (!empRef || typeof empRef === 'string') {
      const emp = employees.find(e => e._id === empRef);
      if (emp) navigate('/user-timeline', { state: { employee: emp } });
      return;
    }
    navigate('/user-timeline', {
      state: {
        employee: {
          _id: empRef._id,
          fullName: empRef.fullName,
          email: empRef.email,
          mobileNumber: empRef.mobileNumber,
        },
      },
    });
  };

  const columns: TableColumn[] = [
    { key: 'leadName', label: 'Lead Name' },
    { key: 'leadContact', label: 'Contact', render: v => String(v || '—') },
    { key: 'leadCompany', label: 'Company', render: v => String(v || '—') },
    {
      key: 'status',
      label: 'Status',
      render: v => statusBadge(v as FieldVisitStatus),
    },
    {
      key: 'assignedToEmployeeId',
      label: 'Field Employee',
      render: (_v, row) => getEmployeeName((row as unknown as FieldVisit).assignedToEmployeeId),
    },
    {
      key: 'assignedAt',
      label: 'Assigned On',
      render: v => (v ? moment(String(v)).format('DD MMM YYYY') : '—'),
    },
    {
      key: 'visitedAt',
      label: 'Visited On',
      render: v => (v ? moment(String(v)).format('DD MMM YYYY') : '—'),
    },
    {
      key: 'remarks',
      label: 'Remarks',
      render: v => {
        const text = String(v || '');
        return text ? (text.length > 40 ? `${text.slice(0, 40)}…` : text) : '—';
      },
    },
  ];

  const actions = filterTableActions(
    [
      {
        label: 'Timeline',
        onClick: handleViewTimeline,
        variant: 'primary' as const,
        icon: <TimeIcon className="w-4 h-4" />,
        permission: { resource: Resource.EMPLOYEE, action: Action.READ },
      },
    ],
    can,
  );

  const assignedCount = leads.filter(l => l.status === 'assigned').length;
  const visitedCount = leads.filter(l => l.status === 'visited').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase">Total Leads</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{pagination.totalCount}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 p-4">
          <p className="text-xs font-bold text-blue-500 uppercase">Pending Visit</p>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{assignedCount}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800 p-4">
          <p className="text-xs font-bold text-green-600 uppercase">Visited (page)</p>
          <p className="text-2xl font-black text-green-700 dark:text-green-300">{visitedCount}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <input
            type="text"
            className="block w-full sm:max-w-xs pl-3 pr-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={e => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
          />
          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white dark:bg-gray-900"
            value={statusFilter}
            onChange={e => setState(prev => ({
              ...prev,
              statusFilter: e.target.value,
              pagination: { ...prev.pagination, currentPage: 1 },
            }))}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white dark:bg-gray-900"
            value={employeeFilter}
            onChange={e => setState(prev => ({
              ...prev,
              employeeFilter: e.target.value,
              pagination: { ...prev.pagination, currentPage: 1 },
            }))}
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>{emp.fullName}</option>
            ))}
          </select>
        </div>
        <PermissionGate resource={Resource.EMPLOYEE} action={Action.UPDATE}>
          <Button size="sm" onClick={() => navigate('/assign-lead')}>
            + Add & Assign Lead
          </Button>
        </PermissionGate>
      </div>

      <CommonTable
        columns={columns}
        data={leads as unknown as Record<string, unknown>[]}
        actions={actions}
        loading={isLoading}
        emptyMessage="No leads found. Add a lead and assign it to a field employee."
        pagination={{
          currentPage: pagination.currentPage,
          totalPages: pagination.totalPages,
          totalCount: pagination.totalCount,
          limit: pagination.limit,
          onPageChange: handlePageChange,
        }}
      />
    </div>
  );
}

export default function LeadManagementList() {
  return (
    <ReadPermissionGuard resource={Resource.EMPLOYEE}>
      <PageMeta title="Lead Management | Admin" description="Manage and assign field visit leads" />
      <PageBreadcrumb pageTitle="Lead Management" />
      <ComponentCard title="Leads & Field Visit Assignments">
        <LeadTable />
      </ComponentCard>
    </ReadPermissionGuard>
  );
}
