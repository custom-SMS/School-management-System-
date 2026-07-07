import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import SuperAdminLayout from '../../components/SuperAdminLayout';

const etb = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(n || 0));

export default function FinancialOversight() {
  const [superStats, setSuperStats] = useState(null);   // /stats/superadmin — all-time, cross-year
  const [adminStats, setAdminStats] = useState(null);   // /stats/admin — scoped to active year
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get('/stats/superadmin'),
      axios.get('/stats/admin'),
      axios.get('/fees/structures'),
    ])
      .then(([r1, r2, r3]) => {
        setSuperStats(r1.data);
        setAdminStats(r2.data);
        setFeeStructures(r3.data || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SuperAdminLayout pageTitle="Financial Oversight">
        <div className="py-12 text-center text-sm font-semibold text-slate-500">Loading financial data…</div>
      </SuperAdminLayout>
    );
  }

  if (error) {
    return (
      <SuperAdminLayout pageTitle="Financial Oversight">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center mt-6">
          <p className="text-sm font-bold text-red-600">⚠ Failed to load financial data.</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition">Retry</button>
        </div>
      </SuperAdminLayout>
    );
  }

  const activeYear = adminStats?.activeYear?.year;
  const currentRevenue = adminStats?.totalRevenue ?? 0;
  const currentOutstanding = adminStats?.totalPendingRevenue ?? 0;
  const currentBilled = currentRevenue + currentOutstanding;
  const collectionRate = currentBilled > 0 ? ((currentRevenue / currentBilled) * 100).toFixed(1) : '0.0';

  const allTimeRevenue = superStats?.totalRevenue ?? 0;
  const cashiers = superStats?.totalCashiers ?? 0;

  const revenueByDivision = superStats?.revenueByDivision || [];
  const feeSummaryByClass = adminStats?.feeSummaryByClass || [];
  const configuredGrades = feeStructures.length;

  return (
    <SuperAdminLayout pageTitle="Financial Oversight">
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Financial Oversight</h1>
        <p className="text-sm text-slate-500">
          Read-only financial audit across all academic years and the active term.
        </p>
      </div>

      {/* Active year vs all-time banner */}
      <div className="mb-6 flex flex-wrap gap-3">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700">
          Active Year: {activeYear || 'None'}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-bold text-slate-600">
          All-time revenue includes all academic years
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {/* Active year revenue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Revenue — {activeYear || 'Active Year'}</p>
          <p className="mt-2 text-2xl font-black text-emerald-700">ETB {etb(currentRevenue)}</p>
          <p className="mt-1 text-xs text-slate-400">Collected this academic year</p>
        </div>

        {/* Active year outstanding */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Outstanding — {activeYear || 'Active Year'}</p>
          <p className="mt-2 text-2xl font-black text-rose-600">ETB {etb(currentOutstanding)}</p>
          <p className="mt-1 text-xs text-slate-400">Unpaid invoices this year</p>
        </div>

        {/* Collection rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Collection Rate</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{collectionRate}%</p>
          <p className="mt-1 text-xs text-slate-400">ETB {etb(currentRevenue)} of {etb(currentBilled)} billed</p>
        </div>

        {/* All-time revenue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">All-Time Revenue</p>
          <p className="mt-2 text-2xl font-black text-slate-900">ETB {etb(allTimeRevenue)}</p>
          <p className="mt-1 text-xs text-slate-400">Across all academic years</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-6">
        {/* Revenue by division — all time */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Revenue by Division</h2>
          <p className="text-xs text-slate-400 mb-4">All-time collected across school divisions</p>
          <div className="space-y-3">
            {revenueByDivision.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No revenue data.</p>
            ) : (
              revenueByDivision.map((div, i) => {
                const maxRev = Math.max(...revenueByDivision.map((d) => d.revenue), 1);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm font-semibold mb-1">
                      <span className="text-slate-700">{div.division}</span>
                      <span className="text-emerald-700 font-black">ETB {etb(div.revenue)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all"
                        style={{ width: `${(div.revenue / maxRev) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Per-grade breakdown — active year */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Grade Fee Collection — {activeYear || 'Active Year'}</h2>
          <p className="text-xs text-slate-400 mb-4">Paid vs outstanding per grade this year</p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {feeSummaryByClass.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No invoices generated yet.</p>
            ) : (
              feeSummaryByClass.map((g) => (
                <div key={g.className} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 hover:bg-slate-50">
                  <span className="text-sm font-bold text-slate-800">{g.className}</span>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="text-emerald-600">Paid: ETB {etb(g.paidAmount)}</span>
                    <span className="text-rose-500">Due: ETB {etb(g.pendingAmount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Fee structure audit */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Fee Structure Audit</h2>
            <p className="text-xs text-slate-400">{configuredGrades} grade{configuredGrades !== 1 ? 's' : ''} configured · {cashiers} cashier{cashiers !== 1 ? 's' : ''} active</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-semibold">Grade</th>
                <th className="pb-3 font-semibold">Monthly Tuition</th>
                <th className="pb-3 text-right font-semibold">Annual (×12)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {feeStructures.length === 0 ? (
                <tr><td colSpan="3" className="py-8 text-center text-slate-400">No fee structures configured.</td></tr>
              ) : (
                feeStructures.map((s) => (
                  <tr key={s.id} className="text-slate-700">
                    <td className="py-3 font-bold text-slate-900">{s.grade}</td>
                    <td className="py-3">ETB {etb(s.amount)}</td>
                    <td className="py-3 text-right font-semibold text-slate-900">ETB {etb(s.amount * 12)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
