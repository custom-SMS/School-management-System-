import { useEffect, useState } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';

export default function ReportCards() {
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [preview, setPreview] = useState(null); // { reportCard, grades }
  const [previewError, setPreviewError] = useState('');
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    axios.get('/academic-years').then((res) => {
      setYears(res.data || []);
      const active = (res.data || []).find((y) => y.isActive) || (res.data || [])[0];
      if (active) setSelectedYear(active.id);
    }).catch((err) => console.error(err));

    axios.get('/students').then((res) => setStudents(res.data || [])).catch((err) => console.error(err));
  }, []);

  const handleCompile = async () => {
    if (!selectedYear) return;
    setBusy('compile');
    try {
      const res = await axios.post('/report-cards/compile', { academicYearId: selectedYear });
      toast.success(res.data?.message || 'Report cards compiled.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to compile report cards.');
    } finally {
      setBusy('');
    }
  };

  const handlePublish = async () => {
    if (!selectedYear) return;
    if (!window.confirm('Publish report cards for this academic year? Students and parents will be notified.')) return;
    setBusy('publish');
    try {
      const res = await axios.post('/report-cards/publish', { academicYearId: selectedYear });
      toast.success(res.data?.message || 'Report cards published.');
      if (preview && selectedStudent) loadPreview(selectedStudent);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish report cards.');
    } finally {
      setBusy('');
    }
  };

  const loadPreview = async (studentId) => {
    setPreview(null);
    setPreviewError('');
    if (!studentId || !selectedYear) return;
    try {
      const res = await axios.get(`/report-cards/${studentId}/${selectedYear}`);
      setPreview(res.data);
      setComments(res.data?.reportCard?.teacherComments || '');
    } catch (err) {
      setPreviewError(err.response?.data?.message || 'No compiled report card found for this student/year.');
    }
  };

  const handleStudentChange = (id) => {
    setSelectedStudent(id);
    loadPreview(id);
  };

  const handleSaveComments = async () => {
    if (!preview?.reportCard?.id) return;
    setBusy('comments');
    try {
      await axios.patch(`/report-cards/${preview.reportCard.id}/comments`, { comments });
      toast.success('Comments saved.');
      loadPreview(selectedStudent);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save comments.');
    } finally {
      setBusy('');
    }
  };

  const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10';
  const card = preview?.reportCard;
  const grades = preview?.grades || [];

  return (
    <div className="min-h-screen bg-transparent pb-10">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-4xl border border-white/50 bg-white/75 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">Academics</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Report Cards</h1>
          <p className="mt-2 text-sm text-slate-500">Compile averages, ranks and attendance, then publish to students and parents.</p>
        </div>

        <div className="mb-6 rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Academic Year</span>
              <select className={inputClass} value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                {years.map((y) => <option key={y.id} value={y.id}>{y.year} {y.isActive ? '(Active)' : ''}</option>)}
              </select>
            </label>
            <button onClick={handleCompile} disabled={!selectedYear || busy === 'compile'} className="rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50">
              {busy === 'compile' ? 'Compiling…' : 'Compile Report Cards'}
            </button>
            <button onClick={handlePublish} disabled={!selectedYear || busy === 'publish'} className="rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50">
              {busy === 'publish' ? 'Publishing…' : 'Publish to Students'}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Preview a Student's Report Card</h2>
          <select className={`${inputClass} mb-6 max-w-md`} value={selectedStudent} onChange={(e) => handleStudentChange(e.target.value)}>
            <option value="">Select a student</option>
            {students.map((s) => <option key={s._id} value={s._id}>{s.user?.name} ({s.studentId}) — {s.grade}</option>)}
          </select>

          {previewError && <p className="text-sm text-amber-700 bg-amber-50 rounded-2xl px-4 py-3">{previewError}</p>}

          {card && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 px-4 py-4"><div className="text-xs uppercase tracking-[0.16em] text-slate-400">Average</div><div className="mt-1 text-2xl font-black text-slate-900">{Math.round(card.averageScore)}%</div></div>
                <div className="rounded-2xl bg-violet-50 px-4 py-4"><div className="text-xs uppercase tracking-[0.16em] text-violet-500">Rank</div><div className="mt-1 text-2xl font-black text-violet-800">{card.rank ? `#${card.rank}` : '—'}</div></div>
                <div className="rounded-2xl bg-blue-50 px-4 py-4"><div className="text-xs uppercase tracking-[0.16em] text-blue-500">Attendance</div><div className="mt-1 text-2xl font-black text-blue-800">{Math.round(card.attendancePercentage)}%</div></div>
                <div className="rounded-2xl bg-slate-50 px-4 py-4"><div className="text-xs uppercase tracking-[0.16em] text-slate-400">Status</div><div className={`mt-1 text-lg font-black ${card.published ? 'text-emerald-700' : 'text-amber-700'}`}>{card.published ? 'Published' : 'Draft'}</div></div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full border-collapse text-center text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="px-4 py-3">Subject</th><th className="px-4 py-3">Quiz</th><th className="px-4 py-3">Assign.</th><th className="px-4 py-3">Midterm</th><th className="px-4 py-3">Final</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {grades.length > 0 ? grades.map((g) => (
                      <tr key={g.id}>
                        <td className="px-4 py-3 text-left font-semibold text-slate-900">{g.subject}</td>
                        <td className="px-4 py-3">{g.quiz}</td>
                        <td className="px-4 py-3">{g.assignment}</td>
                        <td className="px-4 py-3">{g.midterm}</td>
                        <td className="px-4 py-3">{g.final}</td>
                        <td className="px-4 py-3 font-bold">{g.total}</td>
                        <td className="px-4 py-3 font-bold">{g.percentage}%</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="7" className="px-4 py-6 text-slate-500">No grades recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Teacher Comments</label>
                <textarea className={inputClass} rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Add comments for this report card…" />
                <button onClick={handleSaveComments} disabled={busy === 'comments'} className="mt-3 rounded-2xl bg-slate-900 px-5 py-2.5 font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50">
                  {busy === 'comments' ? 'Saving…' : 'Save Comments'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
