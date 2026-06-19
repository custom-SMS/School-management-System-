import { useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { toast } from 'react-toastify';

const initialAdminForm = {
  name: '',
  email: '',
  password: '',
};

const sampleAdmins = [
  {
    id: 'ADM-001',
    name: 'Selamawit Bekele',
    email: 'selamawit.admin@school.edu',
    role: 'Admin',
    status: 'Active',
    lastLogin: 'Today, 08:30',
    scope: 'School Operations',
  },
  {
    id: 'ADM-002',
    name: 'Daniel Tesfaye',
    email: 'daniel.admin@school.edu',
    role: 'Admin',
    status: 'Suspended',
    lastLogin: 'Yesterday, 17:10',
    scope: 'School Operations',
  },
  {
    id: 'ADM-003',
    name: 'Hanna Wolde',
    email: 'hanna.admin@school.edu',
    role: 'Admin',
    status: 'Active',
    lastLogin: 'Today, 07:55',
    scope: 'Academic Administration',
  },
];

const statusStyles = {
  Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Suspended: 'bg-rose-50 text-rose-700 border border-rose-200',
};

export default function SuperAdminUsers() {
  const [admins, setAdmins] = useState(sampleAdmins);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState(initialAdminForm);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAdmins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return admins;

    return admins.filter((admin) =>
      [admin.id, admin.name, admin.email, admin.role, admin.scope, admin.status]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [admins, searchQuery]);

  const handleCreateAdmin = (e) => {
    e.preventDefault();

    const newAdmin = {
      id: `ADM-00${admins.length + 1}`,
      name: formData.name,
      email: formData.email,
      role: 'Admin',
      status: 'Active',
      lastLogin: 'Just created',
      scope: 'School Operations',
    };

    setAdmins((prev) => [newAdmin, ...prev]);
    setFormData(initialAdminForm);
    setShowCreateModal(false);
    toast.success('Admin account created successfully.');
  };

  const handleToggleStatus = (id) => {
    setAdmins((prev) =>
      prev.map((admin) =>
        admin.id === id
          ? {
              ...admin,
              status: admin.status === 'Active' ? 'Suspended' : 'Active',
            }
          : admin
      )
    );

    const updated = admins.find((admin) => admin.id === id);
    toast.success(updated?.status === 'Active' ? 'Admin account suspended.' : 'Admin account activated.');
  };

  const handleResetPassword = (name) => {
    toast.success(`Password reset link generated for ${name}.`);
  };

  return (
    <AdminLayout
      pageTitle="User Management"
      pageSubtitle="Create, activate, suspend, and monitor Admin accounts across the organization."
      searchPlaceholder="Search admin accounts, scope, or status..."
      headerAction={
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Create Admin Account
        </button>
      }
    >
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Create Admin Account</h2>
              <p className="mt-2 text-sm text-slate-500">
                Super Admin can create Admin users only. Teacher, Student, Registrar, and Cashier accounts remain under operational ownership.
              </p>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Admin Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Admin Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Temporary Password</label>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
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
          {[
            { label: 'Total Admins', value: admins.length, tone: 'bg-slate-900 text-white' },
            { label: 'Active Admins', value: admins.filter((admin) => admin.status === 'Active').length, tone: 'bg-emerald-50 text-emerald-700' },
            { label: 'Suspended Admins', value: admins.filter((admin) => admin.status === 'Suspended').length, tone: 'bg-rose-50 text-rose-700' },
            { label: 'Governance Coverage', value: '100%', tone: 'bg-violet-50 text-violet-700' },
          ].map((card) => (
            <div key={card.label} className={`rounded-3xl border border-slate-200 p-5 shadow-sm ${card.tone}`}>
              <div className="text-xs font-bold uppercase tracking-[0.22em] opacity-80">{card.label}</div>
              <div className="mt-4 text-3xl font-black tracking-tight">{card.value}</div>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">Admin Accounts</h2>
              <p className="mt-1 text-sm text-slate-500">
                Governance view of all Admin users with lifecycle controls and visibility into platform access.
              </p>
            </div>

            <div className="w-full max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter admin users..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300"
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-4">Admin</th>
                  <th className="px-4 py-4">Role</th>
                  <th className="px-4 py-4">Scope</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Last Login</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-bold text-slate-900">{admin.name}</div>
                        <div className="text-xs text-slate-500">
                          {admin.id} • {admin.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{admin.role}</td>
                    <td className="px-4 py-4 text-slate-600">{admin.scope}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyles[admin.status]}`}>
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{admin.lastLogin}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleResetPassword(admin.name)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Reset Password
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(admin.id)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                        >
                          {admin.status === 'Active' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredAdmins.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-sm font-medium text-slate-500">
                      No admin accounts match the current search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}