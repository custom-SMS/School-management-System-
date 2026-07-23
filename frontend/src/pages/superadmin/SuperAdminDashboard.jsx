import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { useAcademicYear } from '../../context/AcademicYearContext';

const StatCard = ({ title, value, subtitle, badgeTone = 'blue', icon }) => {
  const badgeStyles = {
    blue: 'bg-[#E4EFF6] text-[#1c4d66]',
    mint: 'bg-[#DCF5EB] text-[#0f5236]',
    slate: 'bg-[#e2ebf0] text-[#203e4f]',
    rose: 'bg-[#FDF3F2] text-[#901e19] border border-[#f5c2c0]',
  };

  return (
    <div className="rounded-2xl border border-[#d8e5ec] bg-white p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4f8] text-[#203e4f]">
          {icon}
        </div>
        {subtitle && (
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${badgeStyles[badgeTone]}`}>
            {subtitle}
          </span>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-black tracking-tight text-[#203e4f]">{value}</h3>
        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#6a8b9c]">{title}</p>
      </div>
    </div>
  );
};

const barColors = ['bg-[#203e4f]', 'bg-[#3b6b82]', 'bg-[#4b84a1]', 'bg-[#5e9bb9]', 'bg-[#7eb5d1]'];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { selectedYear, isViewingHistory } = useAcademicYear();
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
  }, [selectedYear]);

  if (loading) {
    return (
      <SuperAdminLayout pageTitle="Governance Console">
        <div className="py-16 text-center text-sm font-bold text-[#6a8b9c]">Loading system governance metrics...</div>
      </SuperAdminLayout>
    );
  }

  if (error) {
    return (
      <SuperAdminLayout pageTitle="Governance Console">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-xs">
          <p className="text-sm font-bold text-red-600">⚠ {error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-full bg-red-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-red-700 transition">Retry</button>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout pageTitle="Governance Console">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#203e4f]">Executive Overview</h2>
        <p className="text-sm font-medium text-[#567a8c]">Global system metrics and health status.</p>
      </div>

      {/* Academic year context banner */}
      {isViewingHistory && selectedYear && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-[#FDF3F2] border border-[#f5c2c0] rounded-2xl text-xs font-bold text-[#901e19]">
          <span>📅 Viewing historical data for {selectedYear.year}</span>
          <span className="text-[#a8322d] font-normal">— data is read-only for this year</span>
        </div>
      )}
      {!isViewingHistory && selectedYear && (
        <div className="mb-6 flex items-center gap-2 px-4 py-2.5 bg-[#DCF5EB] border border-[#a3e2c9] rounded-2xl text-xs font-bold text-[#0f5236]">
          <span className="inline-block w-2 h-2 rounded-full bg-[#0f5236] mr-1" />
          <span>Active Academic Year: {selectedYear.year}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents?.toLocaleString() || '0'}
          badgeTone="blue"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
        <StatCard
          title="Total Teachers"
          value={stats?.totalTeachers?.toLocaleString() || '0'}
          badgeTone="blue"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <StatCard
          title="Total Cashiers"
          value={stats?.totalCashiers?.toLocaleString() || '0'}
          badgeTone="slate"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
        />
        <StatCard
          title={`Total Revenue (${stats?.activeYear || 'Active'})`}
          value={`ETB ${((stats?.totalRevenue || 0) / 1000000).toFixed(2)}M`}
          subtitle={stats?.allTimeRevenue > stats?.totalRevenue ? `All-time: ${((stats?.allTimeRevenue || 0) / 1000000).toFixed(1)}M` : undefined}
          badgeTone="mint"
          icon={<svg className="w-5 h-5 text-[#0f5236]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Academic Year"
          value={stats?.activeYear || 'N/A'}
          subtitle="Active"
          badgeTone="mint"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <StatCard
          title="System Health"
          value={stats?.systemHealth || 'OK'}
          subtitle="Status"
          badgeTone={stats?.systemHealth === 'Operational' ? 'mint' : 'rose'}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Analytics Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Division Performance */}
        <div className="bg-white border border-[#d8e5ec] rounded-3xl p-6 shadow-xs">
          <h3 className="text-lg font-extrabold text-[#203e4f] mb-5">Division Performance</h3>
          <div className="space-y-4">
            {(stats?.divisionPerformance || []).length === 0 ? (
              <p className="py-6 text-center text-sm font-medium text-[#8daec0]">No academic data available yet.</p>
            ) : (
              stats.divisionPerformance.map((div, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-[#567a8c]">{div.division}</span>
                    <span className="text-[#203e4f] font-black">
                      {div.score != null ? `${div.score}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full bg-[#eef4f8] rounded-full h-2.5">
                    <div
                      className={`${barColors[i % barColors.length]} h-2.5 rounded-full transition-all`}
                      style={{ width: div.score != null ? `${div.score}%` : '0%' }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Revenue by Division */}
        <div className="bg-white border border-[#d8e5ec] rounded-3xl p-6 shadow-xs">
          <h3 className="text-lg font-extrabold text-[#203e4f] mb-5">Revenue by Division</h3>
          <div className="space-y-3">
            {(stats?.revenueByDivision || []).length === 0 ? (
              <p className="py-6 text-center text-sm font-medium text-[#8daec0]">No revenue data available yet.</p>
            ) : (
              stats.revenueByDivision.map((div, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 border border-[#edf3f6] rounded-2xl hover:bg-[#f6fafc] transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${barColors[i % barColors.length]}`}></div>
                    <span className="text-xs font-bold text-[#203e4f]">{div.division}</span>
                  </div>
                  <span className="text-xs font-extrabold text-[#0f5236]">ETB {(div.revenue / 1000).toLocaleString()}k</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lower Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Recent Audit Logs */}
        <div className="bg-white border border-[#d8e5ec] rounded-3xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-extrabold text-[#203e4f]">Recent Audit Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider font-bold text-[#6a8b9c] border-b border-[#e2ebf0]">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Details</th>
                  <th className="pb-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3f6] text-[#203e4f]">
                {(stats?.recentAuditLogs || []).map((log) => (
                  <tr key={log.id} className="hover:bg-[#f6fafc] transition">
                    <td className="py-3 font-bold text-xs">{log.user?.name || 'System'}</td>
                    <td className="py-3">
                      <span className="px-2.5 py-1 bg-[#E4EFF6] text-[#1c4d66] rounded-full text-[10px] font-extrabold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 truncate max-w-xs text-xs font-medium text-[#507284]">{log.details}</td>
                    <td className="py-3 text-right text-[#799cb0] text-[11px] font-medium">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
                {(!stats?.recentAuditLogs || stats.recentAuditLogs.length === 0) && (
                  <tr><td colSpan="4" className="py-6 text-center text-xs font-medium text-[#8daec0]">No recent system audit logs</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Highlights */}
        <div className="space-y-4">
          <div className="bg-[#203e4f] border border-[#2b5268] rounded-3xl p-6 flex flex-col justify-between shadow-md">
            <div>
              <h4 className="text-white font-extrabold text-lg">System Settings</h4>
              <p className="text-[#9bbcc9] text-xs font-medium mt-1">Manage global system configurations, security policies, and branding.</p>
            </div>
            <button
              onClick={() => navigate('/super-admin/settings')}
              className="mt-6 px-5 py-3 bg-white text-[#203e4f] text-xs font-extrabold rounded-full hover:bg-slate-100 w-full transition shadow-sm"
            >
              Go to System Settings &rarr;
            </button>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
