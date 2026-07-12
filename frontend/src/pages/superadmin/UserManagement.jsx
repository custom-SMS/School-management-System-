import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import AdminLayout from '../../components/AdminLayout';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const ROLES = ['SuperAdmin', 'Admin', 'Teacher', 'Cashier', 'Student', 'Parent'];
const PROMOTABLE_ROLES = ['Admin', 'SuperAdmin'];

const ROLE_COLORS = {
  SuperAdmin: 'bg-indigo-100 text-indigo-800',
  Admin:      'bg-blue-100 text-blue-800',
  Teacher:    'bg-emerald-100 text-emerald-800',
  Cashier:    'bg-amber-100 text-amber-800',
  Student:    'bg-slate-100 text-slate-700',
  Parent:     'bg-violet-100 text-violet-800',
};

// ── Modal ──────────────────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose, onSave }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { toast.error('Passwords do not match.'); return; }
    setSaving(true);
    await onSave(password);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h3 className="text-lg font-black text-slate-900 mb-1">Reset Password</h3>
        <p className="text-sm text-slate-500 mb-6">Resetting password for <span className="font-bold text-slate-800">{user.name}</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-lg hover:bg-slate-50 transition text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-60">
              {saving ? 'Resetting…' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { user: currentUser } = useContext(AuthContext);
  const Layout = currentUser?.role === 'SuperAdmin' ? SuperAdminLayout : AdminLayout;

  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [resetTarget, setResetTarget] = useState(null);
  const [updatingId, setUpdatingId]   = useState(null);

  const fetchUsers = async () => {
    try {
      console.log("GET /api/users called");
      const res = await axios.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.log("Error response:", error.response?.data);
      console.log("Full error:", error);
      toast.error('Failed to load users');
}
    
    finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleStatusToggle = async (user) => {
    setUpdatingId(user.id);
    try {
      await axios.patch(`/users/${user.id}/status`, { isActive: !user.isActive });
      toast.success(`${user.name} ${user.isActive ? 'deactivated' : 'activated'}.`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating status');
    } finally {
      setUpdatingId(null);
    }
  };

   const handleRoleChange = async (userId, newRole) => {
     try {
       await axios.patch(`/users/${userId}/role`, { role: newRole });
       toast.success('Role updated successfully.');
       fetchUsers();
     } catch (err) {
       toast.error(err.response?.data?.message || 'Error updating role');
     }
   };

   const canPromoteToSuperAdmin = (user) => user.role === 'Admin' || user.role === 'SuperAdmin';

  const handleResetPassword = async (password) => {
    try {
      await axios.post(`/users/${resetTarget.id}/reset-password`, { newPassword: password });
      toast.success('Password reset successfully.');
      setResetTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error resetting password');
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole ? u.role === filterRole : true;
    return matchSearch && matchRole;
  });

  return (
    <Layout pageTitle="User Management">
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onSave={handleResetPassword}
        />
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">User Management</h2>
        <p className="text-sm font-medium text-slate-500">Manage all registered accounts, roles, and access across the platform.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {ROLES.map(role => {
          const count = users.filter(u => u.role === role).length;
          return (
            <button key={role} onClick={() => setFilterRole(f => f === role ? '' : role)}
              className={`rounded-xl border p-3 text-left transition hover:shadow-sm ${filterRole === role ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
              <div className="text-2xl font-black text-slate-900">{count}</div>
              <div className={`text-xs font-bold mt-1 ${filterRole === role ? 'text-indigo-700' : 'text-slate-500'}`}>{role}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-40 flex flex-wrap gap-3 mb-4 bg-slate-50/90 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 backdrop-blur-sm">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-72"
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(search || filterRole) && (
          <button onClick={() => { setSearch(''); setFilterRole(''); }}
            className="text-sm font-bold text-red-600 hover:text-red-800 px-3">Clear Filters</button>
        )}
        <span className="ml-auto text-xs font-semibold text-slate-400 self-center">{filtered.length} of {users.length} users</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">User</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Role</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Joined</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Loading users…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">No users found.</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0">
                        {u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)}
                      </div>
                      <div>
                        <Link
                          to={`/super-admin/users/${u.id}`}
                          className="font-bold text-slate-900 transition hover:text-gray-600 "
                        >
                          {u.name}
                        </Link>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {canPromoteToSuperAdmin(u) ? (
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className={`text-xs font-bold rounded-full px-3 py-1.5 border-0 outline-none cursor-pointer ${ROLE_COLORS[u.role]}`}
                      >
                        {PROMOTABLE_ROLES.map(r => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`text-xs font-bold rounded-full px-3 py-1.5 ${ROLE_COLORS[u.role]}`}
                      >
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        disabled={updatingId === u.id}
                        onClick={() => handleStatusToggle(u)}
                        className={`text-xs font-bold transition ${u.isActive ? 'text-amber-600 hover:text-amber-900' : 'text-emerald-600 hover:text-emerald-900'} disabled:opacity-40`}
                      >
                        {updatingId === u.id ? '…' : u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setResetTarget(u)}
                        className="text-xs font-bold text-red-600 hover:text-red-900 transition"
                      >
                        Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
