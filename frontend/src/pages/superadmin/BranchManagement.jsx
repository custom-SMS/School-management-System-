import { useEffect, useState } from 'react';
import axios from '../../api/axios';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { toast } from 'react-toastify';

const SCOPE_TYPES = ['BranchAdmin', 'Cashier'];
const SCOPE_COLORS = {
  BranchAdmin: 'bg-blue-50 text-blue-700',
  Cashier: 'bg-emerald-50 text-emerald-700',
};

export default function BranchManagement() {
  const [schools, setSchools] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [scopes, setScopes] = useState([]);

  // Selected school/branch for drill-down
  const [activeSchool, setActiveSchool] = useState(null);
  const [activeBranch, setActiveBranch] = useState(null);

  // Modal state
  const [modal, setModal] = useState(null); // 'school'|'branch'|'scope'
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [sr, br, ur] = await Promise.all([
        axios.get('/branches/schools', { skipGlobalErrorToast: true }),
        axios.get('/branches/branches', { skipGlobalErrorToast: true }),
        axios.get('/users', { skipGlobalErrorToast: true }),
      ]);
      setSchools(sr.data || []);
      setBranches(br.data || []);
      setUsers(ur.data?.users || ur.data || []);
    } catch { toast.error('Failed to load branch data.'); }
  };

  const loadScopes = async () => {
    try {
      const res = await axios.get('/branches/scopes', { skipGlobalErrorToast: true });
      setScopes(res.data || []);
    } catch { /* silent */ }
  };

  useEffect(() => { load(); loadScopes(); }, []);


  const openModal = (type, defaults = {}) => { setModal(type); setForm(defaults); };
  const closeModal = () => { setModal(null); setForm({}); };
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const saveSchool = async () => {
    setSaving(true);
    try {
      if (form.id) await axios.put(`/branches/schools/${form.id}`, form);
      else await axios.post('/branches/schools', form);
      toast.success('School saved.');
      closeModal(); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const deleteSchool = async (id) => {
    if (!window.confirm('Delete this school? This will also delete all its branches.')) return;
    try {
      await axios.delete(`/branches/schools/${id}`);
      toast.success('School deleted.');
      setActiveSchool(null);
      setActiveBranch(null);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete school.'); }
  };
  const deleteBranch = async (id) => {
    if (!window.confirm('Delete this branch?')) return;
    try {
      await axios.delete(`/branches/branches/${id}`);
      toast.success('Branch deleted.');
      setActiveBranch(null);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete branch.'); }
  };

  const saveBranch = async () => {
    setSaving(true);
    try {
      if (form.id) await axios.put(`/branches/branches/${form.id}`, form);
      else await axios.post('/branches/branches', form);
      toast.success('Branch saved.');
      closeModal(); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const saveScope = async () => {
    setSaving(true);
    try {
      await axios.post('/branches/scopes', form);
      toast.success('Scope assigned.');
      closeModal(); loadScopes();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const removeScope = async (id) => {
    if (!window.confirm('Remove this scope assignment?')) return;
    try {
      await axios.delete(`/branches/scopes/${id}`);
      toast.success('Scope removed.');
      loadScopes();
    } catch { toast.error('Failed to remove scope.'); }
  };


  const branchesOfSchool = (sid) => branches.filter((b) => b.schoolId === sid);

  return (
    <SuperAdminLayout pageTitle="Branch Management">
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Branch Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage schools, branches, and admin scope assignments.
        </p>
      </div>

      {/* ── Schools ───────────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">School</h2>

        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {schools.map((s) => (
            <div key={s.id}
              onClick={() => setActiveSchool(activeSchool?.id === s.id ? null : s)}
              className={`cursor-pointer rounded-2xl border p-5 shadow-sm transition ${activeSchool?.id === s.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-slate-900">{s.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Code: {s.code}</div>
                  {s.address && <div className="text-xs text-slate-400">{s.address}</div>}
                </div>

              </div>

              <div className="mt-3 text-xs font-semibold text-slate-500">
                {branchesOfSchool(s.id).length} branch(es)
              </div>
            </div>
          ))}
          {schools.length === 0 && (
            <p className="text-sm text-slate-400 col-span-3 py-8 text-center">No schools yet. Add one above.</p>
          )}
        </div>
      </section>


      {/* ── Branches of selected school ───────────────────────────── */}
      {activeSchool && (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Branches — <span className="text-indigo-700">{activeSchool.name}</span>
            </h2>
            <button onClick={() => openModal('branch', { schoolId: activeSchool.id })}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500">
              + Add Branch
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {branchesOfSchool(activeSchool.id).map((b) => (
              <div key={b.id}
                onClick={() => setActiveBranch(activeBranch?.id === b.id ? null : b)}
                className={`cursor-pointer rounded-2xl border p-5 shadow-sm transition ${activeBranch?.id === b.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{b.name}</div>
                    <div className="text-xs text-slate-400">Code: {b.code}</div>
                    {b.address && <div className="text-xs text-slate-400">{b.address}</div>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); openModal('branch', b); }}
                    className="text-xs font-semibold text-blue-600 hover:underline">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteBranch(b.id); }}
                    className="text-xs font-semibold text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
                <div className="mt-3 text-xs font-semibold text-slate-500">
                  {b._count && `${b._count.students} students · ${b._count.teachers} teachers`}
                </div>
              </div>
            ))}
            {branchesOfSchool(activeSchool.id).length === 0 && (
              <p className="text-sm text-slate-400 col-span-3 py-6 text-center">No branches yet.</p>
            )}
          </div>
        </section>
      )}

      {/* ── Scope Assignments ──────────────────────────────────────── */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Admin Scope Assignments</h2>
          <button onClick={() => openModal('scope', {})}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-500">
            + Assign Scope
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Scope Type</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {scopes.length === 0 ? (
                <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-400">No scope assignments yet.</td></tr>
              ) : scopes.map((sc) => (
                <tr key={sc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {sc.user?.name || '—'}
                    <div className="text-xs text-slate-400 font-normal">{sc.user?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${SCOPE_COLORS[sc.scopeType] || 'bg-slate-100 text-slate-600'}`}>
                      {sc.scopeType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{sc.branch?.name || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeScope(sc.id)}
                      className="text-xs font-semibold text-rose-600 hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>


      {/* ── Modals ─────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

            {/* School modal */}
            {modal === 'school' && (
              <>
                <h3 className="text-lg font-black text-slate-900 mb-4">{form.id ? 'Edit School' : 'Add School'}</h3>
                {[['name', 'School Name'], ['code', 'Code (e.g. MAIN)'], ['address', 'Address (optional)'], ['phone', 'Phone (optional)'], ['email', 'Email (optional)']].map(([k, lbl]) => (
                  <div key={k} className="mb-3">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">{lbl}</label>
                    <input value={form[k] || ''} onChange={(e) => set(k, e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-300 focus:bg-white" />
                  </div>
                ))}
                <div className="mt-4 flex gap-2">
                  <button onClick={saveSchool} disabled={saving}
                    className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={closeModal} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
                </div>
              </>
            )}

            {/* Branch modal */}
            {modal === 'branch' && (
              <>
                <h3 className="text-lg font-black text-slate-900 mb-4">{form.id ? 'Edit Branch' : 'Add Branch'}</h3>
                {!form.id && (
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">School</label>
                    <select value={form.schoolId || ''} onChange={(e) => set('schoolId', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none">
                      <option value="">— Select school —</option>
                      {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                {[['name', 'Branch Name'], ['code', 'Code (e.g. ADM)'], ['address', 'Address (optional)'], ['phone', 'Phone (optional)']].map(([k, lbl]) => (
                  <div key={k} className="mb-3">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">{lbl}</label>
                    <input value={form[k] || ''} onChange={(e) => set(k, e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-300 focus:bg-white" />
                  </div>
                ))}
                <div className="mt-4 flex gap-2">
                  <button onClick={saveBranch} disabled={saving}
                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={closeModal} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
                </div>
              </>
            )}

            {/* Scope modal */}
            {modal === 'scope' && (
              <>
                <h3 className="text-lg font-black text-slate-900 mb-4">Assign Admin Scope</h3>
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">User</label>
                  <select value={form.userId || ''} onChange={(e) => set('userId', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none">
                    <option value="">— Select user —</option>
                    {users.filter((u) => ['Admin', 'Cashier'].includes(u.role) && !scopes.some((s) => s.userId === (u._id || u.id))).map((u) => (
                      <option key={u._id || u.id} value={u._id || u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                  {users.filter((u) => ['Admin', 'Cashier'].includes(u.role)).length > 0 && 
                   users.filter((u) => ['Admin', 'Cashier'].includes(u.role) && !scopes.some((s) => s.userId === (u._id || u.id))).length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">All Admin/Cashier users already have scope assignments.</p>
                  )}
                </div>
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Scope Type</label>
                  <select value={form.scopeType || ''} onChange={(e) => set('scopeType', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none">
                    <option value="">— Select scope —</option>
                    {SCOPE_TYPES.map((st) => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Branch</label>
                  <select value={form.branchId || ''} onChange={(e) => set('branchId', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none">
                    <option value="">— Select branch —</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={saveScope} disabled={saving || !form.userId || !form.scopeType || !form.branchId}
                    className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                    {saving ? 'Saving…' : 'Assign Scope'}
                  </button>
                  <button onClick={closeModal} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </SuperAdminLayout>
  );
}
