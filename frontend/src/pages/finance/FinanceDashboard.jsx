import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import CashierLayout from '../../components/CashierLayout';

const etb = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(n || 0));

function StatCard({ label, value, badge, badgeTone = 'emerald', sub }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 7h20v10H2V7zm2 2v6h16V9H4z" /></svg>
        </span>
        {badge && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tones[badgeTone]}`}>{badge}</span>
        )}
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</p>
      {sub && <p className="mt-2 text-xs font-medium text-slate-400">{sub}</p>}
    </div>
  );
}

export default function FinanceDashboard() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let statsOk = false;
    let pendingOk = false;
    
    const p1 = axios.get('/stats/admin').then((r) => { setStats(r.data); statsOk = true; }).catch(() => {});
    const p2 = axios.get('/fees/pending-verifications').then((r) => { setPending(r.data || []); pendingOk = true; }).catch(() => {});
    
    Promise.all([p1, p2]).finally(() => {
      if (!statsOk || !pendingOk) setError(true);
    });
  }, []);

  const totalRevenue = stats?.totalRevenue ?? 0;
  const outstanding = stats?.totalPendingRevenue ?? 0;
  const billed = totalRevenue + outstanding;
  const collectionRate = billed > 0 ? Number(((totalRevenue / billed) * 100).toFixed(1)) : 0;

  // Real paid-revenue breakdown by grade (from the admin stats aggregate).
  const revenueByGrade = (stats?.feeSummaryByClass ?? []).filter((g) => Number(g.paidAmount) > 0);
  const maxGradeRevenue = Math.max(1, ...revenueByGrade.map((g) => Number(g.paidAmount || 0)));

  return (
    <CashierLayout searchPlaceholder="Search students, receipts...">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Financial Overview</h1>
        <p className="text-sm text-slate-500">Real-time revenue tracking for Addis Academy &mdash; Term II</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 py-12 text-center text-red-600 font-semibold">
          Failed to load finance dashboard data.
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Revenue" value={`ETB ${etb(totalRevenue)}`} />
            <StatCard label="Outstanding Balance" value={`ETB ${etb(outstanding)}`} badgeTone="rose" />
            <StatCard label="Pending Verifications" value={`${pending.length} Students`} badge={`${pending.length} New`} badgeTone="slate" sub="Awaiting bank confirmation" />
            <StatCard label="Collection Rate" value={`${collectionRate}%`} sub={`ETB ${etb(totalRevenue)} of ${etb(billed)} billed`} />
          </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Revenue by grade */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Collected Revenue by Grade</h2>
              <p className="text-sm text-slate-500">Paid tuition across grade levels</p>
            </div>
          </div>

          {revenueByGrade.length === 0 ? (
            <div className="mt-8 flex h-64 items-center justify-center text-sm text-slate-400">
              No revenue collected yet.
            </div>
          ) : (
            <div className="mt-8 flex h-64 items-end gap-3 sm:gap-6">
              {revenueByGrade.map((g) => (
                <div key={g.className} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">{etb(g.paidAmount)}</span>
                  <div className="flex w-full items-end justify-center" style={{ height: '100%' }}>
                    <div
                      className="w-full max-w-12 rounded-t-lg bg-slate-900 transition-all"
                      style={{ height: `${(Number(g.paidAmount) / maxGradeRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-400">{g.className}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Live transactions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Live Transactions</h2>
            <span className="text-xs font-semibold text-slate-400">Last updated now</span>
          </div>
          <div className="divide-y divide-slate-100">
            {pending.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{p.fee?.student?.user?.name || 'Student'}</div>
                    <div className="text-xs text-slate-400">{p.fee?.description || 'Tuition'} {p.fee?.month ? `• ${p.fee.month}` : ''}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">ETB {etb(p.amount)}</div>
                  <div className="text-xs text-slate-400">pending</div>
                </div>
              </div>
            ))}
            {pending.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No live transactions right now.</p>
            )}
          </div>
          <Link to="/finance/verification" className="mt-4 block rounded-xl bg-slate-50 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-100">
            View All Activity
          </Link>
        </section>
      </div>

      {/* Recent receipts */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Recent Receipts</h2>
          <Link to="/finance/payments" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800">
            + Issue Receipt
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-3 pr-4 font-semibold">Student</th>
                <th className="py-3 pr-4 font-semibold">Description</th>
                <th className="py-3 pr-4 font-semibold">Bank</th>
                <th className="py-3 pr-4 text-right font-semibold">Amount (ETB)</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pending.slice(0, 6).map((p) => (
                <tr key={p.id} className="text-slate-700">
                  <td className="py-3 pr-4 font-semibold text-slate-900">{p.fee?.student?.user?.name || '—'}</td>
                  <td className="py-3 pr-4">{p.fee?.description || 'Tuition'}</td>
                  <td className="py-3 pr-4">{p.bankName || '—'}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{etb(p.amount)}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">PENDING</span>
                  </td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">No recent receipts.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      </>
      )}
    </CashierLayout>
  );
}
