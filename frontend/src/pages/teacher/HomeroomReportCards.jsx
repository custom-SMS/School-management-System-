import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../../api/axios';
import TeacherLayout from '../../components/TeacherLayout';

export default function HomeroomReportCards() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const classId = params.get('classId');
  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const yrs = await axios.get('/academic-years');
        const ay = (yrs.data || []).find(y => y.isActive) || (yrs.data || [])[0];
        if (!active) return;
        setActiveYear(ay || null);
        if (!classId || !ay) { setReportCards([]); setLoading(false); return; }
        const res = await axios.get(`/report-cards/class/${classId}/${ay.id}`);
        if (active) setReportCards(res.data || []);
      } catch (e) {
        setReportCards([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [classId]);

  if (loading) return <TeacherLayout><div className="py-20 text-center text-slate-400">Loading report cards…</div></TeacherLayout>;

  return (
    <TeacherLayout searchPlaceholder="Search students...">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
          Back
        </button>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Class Report Cards</h1>
        <p className="text-sm text-slate-500">Academic Year: {activeYear?.year || '—'}</p>
      </div>

      {reportCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">No report cards found for this class.</div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3 text-center">Avg Score (out of 100)</th>
                  <th className="px-4 py-3 text-center">Attendance %</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportCards.map(rc => (
                  <tr key={rc.id} className="text-slate-700 hover:bg-slate-50 transition">
                    <td className="px-4 py-4 font-bold text-slate-900">
                      {rc.student?.user?.name ? (
                        <Link to={`/teacher/students/${rc.student._id || rc.student.id}`} className="text-slate-900 hover:underline">
                          {rc.student.user.name}
                        </Link>
                      ) : 'Unknown'}
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-slate-900">{rc.averageScore}</td>
                    <td className="px-4 py-4 text-center font-semibold text-slate-700">{rc.attendancePercentage}%</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${rc.status === 'Pass' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {rc.status}
                      </span>
                    </td>
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
