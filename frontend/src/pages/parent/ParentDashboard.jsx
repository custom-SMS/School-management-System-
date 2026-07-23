import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ParentLayout from '../../components/ParentLayout';
import { useParentChildren } from '../../hooks/useParentChildren';
import axios from '../../api/axios';

const etb = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

export default function ParentDashboard() {
  const { children, childId, setChildId, selectedChild, loading, error } = useParentChildren();
  const [gradingSettings, setGradingSettings] = useState({ gpaEnabled: false, passMark: 50 });

  useEffect(() => {
    axios.get('/settings/public').then((r) => setGradingSettings(r.data?.grading || { gpaEnabled: false, passMark: 50 })).catch(() => {});
  }, []);

  const grades = selectedChild?.grades || [];
  const fees = selectedChild?.fees || [];
  const attendance = selectedChild?.attendance || [];

  const avgGrade = grades.length ? Math.round(grades.reduce((s, g) => s + Number(g.percentage || 0), 0) / grades.length) : 0;
  const gpa = (avgGrade / 100 * 4).toFixed(2);
  const passStatus = avgGrade >= gradingSettings.passMark ? 'Pass' : 'Fail';
  const present = attendance.filter((a) => a.status === 'Present').length;
  const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
  const balance = fees.filter((f) => !f.paid && f.latestPayment?.status !== 'Pending').reduce((s, f) => s + Number(f.amount || 0), 0);
  const name = selectedChild?.profile?.user?.name || 'your child';

  return (
    <ParentLayout kids={children} childId={childId} onSelectChild={setChildId}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#203e4f] tracking-tight">
            Hello, {name.split(' ')[0]}'s guardian !
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[#63889b] mt-0.5">
            A snapshot of {name}'s academic progress, attendance, and account balance.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#d8e6ed] bg-white py-16 text-center text-[#63889b]">Loading child records…</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-[#fdf3f2] p-8 text-center text-[#c53929]">
          <p className="font-bold text-base">Could not load child data.</p>
          <p className="mt-1 text-xs">The server may be offline. Please refresh or try again later.</p>
        </div>
      ) : !selectedChild ? (
        <div className="rounded-2xl border border-dashed border-[#d8e6ed] bg-white py-16 text-center text-[#63889b]">
          No children are linked to this account.
        </div>
      ) : (
        <>
          {/* Over View Cards Section */}
          <section className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-[#d6e4ec] shadow-xs mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#63889b] mb-3 px-1">Overview</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Card 1: Academic Score */}
              <div className="bg-white rounded-xl p-5 border border-[#d8e6ed] shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#dcf5eb] text-[#2d7a64] flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#63889b]">
                    {gradingSettings.gpaEnabled ? 'GPA' : 'Average Grade'}
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-[#203e4f]">
                  {gradingSettings.gpaEnabled ? gpa : `${avgGrade}%`}
                </div>
                {!gradingSettings.gpaEnabled && (
                  <div className={`mt-1 text-xs font-bold ${passStatus === 'Pass' ? 'text-[#2d7a64]' : 'text-[#c53929]'}`}>
                    Status: {passStatus}
                  </div>
                )}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#edf3f6]">
                  <div className="h-full rounded-full bg-[#3b6b82]" style={{ width: `${avgGrade}%` }} />
                </div>
              </div>

              {/* Card 2: Attendance Rate */}
              <div className="bg-white rounded-xl p-5 border border-[#d8e6ed] shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#e4eff6] text-[#366880] flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#63889b]">Attendance</span>
                </div>
                <div className="text-3xl font-extrabold text-[#203e4f]">{attendanceRate}%</div>
                <div className="mt-1 text-xs font-medium text-[#66889a]">{present}/{attendance.length} sessions present</div>
              </div>

              {/* Card 3: Balance Due (Highlighted if > 0) */}
              <div className={`rounded-xl p-5 border shadow-sm transition ${balance > 0 ? 'bg-[#fdf3f2] border-2 border-[#eab2ab]' : 'bg-white border-[#d8e6ed]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${balance > 0 ? 'bg-[#f9d7d3] text-[#c53929]' : 'bg-[#dcf5eb] text-[#2d7a64]'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#63889b]">Balance Due</span>
                  </div>
                </div>
                <div className={`text-2xl font-extrabold ${balance > 0 ? 'text-[#c53929]' : 'text-[#2d7a64]'}`}>
                  ETB {etb(balance)}
                </div>
                <Link to="/parent/finance" className="mt-2 inline-block text-xs font-bold text-[#3b6b82] hover:underline">
                  View statement →
                </Link>
              </div>

            </div>
          </section>

          {/* Grids for Grades and Attendance */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* Recent Grades Section */}
            <section className="rounded-2xl border border-[#d8e6ed] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#203e4f]">Recent Grades</h2>
                <Link to="/parent/academics" className="text-xs font-bold text-[#3b6b82] hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-[#edf3f6]">
                {grades.slice(0, 5).map((g) => (
                  <div key={g._id} className="flex items-center justify-between py-3">
                    <span className="text-xs font-bold text-[#203e4f]">{g.subject}</span>
                    <span className="text-xs font-extrabold text-[#3b6b82]">{Number(g.percentage).toFixed(0)}%</span>
                  </div>
                ))}
                {grades.length === 0 && <p className="py-8 text-center text-xs text-[#66889a]">No grades published yet.</p>}
              </div>
            </section>

            {/* Recent Attendance Section */}
            <section className="rounded-2xl border border-[#d8e6ed] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#203e4f]">Recent Attendance</h2>
                <Link to="/parent/attendance" className="text-xs font-bold text-[#3b6b82] hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-[#edf3f6]">
                {attendance.slice(0, 6).map((a, i) => {
                  const tone = a.status === 'Present' ? 'text-[#2d7a64] bg-[#dcf5eb]' : a.status === 'Late' ? 'text-amber-700 bg-amber-50' : 'text-[#c53929] bg-[#fdf3f2]';
                  return (
                    <div key={i} className="flex items-center justify-between py-3">
                      <span className="text-xs font-semibold text-[#547587]">{new Date(a.date).toLocaleDateString()}</span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${tone}`}>{a.status}</span>
                    </div>
                  );
                })}
                {attendance.length === 0 && <p className="py-8 text-center text-xs text-[#66889a]">No attendance records yet.</p>}
              </div>
            </section>

          </div>
        </>
      )}
    </ParentLayout>
  );
}
