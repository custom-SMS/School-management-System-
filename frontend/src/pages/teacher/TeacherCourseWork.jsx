import { useState, useEffect, useRef } from 'react';
import TeacherLayout from '../../components/TeacherLayout';
import axios from '../../api/axios';
import { toast } from 'react-toastify';

const STATUS_COLORS = {
  Draft: 'bg-amber-50 text-amber-700 border border-amber-200',
  Published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Closed: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const MATERIAL_TYPES = ['LectureNote', 'Worksheet', 'Syllabus', 'ReferenceBook', 'PastExam', 'Other'];
const MATERIAL_TYPE_LABELS = {
  LectureNote: '📄 Lecture Note',
  Worksheet: '📝 Worksheet',
  Syllabus: '📋 Syllabus',
  ReferenceBook: '📚 Reference Book',
  PastExam: '📊 Past Exam',
  Other: '📁 Other Resource',
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// ── Upload helper via existing /api/uploads ──────────────────────────────────
async function uploadFile(file, onProgress) {
  const form = new FormData();
  form.append('file', file);
  const res = await axios.post('/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / (e.total || 1))),
  });
  return res.data;
}

// ── Assignment Modal ──────────────────────────────────────────────────────────
function AssignmentModal({ initial, assignedData, onClose, onSave }) {
  const isEdit = !!initial?.id;
  const classes = assignedData?.classes || [];
  const grades = assignedData?.grades || [];
  const defaultGrade = initial?.grade || (classes[0]?.grade) || (grades[0]) || 'Grade 9';
  const defaultSubject = initial?.subject || (assignedData?.subjects?.[0]) || '';

  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    subject: initial?.subject || defaultSubject,
    grade: initial?.grade || defaultGrade,
    classId: initial?.classId || '',
    dueDate: initial?.dueDate ? initial.dueDate.slice(0, 10) : '',
    points: initial?.points ?? 100,
    status: initial?.status || 'Draft',
    attachmentUrl: initial?.attachmentUrl || '',
    attachmentName: initial?.attachmentName || '',
  });

  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // When class changes, auto-populate Grade & Subject
  const handleClassChange = (selectedClassId) => {
    set('classId', selectedClassId);
    if (selectedClassId) {
      const cls = classes.find((c) => c.id === selectedClassId);
      if (cls) {
        if (cls.grade) set('grade', cls.grade);
        if (cls.subjects?.length && !cls.subjects.includes(form.subject)) {
          set('subject', cls.subjects[0]);
        }
      }
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file, setUploadPct);
      set('attachmentUrl', result.url || result.secure_url);
      set('attachmentName', file.name);
      toast.success('Attachment uploaded successfully!');
    } catch {
      toast.error('File upload failed.');
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.subject.trim() || !form.grade.trim()) {
      toast.error('Title, subject, and grade are required.');
      return;
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#d8e5ec] bg-white p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#d8e5ec] pb-4 mb-5">
          <div>
            <h3 className="text-xl font-black text-[#203e4f]">
              {isEdit ? 'Edit Assignment' : 'Create New Assignment'}
            </h3>
            <p className="text-xs text-[#6a8b9c] mt-0.5">
              Publish homework, quizzes, and projects with automated student & parent alerts.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition text-lg font-bold"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Assignment Title */}
          <div>
            <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
              Assignment Title *
            </label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Chapter 4 Motion Problems Worksheet"
              required
              className="w-full rounded-xl border border-[#d8e5ec] bg-slate-50 px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:bg-white focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20"
            />
          </div>

          {/* Assigned Class & Grade Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
                Target Class (Assigned to you)
              </label>
              <select
                value={form.classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full rounded-xl border border-[#d8e5ec] bg-white px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20"
              >
                <option value="">All students in Grade</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.stream ? `(${c.stream})` : ''} - {c.grade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
                Grade Level *
              </label>
              <select
                value={form.grade}
                onChange={(e) => set('grade', e.target.value)}
                required
                className="w-full rounded-xl border border-[#d8e5ec] bg-white px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20"
              >
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject & Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
                Subject *
              </label>
              {assignedData?.subjects?.length > 0 ? (
                <select
                  value={form.subject}
                  onChange={(e) => set('subject', e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#d8e5ec] bg-white px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20"
                >
                  {assignedData.subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.subject}
                  onChange={(e) => set('subject', e.target.value)}
                  placeholder="e.g. Mathematics"
                  required
                  className="w-full rounded-xl border border-[#d8e5ec] bg-slate-50 px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:bg-white focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
                Max Points
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={form.points}
                onChange={(e) => set('points', e.target.value)}
                className="w-full rounded-xl border border-[#d8e5ec] bg-slate-50 px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:bg-white focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20"
              />
            </div>
          </div>

          {/* Due Date & Publishing Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
                className="w-full rounded-xl border border-[#d8e5ec] bg-slate-50 px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:bg-white focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
                Publishing Status
              </label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full rounded-xl border border-[#d8e5ec] bg-white px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20"
              >
                <option value="Draft">Draft (Only visible to you)</option>
                <option value="Published">Published (Notifies Students & Parents)</option>
                <option value="Closed">Closed (Submissions closed)</option>
              </select>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
              Instructions & Details
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Provide assignment guidelines, questions, or formatting instructions..."
              className="w-full rounded-xl border border-[#d8e5ec] bg-slate-50 px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:bg-white focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20 resize-none"
            />
          </div>

          {/* File Attachment */}
          <div>
            <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
              Attachment (PDF, Word, Slides, Image)
            </label>
            {form.attachmentUrl ? (
              <div className="flex items-center justify-between gap-3 p-3.5 bg-[#eaf2f6] rounded-xl border border-[#b8d4e2]">
                <span className="text-[#1c4d66] text-sm font-bold truncate">
                  📎 {form.attachmentName || 'Attached Document'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    set('attachmentUrl', '');
                    set('attachmentName', '');
                  }}
                  className="text-rose-600 hover:text-rose-800 text-xs font-bold"
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
                    <span className="text-[#203e4f]">Uploading attachment... {uploadPct}%</span>
                  ) : (
                    <>
                      <span>📎 Click to attach worksheet, rubric, or document</span>
                      <span className="text-[11px] text-[#8aa6b5]">PDF, DOCX, PPTX, PNG, JPG, XLSX</span>
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

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-[#d8e5ec]">
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 rounded-xl bg-[#203e4f] py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#172d3a] disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Assignment' : 'Save & Publish Assignment'}
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

// ── Study Material Modal ──────────────────────────────────────────────────────
function MaterialModal({ assignedData, onClose, onSave }) {
  const classes = assignedData?.classes || [];
  const grades = assignedData?.grades || [];
  const defaultGrade = (classes[0]?.grade) || (grades[0]) || 'Grade 9';
  const defaultSubject = (assignedData?.subjects?.[0]) || '';

  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: defaultSubject,
    grade: defaultGrade,
    classId: '',
    type: 'LectureNote',
    fileUrl: '',
    fileName: '',
    fileSize: 0,
  });

  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleClassChange = (selectedClassId) => {
    set('classId', selectedClassId);
    if (selectedClassId) {
      const cls = classes.find((c) => c.id === selectedClassId);
      if (cls) {
        if (cls.grade) set('grade', cls.grade);
        if (cls.subjects?.length && !cls.subjects.includes(form.subject)) {
          set('subject', cls.subjects[0]);
        }
      }
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file, setUploadPct);
      set('fileUrl', result.url || result.secure_url);
      set('fileName', file.name);
      set('fileSize', file.size || 0);
      toast.success('Study material file uploaded!');
    } catch {
      toast.error('File upload failed.');
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fileUrl) {
      toast.error('Please upload a document before saving.');
      return;
    }
    if (!form.title.trim() || !form.subject.trim() || !form.grade.trim()) {
      toast.error('Title, subject and grade are required.');
      return;
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#d8e5ec] bg-white p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#d8e5ec] pb-4 mb-5">
          <div>
            <h3 className="text-xl font-black text-[#203e4f]">Upload Study Material</h3>
            <p className="text-xs text-[#6a8b9c] mt-0.5">
              Share lecture notes, worksheets, and textbooks with your classes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition text-lg font-bold"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
              Material Title *
            </label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Unit 3 Thermodynamics Lecture Handout"
              required
              className="w-full rounded-xl border border-[#d8e5ec] bg-slate-50 px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:bg-white focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
                Target Class (Assigned to you)
              </label>
              <select
                value={form.classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full rounded-xl border border-[#d8e5ec] bg-white px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20"
              >
                <option value="">All students in Grade</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.stream ? `(${c.stream})` : ''} - {c.grade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
                Grade Level *
              </label>
              <select
                value={form.grade}
                onChange={(e) => set('grade', e.target.value)}
                required
                className="w-full rounded-xl border border-[#d8e5ec] bg-white px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20"
              >
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
                Subject *
              </label>
              {assignedData?.subjects?.length > 0 ? (
                <select
                  value={form.subject}
                  onChange={(e) => set('subject', e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#d8e5ec] bg-white px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20"
                >
                  {assignedData.subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.subject}
                  onChange={(e) => set('subject', e.target.value)}
                  placeholder="e.g. Physics"
                  required
                  className="w-full rounded-xl border border-[#d8e5ec] bg-slate-50 px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:bg-white focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
                Resource Category
              </label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                className="w-full rounded-xl border border-[#d8e5ec] bg-white px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20"
              >
                {MATERIAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {MATERIAL_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="Brief summary or chapters covered in this material..."
              className="w-full rounded-xl border border-[#d8e5ec] bg-slate-50 px-4 py-2.5 text-sm text-[#203e4f] outline-none transition focus:bg-white focus:border-[#3b6b82] focus:ring-2 focus:ring-[#3b6b82]/20 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#203e4f] uppercase tracking-wider mb-1.5">
              Document File *
            </label>
            {form.fileUrl ? (
              <div className="flex items-center justify-between gap-3 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-800 text-sm font-bold truncate">
                  ✅ {form.fileName || 'Uploaded File'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    set('fileUrl', '');
                    set('fileName', '');
                  }}
                  className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                >
                  Replace
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full border-2 border-dashed border-[#d8e5ec] hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 rounded-xl py-5 text-sm font-semibold text-[#6a8b9c] hover:text-emerald-800 transition flex flex-col items-center justify-center gap-1"
                >
                  {uploading ? (
                    <span className="text-emerald-700">Uploading document... {uploadPct}%</span>
                  ) : (
                    <>
                      <span>📂 Click to upload PDF, Word document, or Presentation</span>
                      <span className="text-[11px] text-[#8aa6b5]">Max size: 50MB</span>
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
              disabled={saving || uploading}
              className="flex-1 rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? 'Publishing...' : 'Upload & Notify Students'}
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

// ── Submissions Drawer ────────────────────────────────────────────────────────
function SubmissionsDrawer({ assignment, onClose }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(null);

  useEffect(() => {
    axios
      .get(`/coursework/assignments/${assignment.id}/submissions`)
      .then((r) => setSubmissions(r.data || []))
      .catch(() => toast.error('Failed to load submissions.'))
      .finally(() => setLoading(false));
  }, [assignment.id]);

  const handleGrade = async () => {
    if (!grading) return;
    try {
      await axios.post(`/coursework/submissions/${grading.id}/grade`, {
        score: grading.score,
        feedback: grading.feedback,
      });
      toast.success('Grade recorded and student notified!');
      setSubmissions((subs) =>
        subs.map((s) =>
          s.id === grading.id
            ? { ...s, status: 'Graded', score: Number(grading.score), feedback: grading.feedback }
            : s
        )
      );
      setGrading(null);
    } catch {
      toast.error('Failed to save grade.');
    }
  };

  const statusBadge = (s) => {
    if (s === 'Graded') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (s === 'Late') return 'bg-rose-50 text-rose-700 border border-rose-200';
    return 'bg-[#E4EFF6] text-[#1c4d66] border border-[#d8e5ec]';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs" onClick={onClose}>
      <div
        className="relative w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col border-l border-[#d8e5ec]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-[#d8e5ec] px-5 py-4 z-10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3b6b82]">
              Student Submissions
            </span>
            <h3 className="font-black text-[#203e4f] text-lg">{assignment.title}</h3>
            <p className="text-xs text-[#6a8b9c] mt-0.5">
              {assignment.points} Total Points · {submissions.length} submission(s)
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 text-lg font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex-1 p-5 space-y-4 bg-[#f8fafc]">
          {loading ? (
            <div className="text-center py-16 text-sm text-[#6a8b9c]">Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d8e5ec] bg-white p-12 text-center">
              <p className="text-3xl mb-2">📥</p>
              <p className="font-bold text-[#203e4f]">No submissions yet</p>
              <p className="text-xs text-[#6a8b9c] mt-1">
                Students will appear here as they submit their solutions.
              </p>
            </div>
          ) : (
            submissions.map((sub) => (
              <div key={sub.id} className="rounded-2xl border border-[#d8e5ec] bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[#203e4f] text-sm">{sub.student?.user?.name || 'Student'}</p>
                    <p className="text-xs text-[#6a8b9c] mt-0.5">
                      Submitted on {fmtDate(sub.submittedAt)}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge(sub.status)}`}>
                    {sub.status}
                  </span>
                </div>

                {sub.text && (
                  <div className="mt-3 rounded-xl bg-[#f0f5f8] p-3 text-xs text-[#203e4f] border border-[#d8e5ec]">
                    <p className="font-bold text-[#3b6b82] text-[10px] uppercase mb-1">Student Answer</p>
                    {sub.text}
                  </div>
                )}

                {sub.fileUrl && (
                  <a
                    href={sub.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#3b6b82] hover:text-[#203e4f] bg-[#eaf2f6] px-3 py-1.5 rounded-lg transition"
                  >
                    📎 {sub.fileName || 'View Submitted Document'}
                  </a>
                )}

                {sub.status === 'Graded' && (
                  <div className="mt-3 flex items-center justify-between bg-emerald-50/70 border border-emerald-200 rounded-xl px-3 py-2 text-xs">
                    <span className="font-black text-emerald-800">
                      Score: {sub.score} / {assignment.points}
                    </span>
                    {sub.feedback && <span className="text-slate-600 truncate max-w-xs italic">"{sub.feedback}"</span>}
                  </div>
                )}

                {grading?.id === sub.id ? (
                  <div className="mt-4 rounded-xl border border-[#3b6b82]/30 bg-[#eaf2f6]/50 p-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Score"
                        min="0"
                        max={assignment.points}
                        value={grading.score}
                        onChange={(e) => setGrading((g) => ({ ...g, score: e.target.value }))}
                        className="w-24 rounded-lg border border-[#d8e5ec] bg-white px-3 py-1.5 text-sm font-bold text-[#203e4f] outline-none focus:ring-2 focus:ring-[#3b6b82]"
                      />
                      <span className="text-xs font-bold text-[#6a8b9c]">/ {assignment.points} max</span>
                    </div>
                    <input
                      placeholder="Feedback for student & parent (optional)..."
                      value={grading.feedback}
                      onChange={(e) => setGrading((g) => ({ ...g, feedback: e.target.value }))}
                      className="w-full rounded-lg border border-[#d8e5ec] bg-white px-3 py-1.5 text-xs text-[#203e4f] outline-none focus:ring-2 focus:ring-[#3b6b82]"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleGrade}
                        className="rounded-lg bg-[#203e4f] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#172d3a] transition"
                      >
                        Save & Notify
                      </button>
                      <button
                        onClick={() => setGrading(null)}
                        className="rounded-lg border border-[#d8e5ec] bg-white px-3 py-1.5 text-xs font-bold text-[#203e4f] hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() =>
                        setGrading({ id: sub.id, score: sub.score ?? '', feedback: sub.feedback ?? '' })
                      }
                      className="text-xs font-bold text-[#3b6b82] hover:text-[#203e4f] hover:underline"
                    >
                      {sub.status === 'Graded' ? '✏️ Edit Grade' : '⭐ Grade Submission'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeacherCourseWork() {
  const [tab, setTab] = useState('assignments');
  const [assignments, setAssignments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [assignedData, setAssignedData] = useState({ classes: [], grades: [], subjects: [] });
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [viewingSubmissions, setViewingSubmissions] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        ...(filterGrade && { grade: filterGrade }),
        ...(filterStatus && { status: filterStatus }),
      }).toString();

      const [classRes, aRes, mRes] = await Promise.all([
        axios.get('/coursework/teacher/classes').catch(() => ({ data: { classes: [], grades: [], subjects: [] } })),
        axios.get(`/coursework/teacher/assignments?${q}`),
        axios.get(`/coursework/teacher/materials?${q}`),
      ]);

      setAssignedData(classRes.data || { classes: [], grades: [], subjects: [] });
      setAssignments(aRes.data || []);
      setMaterials(mRes.data || []);
    } catch {
      toast.error('Failed to load coursework data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [filterGrade, filterStatus]);

  const handleSaveAssignment = async (data) => {
    try {
      if (editingAssignment?.id) {
        await axios.put(`/coursework/assignments/${editingAssignment.id}`, data);
        toast.success('Assignment updated successfully!');
      } else {
        await axios.post('/coursework/assignments', data);
        toast.success(
          data.status === 'Published'
            ? 'Assignment published! Students & Parents notified.'
            : 'Assignment saved as Draft.'
        );
      }
      setShowAssignmentModal(false);
      setEditingAssignment(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save assignment.');
    }
  };

  const handleSaveMaterial = async (data) => {
    try {
      await axios.post('/coursework/materials', data);
      toast.success('Study material published! Students & Parents notified.');
      setShowMaterialModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload study material.');
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm('Delete this assignment? All student submissions will also be deleted.')) return;
    setDeleting(id);
    try {
      await axios.delete(`/coursework/assignments/${id}`);
      toast.success('Assignment deleted.');
      fetchAll();
    } catch {
      toast.error('Delete failed.');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('Delete this study material?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/coursework/materials/${id}`);
      toast.success('Material removed.');
      fetchAll();
    } catch {
      toast.error('Delete failed.');
    } finally {
      setDeleting(null);
    }
  };

  const handlePublishToggle = async (a) => {
    const newStatus = a.status === 'Published' ? 'Draft' : 'Published';
    try {
      await axios.put(`/coursework/assignments/${a.id}`, { status: newStatus });
      toast.success(
        newStatus === 'Published'
          ? 'Assignment published! Students & Parents notified.'
          : 'Assignment unpublished to Draft.'
      );
      fetchAll();
    } catch {
      toast.error('Failed to change status.');
    }
  };

  const grades = assignedData.grades || [];

  return (
    <TeacherLayout searchPlaceholder="Search coursework...">
      {showAssignmentModal && (
        <AssignmentModal
          initial={editingAssignment}
          assignedData={assignedData}
          onClose={() => {
            setShowAssignmentModal(false);
            setEditingAssignment(null);
          }}
          onSave={handleSaveAssignment}
        />
      )}

      {showMaterialModal && (
        <MaterialModal
          assignedData={assignedData}
          onClose={() => setShowMaterialModal(false)}
          onSave={handleSaveMaterial}
        />
      )}

      {viewingSubmissions && (
        <SubmissionsDrawer
          assignment={viewingSubmissions}
          onClose={() => setViewingSubmissions(null)}
        />
      )}

      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#203e4f]">
            Teacher Coursework Hub
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[#6a8b9c] mt-0.5">
            Manage homework assignments and study materials for your assigned classes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setEditingAssignment(null);
              setShowAssignmentModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#203e4f] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#172d3a]"
          >
            + New Assignment
          </button>
          <button
            onClick={() => setShowMaterialModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3b6b82] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#203e4f]"
          >
            + Upload Material
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Assignments', value: assignments.length, color: 'text-[#203e4f]' },
          {
            label: 'Published Active',
            value: assignments.filter((a) => a.status === 'Published').length,
            color: 'text-emerald-700',
          },
          { label: 'Study Materials', value: materials.length, color: 'text-[#3b6b82]' },
          {
            label: 'Submissions Received',
            value: assignments.reduce((s, a) => s + (a._count?.submissions ?? 0), 0),
            color: 'text-indigo-800',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-[#d8e5ec] bg-white p-4 sm:p-5 shadow-xs">
            <p className={`text-2xl sm:text-3xl font-black ${color}`}>{value}</p>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#6a8b9c] mt-1">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Controls Bar (Tabs + Grade Dropdown Filter) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#e2ebf0] rounded-xl w-full sm:w-80">
          <button
            onClick={() => setTab('assignments')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition ${
              tab === 'assignments' ? 'bg-white text-[#203e4f] shadow-xs' : 'text-[#6a8b9c] hover:text-[#203e4f]'
            }`}
          >
            📋 Assignments ({assignments.length})
          </button>
          <button
            onClick={() => setTab('materials')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition ${
              tab === 'materials' ? 'bg-white text-[#203e4f] shadow-xs' : 'text-[#6a8b9c] hover:text-[#203e4f]'
            }`}
          >
            📚 Study Materials ({materials.length})
          </button>
        </div>

        {/* Grade & Status Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="rounded-xl border border-[#d8e5ec] bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-[#203e4f] outline-none shadow-xs"
          >
            <option value="">All My Grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {tab === 'assignments' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-[#d8e5ec] bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-[#203e4f] outline-none shadow-xs"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Closed">Closed</option>
            </select>
          )}

          {(filterGrade || filterStatus) && (
            <button
              onClick={() => {
                setFilterGrade('');
                setFilterStatus('');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-[#6a8b9c]">Loading coursework records...</div>
      ) : (
        <>
          {/* ── Assignments Tab ── */}
          {tab === 'assignments' && (
            assignments.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#d8e5ec] bg-white py-16 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-bold text-[#203e4f]">No assignments found</p>
                <p className="text-xs text-[#6a8b9c] mt-1">
                  Click "+ New Assignment" above to assign homework or projects to your classes.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-[#d8e5ec] bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STATUS_COLORS[a.status]}`}>
                            {a.status}
                          </span>
                          <h3 className="font-black text-[#203e4f] text-base">{a.title}</h3>
                        </div>

                        <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-[#6a8b9c]">
                          <span className="font-semibold text-[#203e4f]">📚 {a.subject}</span>
                          <span>🎓 {a.grade}</span>
                          {a.class && <span>🏫 {a.class.name}</span>}
                          {a.dueDate && <span>📅 Due {fmtDate(a.dueDate)}</span>}
                          <span>⭐ {a.points} pts</span>
                          <span className="font-bold text-[#3b6b82]">
                            📥 {a._count?.submissions ?? 0} submission(s)
                          </span>
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
                            📎 {a.attachmentName || 'Download Worksheet / Rubric'}
                          </a>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <button
                          onClick={() => setViewingSubmissions(a)}
                          className="rounded-xl bg-[#eaf2f6] px-3 py-1.5 text-xs font-bold text-[#203e4f] hover:bg-[#d8e5ec] transition"
                        >
                          Submissions ({a._count?.submissions ?? 0})
                        </button>
                        <button
                          onClick={() => handlePublishToggle(a)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            a.status === 'Published'
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {a.status === 'Published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingAssignment(a);
                            setShowAssignmentModal(true);
                          }}
                          className="rounded-xl border border-[#d8e5ec] bg-white px-3 py-1.5 text-xs font-bold text-[#203e4f] hover:bg-slate-50 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAssignment(a.id)}
                          disabled={deleting === a.id}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
                        >
                          {deleting === a.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Materials Tab ── */}
          {tab === 'materials' && (
            materials.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#d8e5ec] bg-white py-16 text-center">
                <p className="text-4xl mb-3">📚</p>
                <p className="font-bold text-[#203e4f]">No study materials uploaded</p>
                <p className="text-xs text-[#6a8b9c] mt-1">
                  Upload lecture notes, textbooks, and past papers for your students to access anytime.
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
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold text-[#1c4d66] bg-[#E4EFF6] border border-[#d8e5ec] px-2 py-0.5 rounded-full">
                          {MATERIAL_TYPE_LABELS[m.type] || m.type}
                        </span>
                        <span className="text-[11px] text-[#6a8b9c]">⬇ {m.downloadCount} views</span>
                      </div>

                      <h3 className="font-black text-[#203e4f] text-sm sm:text-base mt-2.5 line-clamp-2">
                        {m.title}
                      </h3>

                      <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-[#6a8b9c]">
                        <span className="font-semibold text-[#203e4f]">📚 {m.subject}</span>
                        <span>🎓 {m.grade}</span>
                        {m.class && <span>🏫 {m.class.name}</span>}
                      </div>

                      {m.description && (
                        <p className="mt-2 text-xs text-[#4d6b7c] line-clamp-2">{m.description}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-[#3b6b82] hover:underline truncate"
                        title={m.fileName}
                      >
                        📎 {m.fileName}
                      </a>

                      <button
                        onClick={() => handleDeleteMaterial(m.id)}
                        disabled={deleting === m.id}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 shrink-0"
                      >
                        {deleting === m.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </TeacherLayout>
  );
}
