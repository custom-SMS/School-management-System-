import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from '../api/axios';
import Navbar from '../components/Navbar';

export default function ReportCard() {
  const { user } = useContext(AuthContext);
  const [studentStats, setStudentStats] = useState(null);
  
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Grade Summary | School Management System';

    // Ideally user is role Student
    if (user?.role === 'Student') {
      axios.get('/stats/student/me').then(res => setStudentStats(res.data)).catch(console.error);
    }

    return () => {
      document.title = previousTitle;
    };
  }, [user]);

  const handlePrint = () => {
    window.print();
  };

  const gradeEntries = studentStats?.grades || [];
  const normalizedGradeEntries = gradeEntries.map((grade) => ({
    ...grade,
    percentageValue: Number(grade.percentage ?? 0),
    totalValue: Number(
      grade.total ??
      ((grade.marks?.test || 0) + (grade.marks?.midterm || 0) + (grade.marks?.final || 0))
    ),
  }));
  const gradeAverage = normalizedGradeEntries.length > 0
    ? Math.round(
        normalizedGradeEntries.reduce((sum, grade) => sum + grade.percentageValue, 0) /
          normalizedGradeEntries.length,
      )
    : 0;
  const bestSubject = normalizedGradeEntries.reduce((best, grade) => {
    if (!best || grade.percentageValue > best.percentageValue) return grade;
    return best;
  }, null);
  const currentGrade = studentStats?.grade || studentStats?.profile?.grade || 'N/A';
  const studentName = studentStats?.profile?.user?.name || studentStats?.profile?.name || 'Student';
  const studentId = studentStats?.studentId || studentStats?.profile?.studentId || studentStats?.profile?.email?.split('@')[0] || '—';

  if (!studentStats) return <div className="p-6 text-slate-600">Loading Report Card...</div>;

  return (
    <div className="min-h-screen bg-transparent pb-10">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="no-print mb-6 rounded-4xl border border-white/50 bg-white/75 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">Academic record</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Grade Summary</h1>
          <p className="mt-2 text-sm text-slate-500">A clean summary of your marks, grade level, and academic performance.</p>
        </div>

    <div className="rounded-4xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-8">
      <style>
        {`
          @media print {
            @page { size: A4 portrait; margin: 8mm; }

            html, body {
              margin: 0;
              padding: 0;
              background: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            nav { display: none !important; }
            .no-print { display: none !important; }
            .printable-area {
              box-shadow: none !important;
              border: 0 !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              transform: scale(0.88);
              transform-origin: top center;
            }

            .printable-area .summary-duplicate {
              display: none !important;
            }

            .printable-area .print-heading {
              margin-bottom: 12px !important;
              padding-bottom: 10px !important;
            }

            .printable-area .print-row {
              margin-bottom: 10px !important;
            }

            .printable-area .print-card {
              padding: 10px 12px !important;
            }

            .printable-area .grade-table th,
            .printable-area .grade-table td {
              padding: 6px 8px !important;
              font-size: 10px !important;
            }

            .printable-area .grade-table td:first-child {
              font-size: 10px !important;
            }
          }
        `}
      </style>

      <div className="no-print mb-6 flex justify-center">
        <button onClick={handlePrint} className="rounded-full bg-linear-to-r from-slate-900 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5">
          🖨️ Print Grade Summary
        </button>
      </div>

      <div className="printable-area rounded-3xl border-2 border-slate-900 p-6 sm:p-10">
        <div className="print-heading mb-8 border-b-2 border-slate-900 pb-6 text-center">
          <h1 className="m-0 text-4xl font-black uppercase tracking-tight text-slate-900">Grade Summary</h1>
          <p className="mt-2 text-lg text-slate-600">Academic Year: 2023 - 2024</p>
        </div>

        <div className="print-row mb-8 grid gap-4 text-base sm:grid-cols-2 lg:grid-cols-4">
          <div className="print-card rounded-2xl bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Student Name</div>
            <div className="mt-1 text-lg font-bold text-slate-900">{studentName}</div>
          </div>
          <div className="print-card rounded-2xl bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Student ID</div>
            <div className="mt-1 text-lg font-bold text-slate-900">{studentId}</div>
          </div>
          <div className="print-card rounded-2xl bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Grade Level</div>
            <div className="mt-1 text-lg font-bold text-slate-900">{currentGrade}</div>
          </div>
          <div className="print-card rounded-2xl bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Average Score</div>
            <div className="mt-1 text-lg font-bold text-slate-900">{gradeAverage}%</div>
          </div>
        </div>

        <div className="print-row mb-8 grid gap-4 lg:grid-cols-3">
          <div className="print-card rounded-3xl bg-emerald-50 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Top Subject</div>
            <div className="mt-1 text-xl font-black text-emerald-800">
              {bestSubject ? `${bestSubject.subject} (${bestSubject.percentageValue}%)` : 'No grades yet'}
            </div>
          </div>
          <div className="print-card rounded-3xl bg-blue-50 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Subjects Graded</div>
            <div className="mt-1 text-xl font-black text-blue-800">{normalizedGradeEntries.length}</div>
          </div>
          <div className="print-card rounded-3xl bg-amber-50 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Status</div>
            <div className="mt-1 text-xl font-black text-amber-800">{gradeAverage >= 75 ? 'Excellent' : gradeAverage >= 50 ? 'Satisfactory' : 'Needs Support'}</div>
          </div>
        </div>

        <div className="summary-duplicate no-print mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Student ID</div>
            <div className="mt-1 text-base font-bold text-slate-900">{studentId}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Grade Level</div>
            <div className="mt-1 text-base font-bold text-slate-900">{currentGrade}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Subjects Graded</div>
            <div className="mt-1 text-base font-bold text-slate-900">{normalizedGradeEntries.length}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Best Subject</div>
            <div className="mt-1 text-base font-bold text-slate-900">
              {bestSubject ? `${bestSubject.subject} (${bestSubject.percentageValue}%)` : 'No grades yet'}
            </div>
          </div>
        </div>

        <div className="print-row overflow-hidden rounded-2xl border border-slate-200">
          <table className="grade-table w-full border-collapse text-center text-sm sm:text-base">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="border border-slate-900 px-4 py-4">Subject</th>
                <th className="border border-slate-900 px-4 py-4">Test</th>
                <th className="border border-slate-900 px-4 py-4">Midterm</th>
                <th className="border border-slate-900 px-4 py-4">Final</th>
                <th className="border border-slate-900 px-4 py-4">Total</th>
                <th className="border border-slate-900 px-4 py-4">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {normalizedGradeEntries.length > 0 ? (
                normalizedGradeEntries.map((g) => (
                  <tr key={g._id} className="transition hover:bg-slate-50">
                    <td className="border border-slate-200 px-4 py-4 font-bold text-left text-slate-900">{g.subject}</td>
                    <td className="border border-slate-200 px-4 py-4">{g.marks?.test ?? 0}</td>
                    <td className="border border-slate-200 px-4 py-4">{g.marks?.midterm ?? 0}</td>
                    <td className="border border-slate-200 px-4 py-4">{g.marks?.final ?? 0}</td>
                    <td className="border border-slate-200 px-4 py-4 font-bold text-slate-900">{g.totalValue}</td>
                    <td className="border border-slate-200 px-4 py-4 font-bold text-slate-900">{g.percentageValue}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="border border-slate-200 px-4 py-8 text-slate-500">No grades available at this time.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="print-row mt-10 grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-3">
          <div className="text-center">
            <div className="mb-2 h-8 border-b border-slate-900"></div>
            <strong>Class Teacher Signature</strong>
          </div>
          <div className="text-center">
            <div className="mb-2 h-8 border-b border-slate-900"></div>
            <strong>Principal Signature</strong>
          </div>
          <div className="text-center">
            <p className="mb-2">{new Date().toLocaleDateString()}</p>
            <div className="mb-2 border-b border-slate-900"></div>
            <strong>Date Generated</strong>
          </div>
        </div>
      </div>
    </div>
      </div>
    </div>
  );
}
