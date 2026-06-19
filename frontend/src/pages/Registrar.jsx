import { useEffect, useMemo, useState } from 'react';
import axios from '../api/axios';
import AdminLayout from '../components/AdminLayout';
import { toast } from 'react-toastify';

const initialRegistrarForm = {
  name: '',
  email: '',
  password: '',
};

const statusPillStyles = {
  Open: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Closed: 'bg-rose-50 text-rose-700 border border-rose-200',
  Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Suspended: 'bg-amber-50 text-amber-700 border border-amber-200',
};

export default function Registrar() {
  const [academicYears, setAcademicYears] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [registrarAccounts, setRegistrarAccounts] = useState([
    {
      id: 'REG-001',
      name: 'Bethlehem Desta',
      email: 'bethlehem.registrar@school.edu',
      status: 'Active',
      lastActivity: 'Today, 09:20',
    },
    {
      id: 'REG-002',
      name: 'Abel Tarekegn',
      email: 'abel.registrar@school.edu',
      status: 'Suspended',
      lastActivity: 'Yesterday, 16:10',
    },
  ]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [registrarForm, setRegistrarForm] = useState(initialRegistrarForm);

  const fetchAcademicYears = async () => {
    try {
      const res = await axios.get('/academic-years');
      setAcademicYears(res.data || []);
    } catch (error) {
      console.error('Failed to fetch academic years', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get(`/audit-logs?page=${auditPage}&action=${auditSearch}`);
      setAuditLogs(res.data?.logs || []);
      setAuditTotalPages(res.data?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [auditPage, auditSearch]);

  const activeAcademicYear = academicYears.find((year) => year.isActive);
  const registrationYear = activeAcademicYear || academicYears[0] || null;

  const registrationStatus = registrationYear?.registrationOpen ? 'Open' : 'Closed';

  const registrationMetrics = useMemo(
    () => [
      {
        label: 'Active Academic Year',
        value: activeAcademicYear?.year || 'Not set',
        helper: 'Current school year in operational use',
      },
      {
        label: 'Registration Period',
        value: registrationStatus,
        helper: 'Controls whether registrar workflow may proceed',
      },
      {
        label: 'Registrar Accounts',
        value: registrarAccounts.length,
        helper: 'Operational admission users managed by Admin',
      },
      {
        label: 'Registration Activity Logs',
        value: auditLogs.length,
        helper: 'Current audit page for registration oversight',
      },
    ],
    [activeAcademicYear?.year, registrationStatus, registrarAccounts.length, auditLogs.length]
  );

  const handleCreateAcademicYear = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const year = String(form.get('year') || '').trim();

    if (!year) return;

    try {
      await axios.post('/academic-years', { year });
      toast.success(`Academic Year ${year} created successfully.`);
      e.currentTarget.reset();
      fetchAcademicYears();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating academic year.');
    }
  };

  const handleSetActiveYear = async (id) => {
    try {
      await axios.patch(`/academic-years/${id}/active`);
      toast.success('Active Academic Year updated successfully.');
      fetchAcademicYears();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error setting active year.');
    }
  };

  const handleToggleRegistration = async (id, currentVal) => {
    try {
      await axios.patch(`/academic-years/${id}/registration`, {
        registrationOpen: !currentVal,
      });
      toast.success(`Registration period ${currentVal ? 'closed' : 'opened'} successfully.`);
      fetchAcademicYears();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error toggling registration period.');
    }
  };

  const handleCreateRegistrar = (e) => {
    e.preventDefault();

    const newRegistrar = {
      id: `REG-00${registrarAccounts.length + 1}`,
      name: registrarForm.name,
      email: registrarForm.email,
      status: 'Active',
      lastActivity: 'Just created',
    };

    setRegistrarAccounts((prev) => [newRegistrar, ...prev]);
    setRegistrarForm(initialRegistrarForm);
    setShowCreateModal(false);
    toast.success('Registrar account created successfully.');
  };

  const handleToggleRegistrarStatus = (id) => {
    const target = registrarAccounts.find((account) => account.id === id);

    setRegistrarAccounts((prev) =>
      prev.map((account) =>
        account.id === id
          ? {
              ...account,
              status: account.status === 'Active' ? 'Suspended' : 'Active',
            }
          : account
      )
    );

    toast.success(
      target?.status === 'Active'
        ? 'Registrar account suspended successfully.'
        : 'Registrar account activated successfully.'
    );
  };

  const handleResetRegistrarPassword = (name) => {
    toast.success(`Password reset link generated for ${name}.`);
  };

  const registrationAuditLogs = auditLogs.filter((log) => {
    const searchable = `${log.action || ''} ${log.details || ''} ${log.affectedRecord || ''}`.toLowerCase();
    return searchable.includes('registration') || searchable.includes('registrar') || searchable.includes('admission');
  });

  return (
    <AdminLayout
      pageTitle="Registration Management"
      pageSubtitle="Admin control center for registration lifecycle, registrar accounts, and operational oversight."
      searchPlaceholder="Search registration periods, registrar accounts, or registration activity..."
      headerAction={
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Create Registrar Account
        </button>
      }
    >
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Create Registrar Account</h2>
              <p className="mt-2 text-sm text-slate-500">
                Admin creates and manages Registrar accounts, but does not perform registrar admission workflow directly.
              </p>
            </div>

            <form onSubmit={handleCreateRegistrar} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Registrar Name</label>
                <input
                  type="text"
                  required
                  value={registrarForm.name}
                  onChange={(e) => setRegistrarForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Registrar Email</label>
                <input
                  type="email"
                  required
                  value={registrarForm.email}
                  onChange={(e) => setRegistrarForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Temporary Password</label>
                <input
                  type="text"
                  required
                  value={registrarForm.password}
                  onChange={(e) => setRegistrarForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {registrationMetrics.map((metric) => (
            <div key={metric.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{metric.label}</div>
              <div className="mt-4 text-3xl font-black tracking-tight text-slate-900">{metric.value}</div>
              <div className="mt-2 text-sm text-slate-500">{metric.helper}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_1.3fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Registration lifecycle</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Academic Years & Registration Period</h2>
              </div>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPillStyles[registrationStatus]}`}>
                {registrationStatus}
              </span>
            </div>

            <form onSubmit={handleCreateAcademicYear} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Create Academic Year</label>
                <input
                  name="year"
                  type="text"
                  required
                  placeholder="e.g. 2026/2027"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300"
                />
              </div>
              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Create Academic Year
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {academicYears.map((year) => (
                <div key={year.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-lg font-bold text-slate-900">{year.year}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${year.isActive ? statusPillStyles.Active : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {year.isActive ? 'Active Year' : 'Inactive'}
                        </span>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${year.registrationOpen ? statusPillStyles.Open : statusPillStyles.Closed}`}>
                          Registration {year.registrationOpen ? 'Open' : 'Closed'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetActiveYear(year.id)}
                        disabled={year.isActive}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Activate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRegistration(year.id, year.registrationOpen)}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        {year.registrationOpen ? 'Close Registration' : 'Open Registration'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {academicYears.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No academic years available yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-200 pb-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Account administration</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Registrar Accounts</h2>
              <p className="mt-2 text-sm text-slate-500">
                Admin owns Registrar account lifecycle. Admissions execution remains in the separate Registrar workflow.
              </p>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Registrar</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Last Activity</th>
                    <th className="px-4 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registrarAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-bold text-slate-900">{account.name}</div>
                          <div className="text-xs text-slate-500">
                            {account.id} • {account.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPillStyles[account.status]}`}>
                          {account.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{account.lastActivity}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleResetRegistrarPassword(account.name)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Reset Password
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleRegistrarStatus(account.id)}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                          >
                            {account.status === 'Active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {registrarAccounts.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-4 py-12 text-center text-sm font-medium text-slate-500">
                        No registrar accounts configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700">Ownership boundary</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Registration Management Scope</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>• Admin can open and close the registration period.</li>
              <li>• Admin can create, activate, suspend, and reset Registrar accounts.</li>
              <li>• Admin can view registration statistics and registration activity.</li>
              <li>• Admin cannot perform student admission entry on behalf of Registrar.</li>
              <li>• Admin cannot verify normal school fee payments.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-200 pb-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Operational monitoring</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Registration Activity</h2>
              <p className="mt-2 text-sm text-slate-500">
                Visibility into registration-related activity without exposing admissions execution controls.
              </p>
            </div>

            <div className="mt-5 max-w-md">
              <input
                type="text"
                placeholder="Search registration activity..."
                value={auditSearch}
                onChange={(e) => {
                  setAuditSearch(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-300 focus:bg-white"
              />
            </div>

            <div className="mt-5 space-y-3">
              {registrationAuditLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-bold text-slate-900">{log.action}</div>
                    <div className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {log.user?.name || 'System'}{log.user?.role ? ` (${log.user.role})` : ''} • {log.affectedRecord || 'No affected record'}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">{log.details || 'No additional details available.'}</div>
                </div>
              ))}

              {registrationAuditLogs.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No registration-related activity found for the current filter.
                </div>
              )}
            </div>

            {auditTotalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm font-semibold text-slate-500">
                  Page {auditPage} of {auditTotalPages}
                </span>
                <button
                  type="button"
                  disabled={auditPage >= auditTotalPages}
                  onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
