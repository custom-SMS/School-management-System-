import { useEffect, useState } from 'react';
import axios from '../../api/axios';
import TeacherLayout from '../../components/TeacherLayout';
import { Link } from 'react-router-dom';

export default function Homeroom() {
  const [homerooms, setHomerooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    axios.get('/stats/teacher/me')
      .then((r) => {
        if (!active) return;
        const classes = r.data?.classSummaries || [];
        const hms = classes.filter((c) => c.isHomeroom) || [];
        setHomerooms(hms);
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <TeacherLayout><div className="py-20 text-center text-slate-400">Loading homeroom…</div></TeacherLayout>;

  return (
    <TeacherLayout searchPlaceholder="Search students...">
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Homeroom</h1>
        <p className="text-sm text-slate-500">Overview of classes where you are assigned as the homeroom teacher.</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="font-semibold text-rose-700">Could not load homeroom data.</p>
          <p className="mt-1 text-sm text-rose-500">The server may be unavailable. Please refresh the page or try again later.</p>
        </div>
      ) : homerooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">You are not assigned as a homeroom teacher for any class.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {homerooms.map((hm) => (
            <div key={hm.classId} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{hm.className} {hm.stream ? `(${hm.stream})` : ''}</h3>
                  <p className="text-sm text-slate-500">{hm.subject || '—'}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase text-slate-400">Students</div>
                  <div className="text-lg font-bold text-slate-900">{hm.studentCount || 0}</div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <Link to={`/teacher/attendance?classId=${hm.classId}`} className="inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">Open Attendance</Link>
                <Link to={`/teacher/homeroom/report-cards?classId=${hm.classId}`} className="inline-block rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">View Report Cards</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </TeacherLayout>
  );
}
