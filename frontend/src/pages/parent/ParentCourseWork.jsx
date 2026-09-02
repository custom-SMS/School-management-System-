import { useState, useEffect } from 'react';
import ParentLayout from '../../components/ParentLayout';
import { useParentChildren } from '../../hooks/useParentChildren';
import { useLanguage } from '../../context/LanguageContext';
import axios from '../../api/axios';
import { toast } from 'react-toastify';

const STATUS_COLORS = {
  Submitted: 'bg-[#E4EFF6] text-[#1c4d66] border border-[#d8e5ec]',
  Late: 'bg-rose-50 text-rose-700 border border-rose-200',
  Graded: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const MATERIAL_TYPE_LABELS = {
  LectureNote: '📄 Lecture Note',
  Worksheet: '📝 Worksheet',
  Syllabus: '📋 Syllabus',
  ReferenceBook: '📚 Reference Book',
  PastExam: '📊 Past Exam',
  Other: '📁 Study Resource',
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date();

export default function ParentCourseWork() {
  const { children, childId, setChildId, selectedChild, loading: loadingChildren } = useParentChildren();
  const { t } = useLanguage();
  const [tab, setTab] = useState('assignments');
  const [assignments, setAssignments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  const studentId = selectedChild?.profile?.id || selectedChild?.profile?._id || childId;
  const childName = selectedChild?.profile?.user?.name || t('child');

  const fetchCoursework = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const [aRes, mRes] = await Promise.all([
        axios.get(`/coursework/student/assignments?studentId=${studentId}`),
        axios.get(`/coursework/student/materials?studentId=${studentId}`),
      ]);
      setAssignments(aRes.data || []);
      setMaterials(mRes.data || []);
    } catch {
      toast.error('Failed to load coursework records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchCoursework();
    }
  }, [studentId]);

  const handleDownload = async (material) => {
    try {
      await axios.post(`/coursework/materials/${material.id}/download`);
    } catch {
      /* silent */
    }
    window.open(material.fileUrl, '_blank');
  };

  const pendingCount = assignments.filter((a) => !a.submissions?.length).length;
  const submittedCount = assignments.filter((a) => a.submissions?.length > 0).length;
  const gradedCount = assignments.filter((a) => a.submissions?.[0]?.status === 'Graded').length;

  return (
    <ParentLayout kids={children} childId={childId} onSelectChild={setChildId}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#203e4f]">
          {t('parentCourseworkTitle')}
        </h1>
        <p className="text-xs sm:text-sm font-medium text-[#6a8b9c] mt-0.5">
          {t('parentCourseworkSub', { name: childName })}
        </p>
      </div>

      {loadingChildren ? (
        <div className="text-center py-20 text-sm text-[#6a8b9c]">{t('loadingChild')}</div>
      ) : !selectedChild ? (
        <div className="rounded-2xl border border-dashed border-[#d8e5ec] bg-white p-12 text-center text-[#6a8b9c]">
          {t('noChildrenLinked')}
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: t('pendingPayment'), value: pendingCount, color: 'text-amber-700' },
              { label: t('submissions'), value: submittedCount, color: 'text-[#1c4d66]' },
              { label: t('graded'), value: gradedCount, color: 'text-emerald-700' },
              { label: t('studyMaterials'), value: materials.length, color: 'text-[#3b6b82]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl border border-[#d8e5ec] bg-white p-4 sm:p-5 shadow-xs">
                <p className={`text-2xl sm:text-3xl font-black ${color}`}>{value}</p>
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#6a8b9c] mt-1">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-[#e2ebf0] rounded-xl mb-6 w-full sm:w-80">
            <button
              onClick={() => setTab('assignments')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition ${
                tab === 'assignments' ? 'bg-white text-[#203e4f] shadow-xs' : 'text-[#6a8b9c] hover:text-[#203e4f]'
              }`}
            >
              📋 {t('assignments')} ({assignments.length})
            </button>
            <button
              onClick={() => setTab('materials')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition ${
                tab === 'materials' ? 'bg-white text-[#203e4f] shadow-xs' : 'text-[#6a8b9c] hover:text-[#203e4f]'
              }`}
            >
              📚 {t('studyMaterials')} ({materials.length})
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20 text-sm text-[#6a8b9c]">Loading coursework data...</div>
          ) : (
            <>
              {/* ── Homework Tab ── */}
              {tab === 'assignments' && (
                assignments.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-[#d8e5ec] bg-white py-16 text-center">
                    <p className="text-4xl mb-3">📋</p>
                    <p className="font-bold text-[#203e4f]">No assignments posted for {childName}</p>
                    <p className="text-xs text-[#6a8b9c] mt-1">
                      New homework given by teachers will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((a) => {
                      const sub = a.submissions?.[0];
                      const overdue = isOverdue(a.dueDate) && !sub;

                      return (
                        <div
                          key={a.id}
                          className={`rounded-2xl border bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition ${
                            overdue ? 'border-rose-300' : 'border-[#d8e5ec]'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {overdue && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    Overdue
                                  </span>
                                )}
                                {sub ? (
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STATUS_COLORS[sub.status]}`}
                                  >
                                    {sub.status === 'Graded' ? '✅ Graded' : '📥 Submitted'}
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Pending Submission
                                  </span>
                                )}
                                <h3 className="font-black text-[#203e4f] text-base">{a.title}</h3>
                              </div>

                              <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-[#6a8b9c]">
                                <span className="font-semibold text-[#203e4f]">👩‍🏫 {a.teacher?.user?.name || 'Teacher'}</span>
                                <span>📚 {a.subject}</span>
                                {a.dueDate && (
                                  <span className={overdue ? 'text-rose-600 font-bold' : ''}>
                                    📅 Due {fmtDate(a.dueDate)}
                                  </span>
                                )}
                                <span>⭐ {a.points} pts</span>
                              </div>

                              {a.description && (
                                <p className="mt-2 text-xs sm:text-sm text-[#4d6b7c] line-clamp-2">
                                  {a.description}
                                </p>
                              )}

                              {a.attachmentUrl && (
                                <a
                                  href={a.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#3b6b82] hover:underline"
                                >
                                  📎 Download Teacher Worksheet
                                </a>
                              )}

                              {/* Grade Card */}
                              {sub?.status === 'Graded' && (
                                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
                                  <p className="font-black text-emerald-900 text-sm">
                                    Grade: {sub.score} / {a.points} ({Math.round((sub.score / a.points) * 100)}%)
                                  </p>
                                  {sub.feedback && (
                                    <p className="text-slate-600 mt-1 italic">Teacher Feedback: "{sub.feedback}"</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* ── Materials Tab ── */}
              {tab === 'materials' && (
                materials.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-[#d8e5ec] bg-white py-16 text-center">
                    <p className="text-4xl mb-3">📚</p>
                    <p className="font-bold text-[#203e4f]">No study materials available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {materials.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-2xl border border-[#d8e5ec] bg-white p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                      >
                        <div>
                          <span className="text-[10px] font-bold text-[#1c4d66] bg-[#E4EFF6] border border-[#d8e5ec] px-2 py-0.5 rounded-full">
                            {MATERIAL_TYPE_LABELS[m.type] || m.type}
                          </span>

                          <h3 className="font-black text-[#203e4f] text-sm sm:text-base mt-2 line-clamp-2">
                            {m.title}
                          </h3>

                          <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-[#6a8b9c]">
                            <span className="font-semibold text-[#203e4f]">👩‍🏫 {m.teacher?.user?.name || 'Teacher'}</span>
                            <span>📚 {m.subject}</span>
                          </div>

                          {m.description && (
                            <p className="mt-2 text-xs text-[#4d6b7c] line-clamp-2">{m.description}</p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => handleDownload(m)}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#203e4f] px-3 py-2 text-xs font-bold text-white hover:bg-[#172d3a] transition shadow-xs"
                          >
                            ⬇ Download {m.fileName}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </>
      )}
    </ParentLayout>
  );
}
