import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import CashierLayout from '../../components/CashierLayout';

const etb = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

export default function Payments() {
  const [outstanding, setOutstanding] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);

  useEffect(() => {
    axios
      .get('/fees/outstanding')
      .then((r) => setOutstanding(r.data || []))
      .catch(() => setOutstanding([]))
      .finally(() => setLoading(false));
    axios
      .get('/fees/pending-verifications')
      .then((r) => setPendingCount((r.data || []).length))
      .catch(() => setPendingCount(0));
  }, []);

  const totalOutstanding = useMemo(
    () => outstanding.reduce((sum, f) => sum + Number(f.amount || 0), 0),
    [outstanding],
  );

  const recordCash = async (fee) => {
    setPayingId(fee.id);
    try {
      await axios.patch(`/fees/${fee.id}/pay`);
      toast.success(`Cash payment recorded for ${fee.student?.user?.name || 'student'}. Receipt issued.`);
      setOutstanding((prev) => prev.filter((f) => f.id !== fee.id));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to record payment.');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <CashierLayout searchPlaceholder="Search student or invoice...">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Outstanding Invoices</p>
          <p className="mt-2 text-4xl font-black text-slate-900">{outstanding.length}</p>
          <p className="mt-2 text-xs font-medium text-slate-400">Awaiting collection</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Outstanding</p>
          <p className="mt-2 text-4xl font-black text-slate-900">ETB {etb(totalOutstanding)}</p>
          <p className="mt-2 text-xs font-medium text-slate-400">Across all unpaid invoices</p>
        </div>
        <Link to="/finance/verification" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bank Slips to Verify</p>
          <p className="mt-2 text-4xl font-black text-slate-900">{pendingCount}</p>
          <p className="mt-2 text-xs font-semibold text-slate-600">Go to verification →</p>
        </Link>
      </div>

      {/* Outstanding invoices — collect cash */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Collect Cash at Desk</h2>
            <p className="text-sm text-slate-500">Recording a cash payment marks the invoice paid and issues a receipt.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <th className="rounded-l-lg px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Grade</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Month</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="rounded-r-lg px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="py-10 text-center text-slate-400">Loading invoices…</td></tr>
              ) : outstanding.length === 0 ? (
                <tr><td colSpan="6" className="py-10 text-center font-semibold text-emerald-600">✅ No outstanding invoices.</td></tr>
              ) : (
                outstanding.map((f) => (
                  <tr key={f.id} className="text-slate-700">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500">
                          {(f.student?.user?.name || 'NA').split(' ').map((x) => x[0]).slice(0, 2).join('')}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900">{f.student?.user?.name || '—'}</div>
                          <div className="text-xs text-slate-400">{f.student?.studentId || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{f.student?.grade || '—'}</td>
                    <td className="px-4 py-4">{f.description || 'Tuition'}</td>
                    <td className="px-4 py-4">{f.month || '—'}</td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900">ETB {etb(f.amount)}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => recordCash(f)}
                        disabled={payingId === f.id}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        {payingId === f.id ? 'Recording…' : 'Record Cash Payment'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Showing {outstanding.length} outstanding invoice{outstanding.length === 1 ? '' : 's'}
        </p>
      </div>
    </CashierLayout>
  );
}
