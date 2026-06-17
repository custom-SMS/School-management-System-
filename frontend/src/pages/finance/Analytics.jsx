import { useEffect, useMemo, useState } from 'react';
import axios from '../../api/axios';
import CashierLayout from '../../components/CashierLayout';

const etb = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

const months = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'];

export default function Analytics() {
  const [targetMonth, setTargetMonth] = useState('Meskerem');
  const [defaulters, setDefaulters] = useState([]);
  const [structures, setStructures] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    axios.get('/fees/structures').then((r) => setStructures(r.data || [])).catch(() => {});
    axios.get('/stats/admin').then((r) => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    axios.get(`/fees/defaulters/${targetMonth}`).then((r) => setDefaulters(r.data || [])).catch(() => setDefaulters([]));
  }, [targetMonth]);

  // Estimate arrears by matching each defaulter's grade to a fee structure.
  const feeForGrade = (grade) => {
    const num = String(grade || '').match(/\d+/)?.[0];
    const match = structures.find((s) => String(s.grade).match(/\d+/)?.[0] === num);
    return match ? Number(match.amount) : 0;
  };

  const totalArrears = useMemo(
    () => defaulters.reduce((sum, d) => sum + feeForGrade(d.grade), 0),
    [defaulters, structures],
  );

  // Real collection rate = paid / (paid + outstanding) from the admin aggregate.
  const totalRevenue = stats?.totalRevenue ?? 0;
  const billed = totalRevenue + (stats?.totalPendingRevenue ?? 0);
  const collectionRate = billed > 0 ? Number(((totalRevenue / billed) * 100).toFixed(1)) : 0;

  // Real paid-vs-outstanding split per grade for the chart.
  const byGrade = stats?.feeSummaryByClass ?? [];
  const maxGradeTotal = Math.max(1, ...byGrade.map((g) => Number(g.totalAmount || 0)));

  return (
    <CashierLayout searchPlaceholder="Search student records...">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Debt Oversight</h1>
          <p className="text-sm text-slate-500">Real-time monitoring of institutional arrears and collection efficiency.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10l3-3 1.4 1.4L12 16.8 7.6 11.4 9 10l3 3V3zM4 19h16v2H4z" /></svg>
            Export Report
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="m3 3 18 9-18 9 4-9-4-9zm4 9H3" /></svg>
            Bulk Reminders
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 7h20v10H2V7zm2 2v6h16V9H4z" /></svg>
            </span>
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Total Arrears (ETB)</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{etb(totalArrears)}</p>
          <p className="mt-2 text-xs text-slate-400">Estimated for {targetMonth}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z" /></svg>
            </span>
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Number of Defaulters</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{defaulters.length}</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(defaulters.length, 100)}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 17 17 7M8 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm8 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" /></svg>
            </span>
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Collection Rate %</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{collectionRate}%</p>
          <p className="mt-2 text-xs text-slate-400">Paid vs total billed to date</p>
        </div>
      </div>

      {/* Chart + urgent actions */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Collection by Grade</h2>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-900" /> Paid</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-300" /> Outstanding</span>
            </div>
          </div>
          {byGrade.length === 0 ? (
            <div className="mt-8 flex h-56 items-center justify-center text-sm text-slate-400">No billing data yet.</div>
          ) : (
            <div className="mt-8 flex h-56 items-end gap-3 sm:gap-6">
              {byGrade.map((g) => {
                const total = Number(g.totalAmount || 0);
                const heightPct = (total / maxGradeTotal) * 100;
                const paidShare = total > 0 ? (Number(g.paidAmount) / total) * 100 : 0;
                return (
                  <div key={g.className} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex w-full items-end justify-center" style={{ height: '100%' }}>
                      <div className="flex w-full max-w-12 flex-col justify-end overflow-hidden rounded-t-lg bg-rose-300" style={{ height: `${heightPct}%` }}>
                        <div className="bg-slate-900" style={{ height: `${paidShare}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-400">{g.className}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
          <h2 className="text-xl font-bold">Urgent Actions</h2>
          <div className="mt-5 space-y-3">
            <div className="rounded-xl bg-white/5 p-4">
              <div className="flex items-center gap-2 font-bold"><span className="text-rose-400">!</span> {defaulters.length} Defaulting Account{defaulters.length === 1 ? '' : 's'}</div>
              <p className="mt-1 text-sm text-slate-400">Unpaid for {targetMonth}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="flex items-center gap-2 font-bold">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 7h20v10H2V7zm2 2v6h16V9H4z" /></svg> ETB {etb(totalArrears)} Outstanding
              </div>
              <p className="mt-1 text-sm text-slate-400">Estimated arrears for {targetMonth}</p>
            </div>
          </div>
          <button className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100">
            Review Critical List
          </button>
        </section>
      </div>

      {/* Overdue table */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Overdue Student Balances</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Filter by:</span>
            <div className="flex rounded-lg border border-slate-200 p-1 font-semibold">
              {[['all', 'All'], ['critical', 'Critical (>60d)'], ['moderate', 'Moderate (30d+)']].map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)} className={`rounded-md px-3 py-1.5 transition ${filter === k ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>
                  {label}
                </button>
              ))}
            </div>
            <select value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600">
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-3 pr-4 font-semibold">Student Name</th>
                <th className="py-3 pr-4 text-right font-semibold">Balance (ETB)</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {defaulters.map((d) => (
                <tr key={d._id || d.id} className="text-slate-700">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                        {(d.user?.name || 'NA').split(' ').map((x) => x[0]).slice(0, 2).join('')}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{d.user?.name || '—'}</div>
                        <div className="text-xs text-slate-400">{d.grade || '—'} · {d.studentId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-right font-semibold text-slate-900">{etb(feeForGrade(d.grade))}</td>
                  <td className="py-4 pr-4">
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">UNPAID · {targetMonth}</span>
                  </td>
                  <td className="py-4 pr-4 text-slate-500">{d.user?.email || '—'}</td>
                </tr>
              ))}
              {defaulters.length === 0 && (
                <tr><td colSpan="4" className="py-10 text-center font-semibold text-emerald-600">✅ No defaulters for {targetMonth}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-400">Showing {defaulters.length} defaulter{defaulters.length === 1 ? '' : 's'}</p>
      </section>
    </CashierLayout>
  );
}
