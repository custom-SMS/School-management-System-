import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import SuperAdminLayout from '../../components/SuperAdminLayout';

export default function FinancialOversight() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios.get('/stats/superadmin')
      .then(res => setStats(res.data))
      .catch(err => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SuperAdminLayout pageTitle="Financial Oversight"><div className="p-4">Loading...</div></SuperAdminLayout>;
  if (error) return (
    <SuperAdminLayout pageTitle="Financial Oversight">
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center mt-6">
        <p className="text-sm font-bold text-red-600">⚠ Failed to load financial statistics.</p>
        <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition">Retry</button>
      </div>
    </SuperAdminLayout>
  );

  return (
    <SuperAdminLayout pageTitle="Financial Oversight">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Executive Financial Overview</h2>
        <p className="text-sm font-medium text-slate-500">Read-only access to global financial analytics.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase">Total Verified Revenue</h3>
            <p className="text-3xl font-black text-emerald-700">ETB {stats?.totalRevenue?.toLocaleString() || '0'}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
          <div className="h-16 w-16 bg-red-100 text-zinc-600 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase">System Cashiers</h3>
            <p className="text-3xl font-black text-slate-900">{stats?.totalCashiers || 0} Active</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Revenue by Division</h3>
        <div className="space-y-4">
          {(stats?.revenueByDivision || []).map((div, i) => (
            <div key={i} className="flex justify-between items-center p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition">
              <span className="font-bold text-slate-700">{div.division}</span>
              <span className="font-black text-slate-600">ETB {div.revenue.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
