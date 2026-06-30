import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import SuperAdminLayout from '../../components/SuperAdminLayout';

const StatCard = ({ title, value, subtitle, colorClass, icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
    <div className="flex items-center justify-between">
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${colorClass} text-white`}>
        {icon}
      </div>
      {subtitle && <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{subtitle}</span>}
    </div>
    <div className="mt-4">
      <h3 className="text-3xl font-black text-slate-900">{value}</h3>
      <p className="mt-1 text-sm font-semibold text-slate-500">{title}</p>
    </div>
  </div>
);

const barColors = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('/stats/superadmin')
      .then(res => setStats(res.data))
      .catch(err => {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to load dashboard statistics.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SuperAdminLayout pageTitle="Governance Console">
        <div className="py-12 text-center text-sm font-semibold text-slate-500">Loading metrics...</div>
      </SuperAdminLayout>
    );
  }

  if (error) {
    return (
      <SuperAdminLayout pageTitle="Governance Console">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm font-bold text-red-600">⚠ {error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition">Retry</button>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout pageTitle="Governance Console">
      <div className="mb-8">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Executive Overview</h2>
        <p className="text-sm font-medium text-slate-500">Global system metrics and health status.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents?.toLocaleString() || '0'}
          colorClass="bg-blue-600"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
        <StatCard
          title="Total Teachers"
          value={stats?.totalTeachers?.toLocaleString() || '0'}
          colorClass="bg-indigo-600"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <StatCard
          title="Total Cashiers"
          value={stats?.totalCashiers?.toLocaleString() || '0'}
          colorClass="bg-violet-600"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
        />
        <StatCard
          title="Total Revenue"
          value={`ETB ${((stats?.totalRevenue || 0) / 1000000).toFixed(2)}M`}
          colorClass="bg-emerald-600"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Academic Year"
          value={stats?.activeYear || 'N/A'}
          subtitle="Active"
          colorClass="bg-amber-500"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <StatCard
          title="System Health"
          value={stats?.systemHealth || 'OK'}
          subtitle="Status"
          colorClass={stats?.systemHealth === 'Operational' ? 'bg-green-600' : 'bg-red-600' }
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Analytics Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Division Performance */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-5">Division Performance</h3>
          <div className="space-y-4">
            {(stats?.divisionPerformance || []).length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No academic data available yet.</p>
            ) : (
              stats.divisionPerformance.map((div, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm font-semibold mb-1.5">
                    <span className="text-slate-700">{div.division}</span>
                    <span className="text-slate-900 font-black">{div.score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className={`${barColors[i % barColors.length]} h-2.5 rounded-full transition-all`} style={{ width: `${div.score}%` }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Revenue by Division */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-5">Revenue by Division</h3>
          <div className="space-y-3">
            {(stats?.revenueByDivision || []).length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No revenue data available yet.</p>
            ) : (
              stats.revenueByDivision.map((div, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${barColors[i % barColors.length]}`}></div>
                    <span className="text-sm font-semibold text-slate-700">{div.division}</span>
                  </div>
                  <span className="text-sm font-black text-emerald-700">ETB {(div.revenue / 1000).toLocaleString()}k</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lower Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Recent Audit Logs */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900">Recent Audit Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-bold">User</th>
                  <th className="pb-3 font-bold">Action</th>
                  <th className="pb-3 font-bold">Details</th>
                  <th className="pb-3 font-bold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                {(stats?.recentAuditLogs || []).map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 font-semibold">{log.user?.name || 'System'}</td>
                    <td className="py-3"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold">{log.action}</span></td>
                    <td className="py-3 truncate max-w-xs text-slate-500">{log.details}</td>
                    <td className="py-3 text-right text-slate-400 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
                {(!stats?.recentAuditLogs || stats.recentAuditLogs.length === 0) && (
                  <tr><td colSpan="4" className="py-4 text-center text-slate-400">No recent logs</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Highlights */}
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col justify-center items-center text-center">
            <h4 className="text-amber-600 font-black text-3xl">{stats?.unlockRequestsCount || 0}</h4>
            <span className="text-amber-900 text-sm font-semibold mt-1">Pending Unlock Requests</span>
            <button onClick={() => navigate('/admin/reports/attendance')} className="mt-4 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 w-full transition">Review Requests</button>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
            <h4 className="text-white font-bold text-lg">System Settings</h4>
            <span className="text-slate-400 text-xs font-medium mt-1">Manage global system configurations</span>
            <button onClick={() => navigate('/settings')} className="mt-4 px-4 py-2 bg-white text-slate-900 text-xs font-bold rounded-lg hover:bg-slate-100 w-full transition">Go to Settings</button>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
