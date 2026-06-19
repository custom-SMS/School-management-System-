import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import AdminLayout from '../../components/AdminLayout';

const StatCard = ({ title, value, colorClass, icon }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex items-center justify-between hover:shadow-md transition">
    <div>
      <p className="text-sm font-semibold text-gray-500">{title}</p>
      <h3 className="text-3xl font-black text-gray-900 mt-1">{value}</h3>
    </div>
    <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${colorClass} text-white`}>
      {icon}
    </div>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/stats/admin')
      .then(res => setStats(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout pageTitle="Daily Operations">
        <div className="py-12 text-center text-sm font-semibold text-gray-500">Loading operational data...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Daily Operations">
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-gray-900">Operations Overview</h2>
        <p className="text-sm font-medium text-gray-500">Monitor daily school activities and administration.</p>
      </div>

      {/* KPI CARDS */}
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
          title="Attendance Rate"
          value={`${stats?.avgAttendance || 0}%`}
          colorClass="bg-emerald-600"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Academic Score"
          value="82%"
          colorClass="bg-amber-500"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
        <StatCard
          title="Active Classes"
          value={stats?.attendanceSummary?.length || 0}
          colorClass="bg-violet-600"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
        />
        <StatCard
          title="Pending Reg."
          value="14"
          colorClass="bg-red-500"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* OPERATIONAL PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 1. Attendance Trends */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Attendance Trends</h3>
            <select className="text-sm border border-gray-200 rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>
          <div className="h-64 flex items-end justify-between space-x-2">
            {[65, 78, 85, 92, 88, 70, 95].map((h, i) => (
              <div key={i} className="w-full bg-slate-100 rounded-t-md relative group">
                <div
                  className="absolute bottom-0 w-full bg-blue-500 rounded-t-md transition-all duration-500 group-hover:bg-blue-600"
                  style={{ height: `${h}%` }}
                ></div>
                <div className="absolute -bottom-6 w-full text-center text-xs font-bold text-gray-400">Day {i+1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* School Academic Health */}
        <div className="bg-gradient-to-br from-indigo-900 to-blue-700 rounded-xl p-6 shadow-md text-white flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-indigo-100 mb-2">Academic Health</h3>
            <p className="text-sm text-indigo-300">Overall school performance across all divisions.</p>
          </div>
          <div className="mt-8 text-center">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-indigo-500 mb-4">
              <span className="text-4xl font-black">A-</span>
            </div>
            <p className="font-bold text-indigo-100">Top Performing Subject:</p>
            <p className="text-xl font-black text-white">Mathematics</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Student Registrations */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Recent Registrations</h3>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-800">View All</button>
          </div>
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    S{i}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">New Student {i}</p>
                    <p className="text-xs text-gray-500">Grade {7 + i}</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-md">Pending</span>
              </div>
            ))}
          </div>
        </div>

        {/* Teacher Assignment Overview */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Teacher Overview</h3>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-800">Manage</button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-600">Total Assigned Classes</span>
              <span className="font-black text-gray-900">142</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
            <div className="flex justify-between items-center text-sm pt-2">
              <span className="font-medium text-gray-600">Pending Assignments</span>
              <span className="font-black text-red-600">8</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Upcoming Events</h3>
          <div className="relative border-l border-gray-200 ml-3 space-y-6">
            <div className="relative pl-6">
              <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-blue-600 rounded-full ring-4 ring-white"></div>
              <p className="text-xs font-bold text-blue-600">Tomorrow</p>
              <p className="text-sm font-bold text-gray-900 mt-1">Midterm Examinations Begin</p>
              <p className="text-xs text-gray-500 mt-1">All divisions</p>
            </div>
            <div className="relative pl-6">
              <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-gray-300 rounded-full ring-4 ring-white"></div>
              <p className="text-xs font-bold text-gray-500">Next Week</p>
              <p className="text-sm font-bold text-gray-900 mt-1">Parent-Teacher Conference</p>
            </div>
          </div>
        </div>

        {/* Activities Feed */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Activities Feed</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </div>
              <div>
                <p className="text-sm text-gray-900"><span className="font-bold">Mr. Smith</span> recorded grades for <span className="font-bold">Grade 10 Biology</span>.</p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p className="text-sm text-gray-900"><span className="font-bold">Ms. Davis</span> submitted attendance for <span className="font-bold">Grade 8 Math</span>.</p>
                <p className="text-xs text-gray-500 mt-1">5 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
