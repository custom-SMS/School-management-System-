import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { useBranch } from '../../context/BranchContext';

const barColors = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500'];

export default function SystemAnalytics() {
  const { selectedBranchId, branches, switchBranch, canSwitchBranch } = useBranch();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get('/stats/superadmin')
      .then((r) => setStats(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  if (loading) {
    return (
      <SuperAdminLayout pageTitle="System Analytics">
        <div className="py-12 text-center text-sm font-semibold text-slate-500">Loading analytics…</div>
      </SuperAdminLayout>
    );
  }

  if (error) {
    return (
      <SuperAdminLayout pageTitle="System Analytics">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center mt-6">
          <p className="text-sm font-bold text-red-600">⚠ Failed to load analytics.</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition">Retry</button>
        </div>
      </SuperAdminLayout>
    );
  }

  const divisionPerformance = stats?.divisionPerformance || [];
  const studentsByClass = stats?.studentsByClass || [];
  const studentDistribution = stats?.studentDistribution || [];
  const totalStudents = stats?.totalStudents ?? 0;
  const totalTeachers = stats?.totalTeachers ?? 0;
  const activeYear = stats?.activeYear ?? 'N/A';
  const systemHealth = stats?.systemHealth ?? 'Operational';

  return (
    <SuperAdminLayout pageTitle="System Analytics">
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">System Analytics</h1>
        <p className="text-sm text-slate-500">
          School-wide academic performance, enrollment, and operational health.
        </p>
      </div>

      {/* Branch selector */}
      {canSwitchBranch && (
        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</label>
          <select
            value={selectedBranchId || ''}
            onChange={(e) => switchBranch(e.target.value || null)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Top KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Students</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{totalStudents.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Teachers</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{totalTeachers.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active Year</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{activeYear}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">System Health</p>
          <p className={`mt-2 text-2xl font-black ${systemHealth === 'Operational' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {systemHealth}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-6">
        {/* Academic performance by division */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Academic Performance by Division</h2>
          <p className="text-xs text-slate-400 mb-5">Average grade percentage across school divisions</p>
          <div className="space-y-4">
            {divisionPerformance.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No academic data available yet.</p>
            ) : (
              divisionPerformance.map((div, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm font-semibold mb-1.5">
                    <span className="text-slate-700">{div.division}</span>
                    <span className="font-black text-slate-900">
                      {div.score != null ? `${div.score}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
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

        {/* Student distribution by division */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Student Distribution</h2>
          <p className="text-xs text-slate-400 mb-5">Enrollment count by school division</p>
          <div className="space-y-4">
            {studentDistribution.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No enrollment data available.</p>
            ) : (
              studentDistribution.map((div, i) => {
                const max = Math.max(...studentDistribution.map((d) => d.count), 1);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm font-semibold mb-1.5">
                      <span className="text-slate-700">{div.division}</span>
                      <span className="font-black text-slate-900">{div.count} students</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div
                        className={`${barColors[(i + 2) % barColors.length]} h-2.5 rounded-full transition-all`}
                        style={{ width: `${(div.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Enrollment by grade */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Enrollment by Grade</h2>
        <p className="text-xs text-slate-400 mb-5">Number of students per grade level</p>
        {studentsByClass.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No enrollment data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-2 h-40 min-w-max">
              {studentsByClass.map((g, i) => {
                const max = Math.max(...studentsByClass.map((s) => s.studentCount), 1);
                const heightPct = (g.studentCount / max) * 100;
                return (
                  <div key={i} className="flex flex-col items-center gap-1 w-14">
                    <span className="text-xs font-bold text-slate-600">{g.studentCount}</span>
                    <div
                      className={`w-full rounded-t-lg ${barColors[i % barColors.length]} transition-all`}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                    <span className="text-[10px] font-semibold text-slate-400 text-center leading-tight">
                      {g.className.replace('Grade ', 'G')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
