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
  const [activeYear, setActiveYear] = useState(null);
  
  // Promotion Management State
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [reportCards, setReportCards] = useState([]);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  const [savingStatus, setSavingStatus] = useState({});

  useEffect(() => {
    // Get active academic year
    axios.get('/academic-years')
      .then((res) => {
        const active = (res.data || []).find(y => y.isActive) || (res.data || [])[0];
        setActiveYear(active);
      })
      .catch(console.error);

    axios
      .get('/stats/teacher/me')
      .then((r) => setClasses(r.data?.classSummaries || []))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  const handleOpenPromotions = async (c) => {
    setSelectedClass(c);
    setPromotionModalOpen(true);
    setLoadingPromotions(true);
    setReportCards([]);
    if (!activeYear) {
      setLoadingPromotions(false);
      return;
    }
    try {
      const res = await axios.get(`/report-cards/class/${c.classId}/${activeYear.id}`);
      setReportCards(res.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load report cards. Make sure they have been compiled for this class.');
    } finally {
      setLoadingPromotions(false);
    }
  };

  const handleStatusChange = async (reportCardId, newStatus) => {
    setSavingStatus(prev => ({ ...prev, [reportCardId]: true }));
    try {
      await axios.patch(`/report-cards/${reportCardId}/promote`, { promotionStatus: newStatus });
      setReportCards(prev => prev.map(rc => rc.id === reportCardId ? { ...rc, promotionStatus: newStatus } : rc));
    } catch (err) {
      console.error(err);
      alert('Failed to update promotion status.');
    } finally {
      setSavingStatus(prev => ({ ...prev, [reportCardId]: false }));
    }
  };

  return (
    <TeacherLayout searchPlaceholder="Search classes...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Assigned Classes</h1>
          <p className="text-sm text-slate-500">Your current academic workload this semester.</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">Loading classes…</div>
      ) : classes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">No classes assigned yet.</div>
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

      {/* Promotions Modal */}
      {promotionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Manage Promotions: {selectedClass?.className}</h3>
                <p className="text-sm text-slate-500">Year-End Promotion Decision</p>
              </div>
              <button onClick={() => setPromotionModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 bg-slate-50/50 flex-1">
              {loadingPromotions ? (
                <div className="py-12 text-center text-slate-500 font-medium animate-pulse">Loading student report cards...</div>
              ) : reportCards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-slate-500">
                  <p className="font-semibold text-slate-700">No report cards compiled yet.</p>
                  <p className="text-sm mt-1">An administrator must compile the report cards for this academic year first.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-4">Student</th>
                        <th className="px-5 py-4 text-center">Avg Score</th>
                        <th className="px-5 py-4 text-center">Calculated Status</th>
                        <th className="px-5 py-4 w-64">Final Promotion Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportCards.map(rc => (
                        <tr key={rc.id} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-4 font-bold text-slate-900">{rc.student?.user?.name || 'Unknown'}</td>
                          <td className="px-5 py-4 text-center font-bold text-slate-700">{rc.averageScore}%</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${rc.status === 'Pass' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {rc.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <select 
                                disabled={savingStatus[rc.id]}
                                value={rc.promotionStatus}
                                onChange={(e) => handleStatusChange(rc.id, e.target.value)}
                                className={`w-full rounded-xl border ${rc.promotionStatus === 'Promoted' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : rc.promotionStatus === 'Not Promoted' ? 'border-rose-200 bg-rose-50 text-rose-800' : rc.promotionStatus === 'Conditional Promotion' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-900'} px-3 py-2 text-sm font-semibold outline-none focus:border-slate-400`}
                              >
                                <option value="Pending">Pending Review</option>
                                <option value="Promoted">Promoted</option>
                                <option value="Conditional Promotion">Conditional Promotion</option>
                                <option value="Not Promoted">Not Promoted</option>
                              </select>
                              {savingStatus[rc.id] && <span className="text-xs text-slate-400 font-medium">Saving...</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
