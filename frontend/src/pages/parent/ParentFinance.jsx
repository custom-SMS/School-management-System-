import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ParentLayout from '../../components/ParentLayout';
import { useParentChildren } from '../../hooks/useParentChildren';

const etb = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

export default function ParentFinance() {
  const navigate = useNavigate();
  const { children, childId, setChildId, selectedChild, loading } = useParentChildren();
  const fees = selectedChild?.fees || [];
  const name = selectedChild?.profile?.user?.name || 'Child';

  const totals = useMemo(() => {
    let billed = 0, paid = 0, due = 0;
    fees.forEach((f) => {
      const amt = Number(f.amount || 0);
      billed += amt;
      if (f.paid) paid += amt; else due += amt;
    });
    return { billed, paid, due, pct: billed ? Math.round((paid / billed) * 100) : 0 };
  }, [fees]);

  const paidCount = fees.filter((f) => f.paid).length;
  const pendingCount = fees.filter((f) => !f.paid).length;

  const handlePayNow = () => {
    if (!selectedChild) return;
    const firstUnpaid = fees.find((f) => !f.paid);
    navigate('/parent/finance/pay', { state: { feeId: firstUnpaid?._id } });
  };

  const statusPill = (f) => {
    if (f.paid) return <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">FULLY PAID</span>;
    const overdue = f.dueDate && new Date(f.dueDate) < new Date();
    return <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${overdue ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{overdue ? 'OVERDUE' : 'PENDING'}</span>;
  };

  return (
    <ParentLayout kids={children} childId={childId} onSelectChild={setChildId}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Fee Statement</h1>
          <p className="text-sm text-slate-500">{name} · {selectedChild?.profile?.grade || ''} · ID {selectedChild?.profile?.studentId || '—'}</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10l3-3 1.4 1.4L12 16.8 7.6 11.4 9 10l3 3V3zM4 19h16v2H4z" /></svg>
          Download Statement
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">Loading…</div>
      ) : !selectedChild ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">No children are linked to this account.</div>
      ) : (
        <>
          {/* Top cards */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Balance Due</div>
              <div className="mt-1 text-3xl font-black text-slate-900">{etb(totals.due)} <span className="text-base font-bold text-slate-400">ETB</span></div>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fees.filter((f) => f.paid).map((f, i) => (
                      <tr key={f._id || i} className="text-slate-700">
                        <td className="py-3 pr-4">{f.paymentDate ? new Date(f.paymentDate).toLocaleDateString() : (f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '—')}</td>
                        <td className="py-3 pr-4 font-semibold text-slate-900">{f.description || 'Tuition'}</td>
                        <td className="py-3 pr-4 text-right font-bold text-slate-900">{etb(f.amount)}</td>
                      </tr>
                    ))}
                    {fees.filter((f) => f.paid).length === 0 && <tr><td colSpan="3" className="py-8 text-center text-slate-400">No payments recorded yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </ParentLayout>
  );
}
