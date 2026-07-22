import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import AdminLayout from '../../components/AdminLayout';
import { useBranch } from '../../hooks/useBranch';
import { useAdminStatsQuery } from '../../queries/adminPortalQueries';

const StatCard = ({ title, value, colorClass, icon, loading }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex items-center justify-between hover:shadow-md transition">
    <div>
      <p className="text-sm font-semibold text-gray-500">{title}</p>
      {loading ? (
        <div className="mt-2 h-8 w-20 bg-gray-100 animate-pulse rounded-lg" />
      ) : (
        <h3 className="text-3xl font-black text-gray-900 mt-1">{value}</h3>
      )}
    </div>
    <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${colorClass} text-white`}>
      {icon}
    </div>
  </div>
);

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { activeSemester } = useBranch();
  const { data: stats, isLoading: loading, isError } = useAdminStatsQuery();
  const error = isError ? 'Failed to load dashboard data.' : '';

  if (error) {
    return (
      <AdminLayout pageTitle="Daily Operations">
        <div className="rounded-xl border border-red-200 bg-red-50 py-12 text-center text-red-600 font-semibold">
          {error}
        </div>
      </AdminLayout>
    );
  }

  const attendanceSummary = stats?.attendanceSummary || [];
  const studentsByClass = stats?.studentsByClass || [];
  const feeSummaryByClass = stats?.feeSummaryByClass || [];

  return (
    <AdminLayout pageTitle="Daily Operations">
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900">Operations Overview</h2>
            <p className="text-sm font-medium text-gray-500">Monitor daily school activities and administration.</p>
          </div>
          {activeSemester && (
            <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5">
              <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse"></div>
              <div>
                <div className="text-xs font-bold text-violet-700">Active Semester</div>
                <div className="text-sm font-black text-violet-900">
                  {activeSemester.name}
                  {activeSemester.academicYear?.year && (
                    <span className="ml-1.5 text-xs font-semibold text-violet-600">
                      {activeSemester.academicYear.year}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 mb-8">
        <StatCard
          loading={loading}
          title="Total Students"
          value={stats?.totalStudents?.toLocaleString() ?? '0'}
          colorClass="bg-blue-600"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
        <StatCard
          loading={loading}
          title="Today's Attendance Rate"
          value={`${stats?.avgAttendance ?? 0}%`}
          colorClass="bg-emerald-600"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          loading={loading}
          title="Total Revenue (ETB)"
          value={loading ? '—' : `ETB ${fmt(stats?.totalRevenue)}`}
          colorClass="bg-violet-600"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* ATTENDANCE + FEE PENDING */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Attendance by Class */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm lg:col-span-2 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Attendance by Class (Last 30 Days)</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-8 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : attendanceSummary.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No attendance data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500">
                    <th className="py-2 pr-4">Class</th>
                    <th className="py-2 pr-4">Sessions</th>
                    <th className="py-2 pr-4">Present</th>
                    <th className="py-2">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                  {attendanceSummary.slice(0, 8).map((row) => (
                    <tr key={row.classId} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4 font-bold text-gray-900">{row.className}</td>
                      <td className="py-2.5 pr-4">{row.sessions}</td>
                      <td className="py-2.5 pr-4">{row.present}/{row.checked}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${row.attendanceRate >= 80 ? 'bg-emerald-500' : row.attendanceRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${row.attendanceRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold">{row.attendanceRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Revenue Summary */}
        <div className="bg-gradient-to-br from-indigo-900 to-blue-700 rounded-xl p-6 shadow-md text-white flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-indigo-100 mb-1">Fee Collection</h3>
            <p className="text-sm text-indigo-300">School-wide revenue summary.</p>
          </div>
          {loading ? (
            <div className="mt-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-6 bg-indigo-700 animate-pulse rounded" />)}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center border-b border-indigo-600 pb-3">
                <span className="text-sm text-indigo-200">Total Collected</span>
                <span className="text-lg font-black">ETB {fmt(stats?.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-indigo-600 pb-3">
                <span className="text-sm text-indigo-200">Pending Revenue</span>
                <span className="text-lg font-black text-amber-300">ETB {fmt(stats?.totalPendingRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-indigo-200">Students Checked Today</span>
                <span className="text-lg font-black">{stats?.attendance?.totalChecked ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STUDENTS BY CLASS + FEE SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Students by Grade/Class */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Students by Grade</h3>
            <button
              onClick={() => navigate('/admin/students')}
              className="text-sm font-bold text-blue-600 hover:text-blue-800"
            >
              View All
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-gray-100 animate-pulse rounded-lg" />)}
            </div>
          ) : studentsByClass.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No students enrolled yet.</p>
          ) : (
            <div className="space-y-3">
              {studentsByClass.slice(0, 7).map((row, idx) => (
                <div key={`${row.className}-${row.classId || idx}`} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-gray-700">{row.className}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min((row.studentCount / (stats?.totalStudents || 1)) * 100 * 3, 100)}%` }}
                      />
                    </div>
                    <span className="font-black text-gray-900 w-8 text-right">{row.studentCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fee Summary by Class */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Fee Summary by Grade</h3>
            <button
              onClick={() => navigate('/finance/fees')}
              className="text-sm font-bold text-blue-600 hover:text-blue-800"
            >
              Manage
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-gray-100 animate-pulse rounded-lg" />)}
            </div>
          ) : feeSummaryByClass.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No fee records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500">
                    <th className="py-2 pr-3">Grade</th>
                    <th className="py-2 pr-3">Paid</th>
                    <th className="py-2 pr-3">Pending</th>
                    <th className="py-2">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium text-gray-700 text-xs">
                  {feeSummaryByClass.slice(0, 7).map((row) => (
                    <tr key={row.classId} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-3 font-bold text-gray-900">{row.className}</td>
                      <td className="py-2.5 pr-3 text-emerald-700 font-bold">ETB {fmt(row.paidAmount)}</td>
                      <td className="py-2.5 pr-3 text-amber-700 font-bold">ETB {fmt(row.pendingAmount)}</td>
                      <td className="py-2.5">
                        <span className="text-xs font-bold text-gray-500">{row.paidCount}✓ {row.pendingCount}⏳</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </AdminLayout>
  );
}
