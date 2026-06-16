import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import TeacherLayout from '../../components/TeacherLayout';

function tagFor(subject) {
  const s = String(subject || '').toLowerCase();
  if (/(math|physics|chem|bio|stat|ict|program)/.test(s)) return { label: 'STEM', tone: 'bg-slate-200 text-slate-700' };
  if (/(elective|art|music|sport)/.test(s)) return { label: 'ELECTIVE', tone: 'bg-slate-100 text-slate-500' };
  return { label: 'CORE', tone: 'bg-slate-100 text-slate-600' };
}

export default function AssignedClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');

  useEffect(() => {
    axios
      .get('/stats/teacher/me')
      .then((r) => setClasses(r.data?.classSummaries || []))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <TeacherLayout searchPlaceholder="Search classes...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Assigned Classes</h1>
          <p className="text-sm text-slate-500">Your current academic workload this semester.</p>
        </div>
        <div className="flex rounded-xl border border-slate-200 p-1 text-sm font-semibold">
          {[['grid', 'Grid View'], ['table', 'Table View']].map(([k, label]) => (
            <button key={k} onClick={() => setView(k)} className={`rounded-lg px-4 py-1.5 transition ${view === k ? 'bg-slate-100 text-slate-900' : 'text-slate-500'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">Loading classes…</div>
      ) : classes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">No classes assigned yet.</div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((c) => {
            const tag = tagFor(c.subject);
            const coverage = Math.min(100, c.averageGrade || 0);
            return (
              <div key={c.classId} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{c.subject || 'Subject'}</h3>
                    <p className="text-sm font-semibold text-slate-400">{c.className}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${tag.tone}`}>{tag.label}</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-400">Students</div>
                    <div className="text-lg font-bold text-slate-900">{c.studentCount}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-400">Sessions</div>
                    <div className="text-lg font-bold text-slate-900">{c.attendanceSessions}</div>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
                    <span>Class Average</span>
                    <span className="text-slate-900">{coverage}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-900" style={{ width: `${coverage}%` }} />
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  <Link to="/teacher/grades" className="block rounded-xl bg-slate-900 py-2.5 text-center text-sm font-bold text-white transition hover:bg-slate-800">View Class</Link>
                  <Link to="/teacher/attendance" className="block rounded-xl border border-slate-200 py-2.5 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50">Take Attendance</Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <th className="rounded-l-lg px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Class</th>
                  <th className="px-4 py-3 text-right font-semibold">Students</th>
                  <th className="px-4 py-3 text-right font-semibold">Sessions</th>
                  <th className="px-4 py-3 text-right font-semibold">Avg %</th>
                  <th className="rounded-r-lg px-4 py-3 text-right font-semibold">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((c) => (
                  <tr key={c.classId} className="text-slate-700">
                    <td className="px-4 py-4 font-bold text-slate-900">{c.subject}</td>
                    <td className="px-4 py-4">{c.className}</td>
                    <td className="px-4 py-4 text-right">{c.studentCount}</td>
                    <td className="px-4 py-4 text-right">{c.attendanceSessions}</td>
                    <td className="px-4 py-4 text-right font-semibold">{c.averageGrade}%</td>
                    <td className="px-4 py-4 text-right font-semibold">{c.attendanceRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
