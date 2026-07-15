import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { toast } from 'react-toastify';
import { useBranch } from '../../context/BranchContext';
import { getRoleLabel } from '../../constants/accessControl';

const ROLES = ['Teacher', 'Admin', 'Cashier'];

function CredentialsModal({ credentials, onClose }) {
  if (!credentials) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h3 className="text-xl font-black text-slate-900 mb-2">Employee Created</h3>
        <p className="text-sm text-slate-500 mb-6">Please save these credentials safely.</p>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6 space-y-3 text-sm">
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-600">ID / Email:</span>
            <span className="text-slate-900 font-medium">{credentials.systemId}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-slate-600">Password:</span>
            <span className="text-slate-900 font-medium">{credentials.password}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function EmployeeModal({ employee, branches, onClose, onSave }) {
  const isEditing = !!employee;
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    role: employee?.role || 'Teacher',
    subject: employee?.department || employee?.subject || '',
    qualification: employee?.qualification || '',
    branchId: employee?.branchId || '',
    password: ''
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-black text-slate-900 mb-6">{isEditing ? 'Edit Employee' : 'Add Employee'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Role *</label>
              <select name="role" value={formData.role} onChange={handleChange} disabled={isEditing}
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-100">
                {ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
              </select>
            </div>

            {formData.role === 'Teacher' && (
              <>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Subject / Dept</label>
                  <input type="text" name="subject" value={formData.subject} onChange={handleChange}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Qualification</label>
                  <input type="text" name="qualification" value={formData.qualification} onChange={handleChange}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </>
            )}

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Branch Assignment</label>
              <select name="branchId" value={formData.branchId} onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">Global / Unassigned</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {!isEditing && (
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Password</label>
                <input type="text" name="password" value={formData.password} onChange={handleChange} placeholder="Auto-generated if blank"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
          </div>
          
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition text-sm disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const { selectedBranchId } = useBranch();
  
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, branchRes] = await Promise.all([
        axios.get('/employees'),
        axios.get('/branches/branches')
      ]);
      setEmployees(empRes.data);
      setBranches(branchRes.data);
    } catch (err) {
      toast.error('Failed to load employees data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (data) => {
    try {
      if (editingEmployee) {
        await axios.put(`/employees/${editingEmployee.id}`, data);
        toast.success('Employee updated successfully');
      } else {
        const res = await axios.post('/employees', data);
        toast.success('Employee created successfully');
        if (res.data.credentials) setCredentials(res.data.credentials);
      }
      setShowModal(false);
      setEditingEmployee(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving employee');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;
    try {
      await axios.delete(`/employees/${id}`);
      toast.success('Employee deleted successfully');
      fetchData();
    } catch (err) {
      toast.error('Error deleting employee');
    }
  };

  const handleToggleStatus = async (emp) => {
    setUpdatingId(emp.id);
    try {
      await axios.patch(`/users/${emp.id}/status`, { isActive: !emp.isActive });
      toast.success(`${emp.name} ${emp.isActive ? 'deactivated' : 'activated'}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || 
                        (e.email && e.email.toLowerCase().includes(search.toLowerCase()));
    const matchRole = filterRole ? e.role === filterRole : true;
    const matchBranch = selectedBranchId ? e.branchId === selectedBranchId : true;
    return matchSearch && matchRole && matchBranch;
  });

  return (
    <SuperAdminLayout pageTitle="Employee Management">
      {showModal && (
        <EmployeeModal
          employee={editingEmployee}
          branches={branches}
          onClose={() => { setShowModal(false); setEditingEmployee(null); }}
          onSave={handleSave}
        />
      )}
      {credentials && (
        <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Employee Management</h2>
          <p className="text-sm font-medium text-slate-500">Manage teachers, admins, and cashiers across branches.</p>
        </div>
        <button
          onClick={() => { setEditingEmployee(null); setShowModal(true); }}
          className="bg-indigo-600 text-white font-bold py-2.5 px-5 rounded-xl hover:bg-indigo-700 transition shadow-sm"
        >
          + Add Employee
        </button>
      </div>

      <div className="sticky top-16 z-40 flex flex-wrap gap-3 mb-6 bg-slate-50/90 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 backdrop-blur-sm">
        <input
          type="text"
          placeholder="Search employees..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Employee</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Role & Dept</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Branch</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">Loading employees...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">No employees found.</td></tr>
              ) : filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0">
                        {emp.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{emp.name}</div>
                        <div className="text-xs text-slate-500">{emp.email || 'No email'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-700">{getRoleLabel(emp.role)}</div>
                    <div className="text-xs text-slate-500">{emp.department || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                      {emp.branchName || 'Global'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${emp.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        disabled={updatingId === emp.id}
                        onClick={() => handleToggleStatus(emp)}
                        className={`text-xs font-bold transition ${emp.isActive ? 'text-amber-600 hover:text-amber-900' : 'text-emerald-600 hover:text-emerald-900'} disabled:opacity-40`}
                      >
                        {updatingId === emp.id ? '…' : emp.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => { setEditingEmployee(emp); setShowModal(true); }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-900 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id)}
                        className="text-xs font-bold text-red-600 hover:text-red-900 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
