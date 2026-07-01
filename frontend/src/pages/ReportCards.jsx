import { useEffect, useMemo, useState } from 'react';
import axios from '../api/axios';
import AdminLayout from '../components/AdminLayout';
import { toast } from 'react-toastify';

const getStudentOptionId = (student) => student?._id || student?.id || '';
const getStudentDisplayName = (student) => student?.user?.name || student?.name || 'Student';
const getGradeSubjectLabel = (grade) => grade?.subjectRef?.name || grade?.subject || grade?.class?.subject || 'Subject';
const getGradeClassLabel = (grade) => grade?.class?.name || '—';

export default function ReportCards() {
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [preview, setPreview] = useState(null); // { reportCard, grades }
  const [previewError, setPreviewError] = useState('');
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState('');

  const activeYear = useMemo(
    () => years.find((year) => year.id === selectedYear) || years.find((year) => year.isActive) || null,
    [years, selectedYear]
  );

  const sortedStudents = useMemo(() => (
    [...students].sort((left, right) => {
      const leftName = getStudentDisplayName(left);
      const rightName = getStudentDisplayName(right);
      return leftName.localeCompare(rightName);
    })
  ), [students]);

  useEffect(() => {
    axios.get('/academic-years').then((res) => {
      setYears(res.data || []);
      const active = (res.data || []).find((y) => y.isActive) || (res.data || [])[0];
      if (active) setSelectedYear(active.id);
    }).catch((err) => console.error(err));

    axios.get('/students').then((res) => {
      const payload = res.data;
      setStudents(Array.isArray(payload) ? payload : (payload?.students || []));
    }).catch((err) => console.error(err));
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

  const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-500/10';
  const card = preview?.reportCard;
  const grades = preview?.grades || [];

  return (
    <AdminLayout pageTitle="Report Cards Management">
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Report Cards</h2>
        <p className="text-sm font-medium text-slate-500">Compile averages, ranks and attendance, then publish to students and parents.</p>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Academic Year</span>
            <div className={`${inputClass} flex items-center font-semibold text-slate-800`}>
              {activeYear ? `${activeYear.year}${activeYear.isActive ? ' (Active)' : ''}` : 'No academic year available'}
            </div>
          </div>
          <button onClick={handleCompile} disabled={!selectedYear || busy === 'compile'} className="rounded-lg bg-black px-5 py-3 font-bold text-white hover:bg-slate-800 transition disabled:opacity-50 shadow-sm">
            {busy === 'compile' ? 'Compiling…' : 'Compile Report Cards'}
          </button>
          <button onClick={handlePublish} disabled={!selectedYear || busy === 'publish'} className="rounded-lg bg-slate-800 px-5 py-3 font-bold text-white hover:bg-slate-900 transition disabled:opacity-50 shadow-sm">
            {busy === 'publish' ? 'Publishing…' : 'Publish to Students'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900">Preview a Student's Report Card</h3>
        </div>
        
        <div className="p-6">
          <select className={`${inputClass} mb-6 max-w-md`} value={selectedStudent} onChange={(e) => handleStudentChange(e.target.value)}>
            <option value="">Select a student</option>
            {sortedStudents.map((s) => (
              <option key={getStudentOptionId(s)} value={getStudentOptionId(s)}>
                {getStudentDisplayName(s)} ({s.studentId}) — {s.grade}
              </option>
            ))}
          </select>

          {previewError && <p className="text-sm font-semibold text-zinc-700 bg-zinc-50 border border-zinc-100 rounded-lg px-4 py-3 mb-6">{previewError}</p>}

          {card && (
            <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Average</div><div className="mt-1 text-2xl font-black text-slate-900">{Math.round(card.averageScore)}%</div></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-100 p-4"><div className="text-xs font-bold uppercase tracking-wider text-black">Rank</div><div className="mt-1 text-2xl font-black text-indigo-900">{card.rank ? `#${card.rank}` : '—'}</div></div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4"><div className="text-xs font-bold uppercase tracking-wider text-gray-600">Attendance</div><div className="mt-1 text-2xl font-black text-gray-900">{Math.round(card.attendancePercentage)}%</div></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Result</div><div className="mt-1 text-lg font-black text-slate-900">{card.status || 'Pending'}</div></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Promotion</div><div className="mt-1 text-lg font-black text-slate-900">{card.promotionStatus || 'Pending'}</div></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-500">Publication</div><div className={`mt-1 text-lg font-black ${card.published ? 'text-slate-600' : 'text-gray-600'}`}>{card.published ? 'Published' : 'Draft'}</div></div>
                </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Subject</th>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Class</th>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Quiz</th>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Assign.</th>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Midterm</th>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Final</th>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Total</th>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {grades.length > 0 ? grades.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 font-bold text-slate-900">{getGradeSubjectLabel(g)}</td>
                        <td className="px-6 py-4 text-slate-600">{getGradeClassLabel(g)}</td>
                        <td className="px-6 py-4 text-slate-600">{g.quiz}</td>
                        <td className="px-6 py-4 text-slate-600">{g.assignment}</td>
                        <td className="px-6 py-4 text-slate-600">{g.midterm}</td>
                        <td className="px-6 py-4 text-slate-600">{g.final}</td>
                        <td className="px-6 py-4 font-black text-slate-900">{g.total}</td>
                        <td className="px-6 py-4 font-black text-black">{g.percentage}%</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="8" className="px-6 py-6 text-center font-medium text-slate-500">No grades recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Teacher Comments</label>
                <textarea className={inputClass} rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Add comments for this report card…" />
                <button onClick={handleSaveComments} disabled={busy === 'comments'} className="mt-3 rounded-lg bg-black px-5 py-2.5 font-bold text-white hover:bg-slate-800 transition disabled:opacity-50 shadow-sm">
                  {busy === 'comments' ? 'Saving…' : 'Save Comments'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

