import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import CashierLayout from '../../components/CashierLayout';

const etb = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(n || 0));

function StatCard({ label, value, badge, badgeTone = 'mint', sub, icon }) {
  const tones = {
    mint: 'bg-[#DCF5EB] text-[#0f5236]',
    rose: 'bg-[#FDF3F2] text-[#901e19] border border-[#f5c2c0]',
    blue: 'bg-[#E4EFF6] text-[#1c4d66]',
    slate: 'bg-[#e2ebf0] text-[#203e4f]',
  };
  return (
    <div className="rounded-2xl border border-[#d8e5ec] bg-white p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4f8] text-[#203e4f]">
          {icon || (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 7h20v10H2V7zm2 2v6h16V9H4z" /></svg>
          )}
        </span>
        {badge && (
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${tones[badgeTone]}`}>{badge}</span>
        )}
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#6a8b9c]">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-[#203e4f]">{value}</p>
      {sub && <p className="mt-2 text-xs font-medium text-[#7a9bb0]">{sub}</p>}
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

    const p1 = axios.get('/stats/admin').then((r) => { setStats(r.data); statsOk = true; }).catch(() => { });
    const p2 = axios.get('/fees/pending-verifications').then((r) => { setPending(r.data || []); pendingOk = true; }).catch(() => { });

    Promise.all([p1, p2]).finally(() => {
      if (!statsOk || !pendingOk) setError(true);
    });
  }, []);

  const totalRevenue = stats?.totalRevenue ?? 0;
  const outstanding = stats?.totalPendingRevenue ?? 0;
  const billed = totalRevenue + outstanding;
  const collectionRate = billed > 0 ? Number(((totalRevenue / billed) * 100).toFixed(1)) : 0;
  const activeYear = stats?.activeYear?.year || null;
  const periodLabel = activeYear ? `Academic Year ${activeYear}` : 'All Time';

  const revenueByGrade = (stats?.feeSummaryByClass ?? []).filter((g) => Number(g.paidAmount) > 0);
  const maxGradeRevenue = Math.max(1, ...revenueByGrade.map((g) => Number(g.paidAmount || 0)));

  return (
    <CashierLayout searchPlaceholder="Search students, receipts...">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#203e4f]">Financial Overview</h1>
        <p className="text-sm font-medium text-[#567a8c]">
          Real-time revenue tracking &mdash; <span className="font-bold text-[#203e4f]">{periodLabel}</span>
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 py-12 text-center text-red-600 font-semibold shadow-xs">
          Failed to load finance dashboard data.
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Revenue"
              value={`ETB ${etb(totalRevenue)}`}
              badge="Paid"
              badgeTone="mint"
              sub={periodLabel}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Outstanding Balance"
              value={`ETB ${etb(outstanding)}`}
              badge="Action Required"
              badgeTone="rose"
              sub={periodLabel}
              icon={
                <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Pending Verifications"
              value={`${pending.length} Students`}
              badge={`${pending.length} New`}
              badgeTone="blue"
              sub="Awaiting bank confirmation"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Collection Rate"
              value={`${collectionRate}%`}
              badge="Performance"
              badgeTone="slate"
              sub={`ETB ${etb(totalRevenue)} of ${etb(billed)} billed`}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
            {/* Revenue by grade */}
            <section className="rounded-3xl border border-[#d8e5ec] bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-[#203e4f]">Collected Revenue by Grade</h2>
                  <p className="text-xs font-semibold text-[#6a8b9c]">Paid tuition · {periodLabel}</p>
                </div>
              </div>

              {revenueByGrade.length === 0 ? (
                <div className="mt-8 flex h-64 items-center justify-center text-sm font-medium text-[#8daec0]">
                  No revenue collected yet for this period.
                </div>
              ) : (
                <div className="overflow-x-auto mt-8">
                  <div className="flex h-64 items-end gap-3 sm:gap-6 min-w-[500px] pb-2">
                    {revenueByGrade.map((g) => (
                      <div key={g.className} className="flex flex-1 flex-col items-center gap-2">
                        <span className="text-[11px] font-bold text-[#203e4f]">ETB {etb(g.paidAmount)}</span>
                        <div className="flex w-full items-end justify-center" style={{ height: '100%' }}>
                          <div
                            className="w-full max-w-12 rounded-t-xl bg-[#203e4f] transition-all hover:bg-[#2b5268]"
                            style={{ height: `${(Number(g.paidAmount) / maxGradeRevenue) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[#5a7c8e]">{g.className}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Live transactions */}
            <section className="rounded-3xl border border-[#d8e5ec] bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-[#203e4f]">Live Pending Activity</h2>
                  <span className="text-[11px] font-bold text-[#6a8b9c] uppercase tracking-wider">Real-time</span>
                </div>
                <div className="divide-y divide-[#edf3f6]">
                  {pending.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DCF5EB] text-[#0f5236] shrink-0 font-bold">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-[#203e4f]">{p.fee?.student?.user?.name || 'Student'}</div>
                          <div className="truncate text-xs font-medium text-[#799cb0]">{p.fee?.description || 'Tuition'} {p.fee?.month ? `• ${p.fee.month}` : ''}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-extrabold text-[#203e4f]">ETB {etb(p.amount)}</div>
                        <span className="inline-block rounded-full bg-[#FDF3F2] border border-[#f5c2c0] px-2 py-0.5 text-[10px] font-bold text-[#901e19]">
                          Pending
                        </span>
                      </div>
                    </div>
                  ))}
                  {pending.length === 0 && (
                    <p className="py-8 text-center text-sm font-medium text-[#8daec0]">No live transactions pending right now.</p>
                  )}
                </div>
              </div>
              <Link to="/finance/verification" className="mt-4 block rounded-2xl bg-[#eef4f8] py-3 text-center text-xs font-bold text-[#203e4f] transition hover:bg-[#dce9f0]">
                View Verification Queue &rarr;
              </Link>
            </section>
          </div>

          {/* Recent receipts */}
          <section className="mt-6 rounded-3xl border border-[#d8e5ec] bg-white p-6 shadow-xs">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-[#203e4f]">Recent Receipts Queue</h2>
                <p className="text-xs font-semibold text-[#6a8b9c]">Latest submitted payment receipts</p>
              </div>
              <Link to="/finance/payments" className="rounded-full bg-[#203e4f] px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#2b5268] shadow-sm">
                + Issue Receipt
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e2ebf0] text-[11px] font-bold uppercase tracking-wider text-[#6a8b9c]">
                    <th className="py-3 pr-4">Student</th>
                    <th className="py-3 pr-4">Description</th>
                    <th className="py-3 pr-4">Bank</th>
                    <th className="py-3 pr-4 text-right">Amount (ETB)</th>
                    <th className="py-3 pr-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf3f6]">
                  {pending.slice(0, 6).map((p) => (
                    <tr key={p.id} className="text-[#203e4f] hover:bg-[#f6fafc] transition">
                      <td className="py-3.5 pr-4 font-bold">{p.fee?.student?.user?.name || '—'}</td>
                      <td className="py-3.5 pr-4 text-xs font-medium text-[#507284]">{p.fee?.description || 'Tuition'}</td>
                      <td className="py-3.5 pr-4 text-xs font-semibold text-[#507284]">{p.bankName || '—'}</td>
                      <td className="py-3.5 pr-4 text-right font-extrabold text-[#203e4f]">{etb(p.amount)}</td>
                      <td className="py-3.5 pr-4 text-center">
                        <span className="rounded-full bg-[#FDF3F2] border border-[#f5c2c0] px-3 py-1 text-[10px] font-bold text-[#901e19]">
                          PENDING
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pending.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-sm font-medium text-[#8daec0]">No recent receipts to display.</td>
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
