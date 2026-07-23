import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { useBranch } from '../../hooks/useBranch';
import { useAdminStatsQuery } from '../../queries/adminPortalQueries';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(n || 0));

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { activeSemester } = useBranch();
  const { data: stats, isLoading: loading, isError } = useAdminStatsQuery();
  const [timeRange, setTimeRange] = useState('Last 6 months');
  const error = isError ? 'Failed to load dashboard data.' : '';

  if (error) {
    return (
      <AdminLayout pageTitle="Daily Operations">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600 font-semibold text-sm">
          {error}
        </div>
      </AdminLayout>
    );
  }

  const attendanceSummary = stats?.attendanceSummary || [];
  const studentsByClass = stats?.studentsByClass || [];
  const feeSummaryByClass = stats?.feeSummaryByClass || [];

  const totalStudentsCount = stats?.totalStudents ?? 0;
  const attendanceRate = stats?.avgAttendance ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;
  const pendingRevenue = stats?.totalPendingRevenue ?? 0;

  // Max students for horizontal bar scaling
  const maxStudents = Math.max(...studentsByClass.map(s => s.studentCount || 0), 1);

  return (
    <AdminLayout pageTitle="Operations Overview">
      
      {/* ── OVER VIEW STAT CARDS SECTION ── */}
      <section className="bg-white/70 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#d6e4ec] shadow-xs mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
          <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#63889b]">Over View</h2>
          {activeSemester && (
            <div className="flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] sm:text-xs font-bold text-teal-800">
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
              <span>{activeSemester.name} {activeSemester.academicYear?.year && `(${activeSemester.academicYear.year})`}</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Total Students */}
          <div className="bg-white rounded-2xl p-4 border border-[#d8e6ed] shadow-xs flex items-center justify-between hover:shadow-md transition">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-[#dcf5eb] text-[#2d7a64] flex items-center justify-center shrink-0">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              {loading ? (
                <div className="mt-2 h-7 w-20 bg-gray-200 animate-pulse rounded-md" />
              ) : (
                <h3 className="text-xl sm:text-2xl font-black text-[#203e4f] tracking-tight truncate">{totalStudentsCount.toLocaleString()}</h3>
              )}
              <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#66889a] mt-0.5">Total Students</p>
            </div>
          </div>

          {/* Card 2: Attendance Rate */}
          <div className="bg-white rounded-2xl p-4 border border-[#d8e6ed] shadow-xs flex items-center justify-between hover:shadow-md transition">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-[#e4eff6] text-[#366880] flex items-center justify-center shrink-0">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              {loading ? (
                <div className="mt-2 h-7 w-20 bg-gray-200 animate-pulse rounded-md" />
              ) : (
                <h3 className="text-xl sm:text-2xl font-black text-[#203e4f] tracking-tight truncate">{attendanceRate}%</h3>
              )}
              <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#66889a] mt-0.5">Today's Attendance</p>
            </div>
          </div>

          {/* Card 3: Total Revenue */}
          <div className="bg-white rounded-2xl p-4 border border-[#d8e6ed] shadow-xs flex items-center justify-between hover:shadow-md transition">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-[#dcf5eb] text-[#2d7a64] flex items-center justify-center shrink-0">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              {loading ? (
                <div className="mt-2 h-7 w-28 bg-gray-200 animate-pulse rounded-md" />
              ) : (
                <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-[#203e4f] tracking-tight truncate">ETB {fmt(totalRevenue)}</h3>
              )}
              <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#66889a] mt-0.5">Total Revenue</p>
            </div>
          </div>

          {/* Card 4: Pending Revenue */}
          <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs flex items-center justify-between hover:shadow-md transition">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-[#fdf3f2] text-rose-600 flex items-center justify-center shrink-0">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">ALERT</span>
              </div>
              {loading ? (
                <div className="mt-2 h-7 w-28 bg-gray-200 animate-pulse rounded-md" />
              ) : (
                <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-rose-600 tracking-tight truncate">ETB {fmt(pendingRevenue)}</h3>
              )}
              <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#66889a] mt-0.5">Pending Revenue</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── MIDDLE ROW: ACTIVE USERS & ATTENDANCE CHART ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* Left: Active Users Card */}
        <div className="lg:col-span-4 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#d8e6ed] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-black text-[#203e4f]">Active Users</h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#dcf5eb] text-[#2d7a64]">Live Now</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#f8fafc] border border-[#e8f1f5]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#e4eff6] text-[#203e4f] flex items-center justify-center font-bold text-xs">S</div>
                  <div>
                    <div className="text-xs font-bold text-[#203e4f]">Students Enrolled</div>
                    <div className="text-[10px] font-semibold text-[#799cb0]">Academic Directory</div>
                  </div>
                </div>
                <span className="text-sm font-black text-[#203e4f]">{totalStudentsCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#f8fafc] border border-[#e8f1f5]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#dcf5eb] text-[#2d7a64] flex items-center justify-center font-bold text-xs">T</div>
                  <div>
                    <div className="text-xs font-bold text-[#203e4f]">Faculty & Staff</div>
                    <div className="text-[10px] font-semibold text-[#799cb0]">Assigned Teachers</div>
                  </div>
                </div>
                <span className="text-sm font-black text-[#203e4f]">{stats?.totalTeachers ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#edf3f6] flex items-center justify-between text-xs">
            <span className="text-[#6a8b9c] font-semibold">System Capacity</span>
            <span className="font-bold text-emerald-600">Operational (100%)</span>
          </div>
        </div>

        {/* Right: Attendance Rate Donut & Summary */}
        <div className="lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#d8e6ed] shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#203e4f]">Attendance Breakdown</h3>
              <p className="text-xs font-semibold text-[#66889a]">Live daily presence statistics across classes</p>
            </div>
            <button onClick={() => navigate('/admin/reports')} className="text-xs font-extrabold text-[#3b6b82] hover:text-[#203e4f] transition">
              View Detailed Attendance &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Donut Chart representation */}
            <div className="flex flex-col items-center justify-center p-4">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#e2ebf0]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#203e4f] transition-all duration-1000"
                    strokeDasharray={`${attendanceRate}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xl sm:text-2xl font-black text-[#203e4f]">{attendanceRate}%</span>
                  <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#6a8b9c]">Present</span>
                </div>
              </div>
            </div>

            {/* Attendance Class Bars */}
            <div className="sm:col-span-2 space-y-3">
              {attendanceSummary.slice(0, 4).map((item) => (
                <div key={item.className}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-[#203e4f]">{item.className}</span>
                    <span className="text-[#3b6b82] font-black">{item.rate}% Present</span>
                  </div>
                  <div className="w-full bg-[#e2ebf0] rounded-full h-2">
                    <div
                      className="bg-[#203e4f] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              ))}
              {attendanceSummary.length === 0 && (
                <p className="text-center py-6 text-xs text-[#8daec0] font-medium">No attendance records today.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── BOTTOM ROW: STUDENTS BY GRADE & REVENUE SUMMARY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Horizontal Bar Chart: Students by Grade */}
        <div className="lg:col-span-6 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#d8e6ed] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-black text-[#203e4f]">Students Distribution by Grade</h3>
            <span className="text-xs font-bold text-[#6a8b9c]">Academic Year</span>
          </div>

          <div className="space-y-3 mt-4">
            {studentsByClass.map((c) => (
              <div key={c.className} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#203e4f]">{c.className}</span>
                  <span className="text-[#3b6b82]">{c.studentCount} Students</span>
                </div>
                <div className="w-full bg-[#e2ebf0] rounded-full h-2.5">
                  <div
                    className="bg-[#3b6b82] h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(c.studentCount / maxStudents) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {studentsByClass.length === 0 && (
              <p className="text-center py-8 text-xs text-[#8daec0] font-medium">No class data available.</p>
            )}
          </div>
        </div>

        {/* Revenue Summary Table by Grade */}
        <div className="lg:col-span-6 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#d8e6ed] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-black text-[#203e4f]">Collected Revenue by Grade</h3>
            <span className="text-xs font-bold text-[#0f5236] bg-[#dcf5eb] px-2.5 py-0.5 rounded-full">Financial Summary</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#e2ebf0] text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-[#6a8b9c]">
                  <th className="py-2.5 pr-2 sm:pr-4">Grade</th>
                  <th className="py-2.5 pr-2 sm:pr-4 text-right">Collected (ETB)</th>
                  <th className="py-2.5 pr-2 sm:pr-4 text-right">Pending (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3f6]">
                {feeSummaryByClass.map((f) => (
                  <tr key={f.className} className="text-[#203e4f] hover:bg-[#f6fafc] transition">
                    <td className="py-2.5 pr-2 sm:pr-4 font-bold">{f.className}</td>
                    <td className="py-2.5 pr-2 sm:pr-4 text-right font-black text-[#0f5236]">{fmt(f.paidAmount)}</td>
                    <td className="py-2.5 pr-2 sm:pr-4 text-right font-bold text-rose-600">{fmt(f.pendingAmount)}</td>
                  </tr>
                ))}
                {feeSummaryByClass.length === 0 && (
                  <tr>
                    <td colSpan="3" className="py-8 text-center text-xs text-[#8daec0] font-medium">No financial summary records.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </AdminLayout>
  );
}
