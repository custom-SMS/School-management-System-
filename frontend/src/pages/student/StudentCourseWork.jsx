import { useState, useEffect, useRef } from 'react';
import StudentLayout from '../../components/StudentLayout';
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

// ── Submit Modal ──────────────────────────────────────────────────────────────
function SubmitModal({ assignment, existingSubmission, onClose, onSuccess }) {
  const [text, setText] = useState(existingSubmission?.text || '');
  const [fileUrl, setFileUrl] = useState(existingSubmission?.fileUrl || '');
  const [fileName, setFileName] = useState(existingSubmission?.fileName || '');
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => setUploadPct(Math.round((ev.loaded * 100) / (ev.total || 1))),
      });
      setFileUrl(res.data.url || res.data.secure_url);
      setFileName(file.name);
      toast.success('File uploaded successfully!');
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fileUrl && !text.trim()) {
      toast.error('Please attach a document or enter your written answer.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`/coursework/assignments/${assignment.id}/submit`, { fileUrl, fileName, text });
      toast.success(existingSubmission ? 'Submission updated!' : 'Assignment submitted successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const overdue = isOverdue(assignment.dueDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-[#d8e5ec] bg-white p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#d8e5ec] pb-4 mb-4">
          <div>
            <h3 className="text-xl font-black text-[#203e4f]">
              {existingSubmission ? 'Update Homework Submission' : 'Submit Assignment'}
            </h3>
            <p className="text-xs text-[#6a8b9c] mt-0.5">{assignment.title}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 text-lg font-bold"
          >
            ×
          </button>
        </div>

        {overdue && !existingSubmission && (
          <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800">
            ⚠️ This assignment is past its due date ({fmtDate(assignment.dueDate)}). Your submission will be marked as Late.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
              Written Answer / Notes (optional)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Type your answer, response, or notes for the teacher here..."
              className="w-full rounded-xl border border-[#d8e5ec] bg-slate-50 px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:bg-white focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
              Upload Solution File (PDF, Word, Image, Zip)
            </label>
            {fileUrl ? (
              <div className="flex items-center justify-between gap-3 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-800 text-sm font-bold truncate">
                  ✅ {fileName || 'Attached Solution'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFileUrl('');
                    setFileName('');
                  }}
                  className="text-rose-600 hover:text-rose-800 text-xs font-bold shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full border-2 border-dashed border-[#d8e5ec] hover:border-[#3b6b82] bg-slate-50 hover:bg-[#eef5f8] rounded-xl py-4 text-sm font-semibold text-[#6a8b9c] hover:text-[#203e4f] transition flex flex-col items-center justify-center gap-1"
                >
                  {uploading ? (
                    <span className="text-[#203e4f]">Uploading file... {uploadPct}%</span>
                  ) : (
                    <>
                      <span>📎 Click to attach your homework file</span>
                      <span className="text-[11px] text-[#8aa6b5]">PDF, DOCX, PPTX, JPG, PNG, ZIP</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={handleFile}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.xlsx,.xls,.zip"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-3 border-t border-[#d8e5ec]">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="flex-1 rounded-xl bg-[#203e4f] py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#172d3a] disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : existingSubmission ? 'Update Submission' : 'Submit Homework'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#d8e5ec] bg-white py-3 text-sm font-bold text-[#203e4f] transition hover:bg-[#f0f5f8]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Student Coursework Page ──────────────────────────────────────────────
export default function StudentCourseWork() {
  const [tab, setTab] = useState('assignments');
  const [assignments, setAssignments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [aRes, mRes] = await Promise.all([
        axios.get('/coursework/student/assignments'),
        axios.get('/coursework/student/materials'),
      ]);
      setAssignments(aRes.data || []);
      setMaterials(mRes.data || []);
    } catch {
      toast.error('Failed to load your coursework.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleDownload = async (material) => {
    try {
      await axios.post(`/coursework/materials/${material.id}/download`);
    } catch {
      /* non-critical */
    }
    window.open(material.fileUrl, '_blank');
  };

  const { t } = useLanguage();
  const pendingCount = assignments.filter((a) => !a.submissions?.length).length;
  const submittedCount = assignments.filter((a) => a.submissions?.length > 0).length;
  const gradedCount = assignments.filter((a) => a.submissions?.[0]?.status === 'Graded').length;

  return (
    <StudentLayout searchPlaceholder={t('searchPlaceholder')}>
      {submitting && (
        <SubmitModal
          assignment={submitting}
          existingSubmission={submitting.submissions?.[0]}
          onClose={() => setSubmitting(null)}
          onSuccess={fetchAll}
        />
      )}

      {/* Header Banner */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#203e4f]">
          {t('studentCourseworkTitle')}
        </h1>
        <p className="text-xs sm:text-sm font-medium text-[#6a8b9c] mt-0.5">
          {t('studentCourseworkSub')}
        </p>
      </div>

      {/* KPI Cards */}
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

      {/* Tabs Bar */}
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
        <div className="text-center py-20 text-sm text-[#6a8b9c]">Loading your coursework records...</div>
      ) : (
        <>
          {/* ── Assignments Tab ── */}
          {tab === 'assignments' && (
            assignments.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#d8e5ec] bg-white py-16 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-bold text-[#203e4f]">No assignments posted yet</p>
                <p className="text-xs text-[#6a8b9c] mt-1">
                  Your teachers have not published any homework or project assignments for your class.
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
                            {sub && (
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STATUS_COLORS[sub.status]}`}
                              >
                                {sub.status}
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
                              📎 {a.attachmentName || 'Download Instruction Sheet'}
                            </a>
                          )}

                          {/* Graded Feedback Box */}
                          {sub?.status === 'Graded' && (
                            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
                              <p className="font-black text-emerald-900 text-sm">
                                Score: {sub.score} / {a.points}
                              </p>
                              {sub.feedback && (
                                <p className="text-slate-600 mt-1 italic">"{sub.feedback}"</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Submit Button */}
                        <div className="shrink-0 pt-2 sm:pt-0">
                          {sub ? (
                            <button
                              onClick={() => setSubmitting(a)}
                              className="rounded-xl border border-[#d8e5ec] bg-white px-4 py-2 text-xs font-bold text-[#203e4f] hover:bg-[#f0f5f8] transition shadow-xs"
                            >
                              ✏️ Update Work
                            </button>
                          ) : (
                            <button
                              onClick={() => setSubmitting(a)}
                              className="rounded-xl bg-[#203e4f] px-4 py-2 text-xs font-bold text-white hover:bg-[#172d3a] transition shadow-xs"
                            >
                              🚀 Submit Work
                            </button>
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
                <p className="text-xs text-[#6a8b9c] mt-1">
                  Study notes and references uploaded by your teachers will appear here.
                </p>
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
    </StudentLayout>
  );
}
