import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../../api/axios';
import AdminLayout from '../../components/AdminLayout';
import { toast } from 'react-toastify';

const STATUS_COLORS = {
  Enrolled:    'bg-emerald-100 text-emerald-800',
  Promoted:    'bg-blue-100 text-blue-800',
  Repeated:    'bg-amber-100 text-amber-800',
  Graduated:   'bg-purple-100 text-purple-800',
  Transferred: 'bg-slate-100 text-slate-600',
  Withdrawn:   'bg-red-100 text-red-800',
};

const WORKFLOW_COLORS = {
  Published:          'bg-emerald-100 text-emerald-700',
  Archived:           'bg-slate-100 text-slate-500',
  Draft:              'bg-amber-100 text-amber-700',
  HomeroomReview:     'bg-blue-100 text-blue-700',
  BranchAdminReview:  'bg-indigo-100 text-indigo-700',
};

const scoreColor = (score) => {
  if (score === null || score === undefined) return 'text-slate-400';
  if (score >= 80) return 'text-emerald-700 font-bold';
  if (score >= 60) return 'text-blue-700 font-bold';
  if (score >= 50) return 'text-amber-700 font-bold';
  return 'text-red-700 font-bold';
};

export default function StudentHistory() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('history');
  const [transcript, setTranscript] = useState(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`/students/${id}/history`);
        setData(res.data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load student history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [id]);

  const loadTranscript = async () => {
    if (transcript) { setTab('transcript'); return; }
    setTranscriptLoading(true);
    try {
      const res = await axios.get(`/students/${id}/transcript`);
      setTranscript(res.data);
      setTab('transcript');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load transcript');
    } finally {
      setTranscriptLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout pageTitle="Academic History">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
            <div className="text-slate-400 text-sm">Loading academic history…</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout pageTitle="Academic History">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          Failed to load student data.
        </div>
      </AdminLayout>
    );
  }

  const { student, history } = data;
  const scoredYears = history.filter(h => h.averageScore !== null);
  const overallAvg = scoredYears.length
    ? (scoredYears.reduce((s, h) => s + h.averageScore, 0) / scoredYears.length).toFixed(1)
    : null;
  const attendedYears = history.filter(h => h.attendanceRate !== null);
  const overallAttendance = attendedYears.length
    ? (attendedYears.reduce((s, h) => s + h.attendanceRate, 0) / attendedYears.length).toFixed(1)
    : null;

  return (
    <AdminLayout pageTitle="Academic History">
      {/* Back link */}
      <Link
        to="/admin/students"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-5 transition"
      >
        ← Back to Students
      </Link>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">{student.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Student ID: <span className="font-bold text-slate-700">{student.studentId}</span>
            &nbsp;·&nbsp;Current Grade: <span className="font-bold text-slate-700">{student.grade || '—'}</span>
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Avg Score</div>
            <div className={`text-2xl font-black ${scoreColor(overallAvg)}`}>
              {overallAvg !== null ? `${overallAvg}%` : '—'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Avg Attendance</div>
            <div className={`text-2xl font-black ${scoreColor(overallAttendance)}`}>
              {overallAttendance !== null ? `${overallAttendance}%` : '—'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Years</div>
            <div className="text-2xl font-black text-slate-900">{history.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${
            tab === 'history'
              ? 'bg-white border border-b-white border-slate-200 text-slate-900 -mb-px'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          📋 Year-by-Year History
        </button>
        <button
          onClick={loadTranscript}
          disabled={transcriptLoading}
          className={`px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors disabled:opacity-50 ${
            tab === 'transcript'
              ? 'bg-white border border-b-white border-slate-200 text-slate-900 -mb-px'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {transcriptLoading ? '⏳ Loading…' : '📄 Official Transcript'}
        </button>
      </div>

      {/* ─── History Tab ─── */}
      {tab === 'history' && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm">
              No academic history found for this student.
            </div>
          ) : (
            history.map((h, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${
                  h.academicYear.isActive ? 'border-emerald-300' : 'border-slate-200'
                }`}
              >
                {/* Year header bar */}
                <div className={`flex items-center justify-between px-5 py-3.5 ${
                  h.academicYear.isActive ? 'bg-emerald-50/70' : 'bg-slate-50/70'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      h.academicYear.isActive
                        ? 'bg-emerald-500 ring-4 ring-emerald-100'
                        : 'bg-slate-300'
                    }`} />
                    <span className="font-black text-slate-900 text-base">{h.academicYear.year}</span>
                    {h.academicYear.isActive && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        Current
                      </span>
                    )}
                  </div>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                    STATUS_COLORS[h.enrollmentStatus] || 'bg-slate-100 text-slate-600'
                  }`}>
                    {h.enrollmentStatus}
                  </span>
                </div>

                {/* Year metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 border-t border-slate-100">
                  <div className="px-5 py-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Grade / Section</div>
                    <div className="text-sm font-bold text-slate-900">{h.grade}</div>
                    {h.section && (
                      <div className="text-xs text-slate-400 mt-0.5">{h.section}</div>
                    )}
                  </div>
                  <div className="px-5 py-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Average Score</div>
                    <div className={`text-xl font-black ${scoreColor(h.averageScore)}`}>
                      {h.averageScore !== null ? `${h.averageScore}%` : '—'}
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Attendance</div>
                    <div className={`text-xl font-black ${scoreColor(h.attendanceRate)}`}>
                      {h.attendanceRate !== null ? `${h.attendanceRate}%` : '—'}
                    </div>
                    {h.totalAttendanceSessions > 0 && (
                      <div className="text-xs text-slate-400">{h.totalAttendanceSessions} sessions</div>
                    )}
                  </div>
                  <div className="px-5 py-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Report Cards</div>
                    {h.reportCards.length === 0 ? (
                      <div className="text-sm text-slate-400">None</div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {h.reportCards.map((rc, rcIdx) => (
                          <span
                            key={rcIdx}
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                              WORKFLOW_COLORS[rc.workflowStatus] || 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {rc.workflowStatus}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Transcript Tab ─── */}
      {tab === 'transcript' && transcript && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Transcript letterhead */}
          <div className="bg-slate-900 px-8 py-6 text-center text-white">
            <div className="text-lg font-black tracking-tight">{transcript.student.branch || 'School'}</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Official Academic Transcript</div>
          </div>

          {/* Student info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-8 py-5 border-b border-slate-100">
            {[
              { label: 'Student Name', value: transcript.student.name },
              { label: 'Student ID',   value: transcript.student.studentId },
              { label: 'Current Grade', value: transcript.student.currentGrade || '—' },
              { label: 'Overall GPA',  value: transcript.overallGPA !== null ? `${transcript.overallGPA}%` : '—', highlight: true },
            ].map(item => (
              <div key={item.label}>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.label}</div>
                <div className={`text-sm font-bold mt-0.5 ${item.highlight ? scoreColor(transcript.overallGPA) : 'text-slate-900'}`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Academic history table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {['Academic Year', 'Grade', 'Section', 'GPA', 'Subjects', 'Status'].map(col => (
                    <th key={col} className={`py-3 text-xs font-bold text-slate-500 uppercase tracking-wider ${
                      col === 'Academic Year' ? 'text-left px-8' : 'text-left px-4'
                    }`}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transcript.academicHistory.map((yr, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-8 py-4 font-bold text-slate-900">{yr.year}</td>
                    <td className="px-4 py-4 text-slate-700">{yr.grade}</td>
                    <td className="px-4 py-4 text-slate-500">{yr.section || '—'}</td>
                    <td className={`px-4 py-4 font-bold ${scoreColor(yr.gpa)}`}>
                      {yr.gpa !== null ? `${yr.gpa}%` : '—'}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{yr.subjectCount || '—'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                        STATUS_COLORS[yr.enrollmentStatus] || 'bg-slate-100 text-slate-600'
                      }`}>
                        {yr.enrollmentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs text-slate-400">
            <span>Generated: {new Date(transcript.generatedAt).toLocaleString()}</span>
            <span>Total Years Enrolled: {transcript.totalYearsEnrolled}</span>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
