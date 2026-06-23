import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ParentLayout from '../../components/ParentLayout';
import { useParentChildren } from '../../hooks/useParentChildren';
import axios from '../../api/axios';

const etb = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

export default function ParentDashboard() {
  const { children, childId, setChildId, selectedChild, loading } = useParentChildren();
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
  const balance = fees.filter((f) => !f.paid).reduce((s, f) => s + Number(f.amount || 0), 0);
  const name = selectedChild?.profile?.user?.name || 'your child';

  return (
    <ParentLayout kids={children} childId={childId} onSelectChild={setChildId}>
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Hello, {name.split(' ')[0]}'s guardian</h1>
        <p className="text-sm text-slate-500">A snapshot of {name}'s academic progress and account.</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">Loading…</div>
      ) : !selectedChild ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">No children are linked to this account.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">
                {gradingSettings.gpaEnabled ? 'GPA' : 'Average Grade'}
              </div>
              <div className="mt-1 text-3xl font-black text-slate-900">
                {gradingSettings.gpaEnabled ? gpa : `${avgGrade}%`}
              </div>
              {!gradingSettings.gpaEnabled && (
                <div className={`mt-1 text-xs font-semibold ${passStatus === 'Pass' ? 'text-emerald-600' : 'text-rose-600'}`}>Status: {passStatus}</div>
              )}
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: `${avgGrade}%` }} /></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Attendance</div>
              <div className="mt-1 text-3xl font-black text-slate-900">{attendanceRate}%</div>
              <div className="mt-1 text-xs text-slate-400">{present}/{attendance.length} sessions present</div>
            </div>
            <div className={`rounded-2xl border bg-white p-6 shadow-sm ${balance > 0 ? 'border-rose-200' : 'border-slate-200'}`}>
              <div className="text-xs font-semibold uppercase text-slate-400">Balance Due</div>
              <div className={`mt-1 text-3xl font-black ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>ETB {etb(balance)}</div>
              <Link to="/parent/finance" className="mt-1 inline-block text-xs font-bold text-slate-500 hover:text-slate-900">View statement →</Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Recent Grades</h2>
                <Link to="/parent/academics" className="text-sm font-semibold text-slate-500 hover:text-slate-900">View all</Link>
              </div>
              <div className="divide-y divide-slate-100">
                {grades.slice(0, 5).map((g) => (
                  <div key={g._id} className="flex items-center justify-between py-3">
                    <span className="font-semibold text-slate-900">{g.subject}</span>
                    <span className="font-bold text-slate-700">{Number(g.percentage).toFixed(0)}%</span>
                  </div>
                ))}
                {grades.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No grades published yet.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Recent Attendance</h2>
                <Link to="/parent/attendance" className="text-sm font-semibold text-slate-500 hover:text-slate-900">View all</Link>
              </div>
              <div className="divide-y divide-slate-100">
                {attendance.slice(0, 6).map((a, i) => {
                  const tone = a.status === 'Present' ? 'text-emerald-600' : a.status === 'Late' ? 'text-amber-600' : 'text-rose-600';
                  return (
                    <div key={i} className="flex items-center justify-between py-3">
                      <span className="text-slate-600">{new Date(a.date).toLocaleDateString()}</span>
                      <span className={`text-sm font-bold ${tone}`}>{a.status}</span>
                    </div>
                  );
                })}
                {attendance.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No attendance records yet.</p>}
              </div>
            </section>
          </div>
        </>
      )}
    </ParentLayout>
  );
}
