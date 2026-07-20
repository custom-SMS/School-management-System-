import { useEffect, useState, useContext } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { useAuth } from '../../hooks/useAuth';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { GRADES, ETHIOPIAN_MONTHS } from '../../constants/school';

const ALLOWED_GRADES = GRADES;

const etb = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

const months = ETHIOPIAN_MONTHS;

export default function SuperAdminFees() {
  const { selectedYear, isViewingHistory } = useAcademicYear();
  const [structures, setStructures] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [genMonth, setGenMonth] = useState('Meskerem');
  const [genDueDate, setGenDueDate] = useState('');
  const [generating, setGenerating] = useState(false);

  const { user } = useAuth();

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/branches/branches');
      setBranches(res.data || []);
    } catch {
      setBranches([]);
    }
  };

  const fetchStructures = async () => {
    try {
      const params = selectedBranchId ? { branchId: selectedBranchId } : {};
      const res = await axios.get('/fees/structures', { params });
      setStructures(res.data || []);
    } catch {
      setStructures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBranches(); fetchStructures(); }, [selectedYear]);
  useEffect(() => { fetchStructures(); }, [selectedBranchId]);

  const handleGradeChange = (selectedGrade) => {
    setGrade(selectedGrade);
    const existing = structures.find((s) => s.grade === selectedGrade);
    setAmount(existing ? String(existing.amount || '') : '');
  };

  const existingFeeForGrade = structures.find((s) => s.grade === grade);
  const isEditing = Boolean(existingFeeForGrade);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!grade) { toast.error('Please select a grade.'); return; }
    if (!amount || Number(amount) <= 0) { toast.error('Please enter a valid amount.'); return; }
    setSaving(true);
    try {
      await axios.post('/fees/structures', { 
        grade, 
        amount: Number(amount), 
        description: 'Monthly Tuition',
        branchId: selectedBranchId || null
      });
      toast.success(`Fee for ${grade} ${isEditing ? 'updated' : 'created'} successfully.`);
      setGrade('');
      setAmount('');
      fetchStructures();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save fee structure.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, gradeName) => {
    if (!window.confirm(`Delete fee structure for ${gradeName}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await axios.delete(`/fees/structures/${id}`);
      toast.success(`Fee structure for ${gradeName} deleted.`);
      if (grade === gradeName) { setGrade(''); setAmount(''); }
      fetchStructures();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete fee structure.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (structures.length === 0) {
      toast.error('Configure at least one grade fee before generating invoices.');
      return;
    }
    setGenerating(true);
    try {
      const res = await axios.post('/fees/generate', {
        month: genMonth,
        dueDate: genDueDate || undefined,
        description: `Monthly Tuition - ${genMonth}`,
        branchId: selectedBranchId || undefined,
      });
      const { created = 0, skippedExisting = 0, skippedNoFeeConfigured = 0 } = res.data || {};
      toast.success(`${created} invoice(s) generated for ${genMonth}.`);
      if (skippedExisting || skippedNoFeeConfigured) {
        toast.info(`Skipped ${skippedExisting} already invoiced, ${skippedNoFeeConfigured} without a configured fee.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoices.');
    } finally {
      setGenerating(false);
    }
  };

  const totalConfigured = structures.reduce((s, x) => s + Number(x.amount || 0), 0);
  const unconfiguredGrades = ALLOWED_GRADES.filter((g) => !structures.find((s) => s.grade === g));

  return (
    <SuperAdminLayout pageTitle="Fees">
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Fee Structures</h1>
        <p className="text-sm text-slate-500">Configure one monthly tuition amount per grade level.</p>
      </div>

      {/* Academic year context banner */}
      {isViewingHistory && selectedYear && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <span className="text-amber-600 font-bold">📅 Viewing historical fee structures for {selectedYear.year}</span>
          <span className="text-amber-500 text-xs">— data is read-only for this year</span>
        </div>
      )}
      {!isViewingHistory && selectedYear && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />
          <span className="text-emerald-700 font-semibold">Active Year: {selectedYear.year}</span>
        </div>
      )}

      {/* Branch selector */}
      <div className="mb-6">
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Select Branch</label>
        <select
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          className="w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
        >
          <option value="">All Branches (Global)</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Grades Configured</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{structures.length} / {ALLOWED_GRADES.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Monthly Tuition</p>
          <p className="mt-2 text-3xl font-black text-slate-900">ETB {etb(totalConfigured)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Average per Grade</p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            ETB {etb(structures.length ? totalConfigured / structures.length : 0)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.6fr]">
        {/* Form */}
        {user?.role === 'SuperAdmin' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              {isEditing ? `Edit Fee — ${grade}` : 'Set Grade Fee'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isEditing
                ? 'This grade already has a fee. Saving will update it.'
                : unconfiguredGrades.length === 0
                  ? 'All grades are configured.'
                  : 'Select a grade and set the monthly tuition amount.'}
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSave}>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Grade</label>
                <select
                  value={grade}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                >
                  <option value="">— Select a grade —</option>
                  {ALLOWED_GRADES.map((g) => {
                    const configured = structures.find((s) => s.grade === g);
                    return (
                      <option key={g} value={g}>
                        {g}{configured ? ` — ETB ${etb(configured.amount)}` : ''}
                      </option>
                    );
                  })}
                </select>
                {isEditing && (
                  <p className="mt-1.5 text-xs font-semibold text-amber-600">
                    ⚠ A fee of ETB {etb(existingFeeForGrade.amount)} already exists — saving will update it.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Monthly Tuition Amount (ETB)
                </label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 12000"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !grade}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : isEditing ? `Update Fee for ${grade}` : 'Save Fee Structure'}
              </button>
            </form>
          </section>
        )}

        {/* Table */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Configured Grades</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <th className="rounded-l-lg px-4 py-3 font-semibold">Grade</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount (ETB)</th>
                  {user?.role === 'SuperAdmin' && (
                    <th className="rounded-r-lg px-4 py-3 text-right font-semibold">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="4" className="py-10 text-center text-slate-400">Loading…</td></tr>
                ) : structures.length === 0 ? (
                  <tr><td colSpan="4" className="py-10 text-center text-slate-400">No fee structures configured yet.</td></tr>
                ) : (
                  structures.map((s) => (
                    <tr key={s.id || s.grade} className="text-slate-700">
                      <td className="px-4 py-4 font-bold text-slate-900">{s.grade}</td>
                      <td className="px-4 py-4 text-slate-500">Monthly Tuition</td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-900">{etb(s.amount)}</td>
                      {user?.role === 'SuperAdmin' && (
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { handleGradeChange(s.grade); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(s.id, s.grade)}
                              disabled={deletingId === s.id}
                              className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                            >
                              {deletingId === s.id ? '…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {unconfiguredGrades.length > 0 && !loading && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700">
                {unconfiguredGrades.length} grade{unconfiguredGrades.length > 1 ? 's' : ''} not yet configured:{' '}
                {unconfiguredGrades.join(', ')}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Generate invoices */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Generate Monthly Invoices</h2>
        <p className="mt-1 text-sm text-slate-500">
          Creates an unpaid monthly tuition invoice for every student based on the grade fee above.
          Students already invoiced for the selected month are skipped.
        </p>
        <form className="mt-5 flex flex-wrap items-end gap-4" onSubmit={handleGenerate}>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Month</label>
            <select
              value={genMonth}
              onChange={(e) => setGenMonth(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            >
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Due Date</label>
            <input
              type="date"
              value={genDueDate}
              onChange={(e) => setGenDueDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            />
          </div>
          <button
            type="submit"
            disabled={generating}
            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Generate Invoices'}
          </button>
        </form>
      </section>
    </SuperAdminLayout>
  );
}
