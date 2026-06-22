import { useEffect, useState } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import CashierLayout from '../../components/CashierLayout';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const etb = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

const months = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'];

export default function Fees() {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Monthly Tuition');
  const [saving, setSaving] = useState(false);

  const [genMonth, setGenMonth] = useState('Meskerem');
  const [genDueDate, setGenDueDate] = useState('');
  const [generating, setGenerating] = useState(false);

  const fetchStructures = async () => {
    try {
      const res = await axios.get('/fees/structures');
      setStructures(res.data || []);
    } catch {
      setStructures([]);
    } finally {
      setLoading(false);
    }
  };

  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchStructures();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!grade || !amount) {
      toast.error('Grade and amount are required.');
      return;
    }
    setSaving(true);
    try {
      await axios.post('/fees/structures', { grade, amount: Number(amount), description });
      toast.success(`Fee structure for ${grade} saved.`);
      setGrade('');
      setAmount('');
      setDescription('Monthly Tuition');
      fetchStructures();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save fee structure.');
    } finally {
      setSaving(false);
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

  return (
    <CashierLayout searchPlaceholder="Search fee structures...">
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Fee Structures</h1>
        <p className="text-sm text-slate-500">Configure tuition amounts billed per grade level.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Grades Configured</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{structures.length}</p>
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
        {/* Add / update form (visible to SuperAdmin only) */}
        {user?.role === 'SuperAdmin' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Set Grade Fee</h2>
            <p className="text-sm text-slate-500">Saving an existing grade updates its amount.</p>
            <form className="mt-5 space-y-4" onSubmit={handleSave}>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Grade</label>
                <input
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. Grade 10"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Amount (ETB)</label>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 12000"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Fee Structure'}
              </button>
            </form>
          </section>
        )}

        {/* Existing structures */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Configured Grades</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <th className="rounded-l-lg px-4 py-3 font-semibold">Grade</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="rounded-r-lg px-4 py-3 text-right font-semibold">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="3" className="py-10 text-center text-slate-400">Loading…</td></tr>
                ) : structures.length === 0 ? (
                  <tr><td colSpan="3" className="py-10 text-center text-slate-400">No fee structures configured yet.</td></tr>
                ) : (
                  structures.map((s) => (
                    <tr key={s.id || s.grade} className="text-slate-700">
                      <td className="px-4 py-4 font-bold text-slate-900">{s.grade}</td>
                      <td className="px-4 py-4">{s.description || 'Monthly Tuition'}</td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-900">{etb(s.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Generate monthly invoices */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-slate-900">Generate Monthly Invoices</h2>
          <p className="text-sm text-slate-500">
            Creates an unpaid tuition invoice for every student, priced from the grade fee above. Students already
            invoiced for the chosen month are skipped.
          </p>
        </div>
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
    </CashierLayout>
  );
}
