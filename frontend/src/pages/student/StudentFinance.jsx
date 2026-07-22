import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import StudentLayout from '../../components/StudentLayout';
import { toast } from 'react-toastify';

const etb = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

export default function StudentFinance() {
  const navigate = useNavigate();
  const [fees, setFees] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    let feesOk = false;
    const p1 = axios.get('/fees/my').then((r) => { setFees(r.data || []); feesOk = true; }).catch(() => {});
    const p2 = axios.get('/stats/student/me').then((r) => setProfile(r.data)).catch(() => {});
    Promise.all([p1, p2]).finally(() => {
      if (!feesOk) setError(true);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const totals = useMemo(() => {
    let billed = 0, paid = 0, due = 0, verifying = 0;
    fees.forEach((f) => {
      const amt = Number(f.amount || 0);
      billed += amt;
      if (f.paid) paid += amt;
      else if (f.status === 'Pending Verification') verifying += amt;
      else due += amt;
    });
    return { billed, paid, due, verifying, pct: billed ? Math.round((paid / billed) * 100) : 0 };
  }, [fees]);

  const paidCount = fees.filter((f) => f.paid).length;
  const verifyingCount = fees.filter((f) => !f.paid && f.status === 'Pending Verification').length;
  const pendingCount = fees.filter((f) => !f.paid && f.status !== 'Pending Verification').length;

  const handlePayNow = () => {
    const firstPayable = fees.find((f) => !f.paid && f.status !== 'Pending Verification');
    if (firstPayable) {
      navigate('/student/finance/pay', { state: { feeId: firstPayable._id } });
    }
  };

  const statusPill = (f) => {
    if (f.paid) return <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">FULLY PAID</span>;
    if (f.status === 'Pending Verification') return <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">VERIFYING</span>;
    if (f.status === 'Rejected') return <span className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">REJECTED</span>;
    const overdue = f.dueDate && new Date(f.dueDate) < new Date();
    return <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${overdue ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{overdue ? 'OVERDUE' : 'PENDING'}</span>;
  };

  const handleDownloadReceipt = async (paymentId) => {
    try {
      const res = await axios.get(`/fees/receipts/${paymentId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      toast.success('Receipt downloaded.');
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('Receipt not yet available. Please contact the cashier if payment was recently made.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to download receipt.');
      }
    }
  };

  return (
    <StudentLayout searchPlaceholder="Search transactions...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Student Fee Status</h1>
          <p className="text-sm text-slate-500">{profile?.profile?.user?.name || 'Student'} · {profile?.grade || ''} · ID: {profile?.studentId || '—'}</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex flex-col items-center py-20 text-slate-400">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
          Loading fee data…
        </div>
      ) : error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-rose-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2zm0-8h2v6h-2z" /></svg>
          <p className="text-lg font-bold text-rose-700">Could not load fee data</p>
          <p className="mt-1 text-sm text-rose-500">The server may be unavailable or you may be offline.</p>
          <button onClick={load} className="mt-4 rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-rose-700">Retry</button>
        </div>
      ) : (<>
      {/* Top cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Balance Due</div>
          <div className="mt-1 text-3xl font-black text-slate-900">{etb(totals.due)} <span className="text-base font-bold text-slate-400">ETB</span></div>
          {totals.verifying > 0 && <div className="mt-2 text-sm font-semibold text-blue-600">ℹ {etb(totals.verifying)} ETB under verification</div>}
          {totals.due > 0 && <div className="mt-2 text-sm font-semibold text-rose-600">⚠ Payment outstanding</div>}
          <button
            onClick={handlePayNow}
            disabled={totals.due === 0}
            className="mt-4 w-full rounded-xl border border-slate-300 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Pay Now
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Annual Progress</div>
          <div className="mx-auto mt-3 flex h-28 w-28 items-center justify-center rounded-full border-8 border-slate-900 text-2xl font-black text-slate-900">{totals.pct}%</div>
          <div className="mt-3 text-xs text-slate-400">{etb(totals.paid)} ETB of {etb(totals.billed)} ETB</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Financial Summary</div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="font-semibold text-slate-600">Fully Paid</span><span className="rounded-md bg-slate-100 px-2.5 py-0.5 font-bold text-slate-900">{String(paidCount).padStart(2, '0')}</span></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-slate-600">Verifying</span><span className="rounded-md bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700">{String(verifyingCount).padStart(2, '0')}</span></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-slate-600">Pending Payment</span><span className="rounded-md bg-rose-50 px-2.5 py-0.5 font-bold text-rose-700">{String(pendingCount).padStart(2, '0')}</span></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-slate-600">Total Billed</span><span className="font-bold text-slate-900">ETB {etb(totals.billed)}</span></div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Categories */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Fee Categories Breakdown</h2>
          <div className="divide-y divide-slate-100">
            {fees.map((f, i) => (
              <div key={f._id || i} className="flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6z" /></svg>
                  </span>
                  <div>
                    <div className="font-bold text-slate-900">{f.description || 'Tuition'}</div>
                    <div className="text-xs text-slate-400">{f.month ? `${f.month} ` : ''}{f.dueDate ? `· Due ${new Date(f.dueDate).toLocaleDateString()}` : ''}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{etb(f.amount)} ETB</div>
                  <div className="mt-1">{statusPill(f)}</div>
                </div>
              </div>
            ))}
            {fees.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No fee records yet.</p>}
          </div>
        </section>

        {/* Transactions (paid fees) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-3 pr-4 font-semibold">Date</th>
                  <th className="py-3 pr-4 font-semibold">Description</th>
                  <th className="py-3 pr-4 text-right font-semibold">Amount</th>
                  <th className="py-3 pl-4 text-right font-semibold">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fees.filter((f) => f.paid).map((f, i) => (
                  <tr key={f._id || i} className="text-slate-700">
                    <td className="py-3 pr-4">{f.paymentDate ? new Date(f.paymentDate).toLocaleDateString() : (f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '—')}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{f.description || 'Tuition'}</td>
                    <td className="py-3 pr-4 text-right font-bold text-slate-900">{etb(f.amount)}</td>
                    <td className="py-3 pl-4 text-right">
                      {f.latestPayment?.status === 'Verified' ? (
                        <button onClick={() => handleDownloadReceipt(f.latestPayment.id)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-200">
                          Download
                        </button>
                      ) : f.latestPayment?.status === 'Pending' ? (
                        <span className="text-xs text-slate-400">Verifying</span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
                {fees.filter((f) => f.paid).length === 0 && <tr><td colSpan="4" className="py-8 text-center text-slate-400">No payments recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      </>)}
    </StudentLayout>
  );
}
