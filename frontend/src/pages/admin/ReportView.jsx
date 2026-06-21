import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import AdminLayout from '../../components/AdminLayout';

const money = (n) => `ETB ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0))}`;
const pct = (n) => `${Number(n || 0)}%`;
const plain = (n) => (n === null || n === undefined || n === '' ? '—' : n);

// Per-report configuration: which summary stats and tables to render.
const REPORTS = {
  academic: {
    title: 'Academic Report',
    subtitle: 'Grade distribution and subject performance across the school.',
    summary: [
      { key: 'totalEntries', label: 'Graded Entries' },
      { key: 'overallAverage', label: 'Overall Average', format: pct },
      { key: 'subjectsAssessed', label: 'Subjects Assessed' },
      { key: 'passRate', label: 'Pass Rate', format: pct },
    ],
    tables: [
      { title: 'Grade Distribution', dataKey: 'gradeDistribution', columns: [
        { key: 'grade', label: 'Grade' }, { key: 'count', label: 'Students' }, { key: 'percentage', label: 'Share', format: pct },
      ] },
      { title: 'Subject Performance', dataKey: 'subjectPerformance', columns: [
        { key: 'subject', label: 'Subject' }, { key: 'entries', label: 'Entries' }, { key: 'averageScore', label: 'Average', format: pct }, { key: 'passRate', label: 'Pass Rate', format: pct },
      ] },
      { title: 'Top Performers', dataKey: 'topPerformers', columns: [
        { key: 'name', label: 'Student' }, { key: 'averageScore', label: 'Average', format: pct }, { key: 'entries', label: 'Entries' },
      ] },
    ],
  },
  attendance: {
    title: 'Attendance Report',
    subtitle: 'School-wide attendance and tardiness.',
    summary: [
      { key: 'totalSessions', label: 'Sessions' },
      { key: 'totalRecords', label: 'Records' },
      { key: 'attendanceRate', label: 'Attendance Rate', format: pct },
      { key: 'absenteeismRate', label: 'Absenteeism', format: pct },
      { key: 'tardinessRate', label: 'Tardiness', format: pct },
    ],
    tables: [
      { title: 'By Class', dataKey: 'byClass', columns: [
        { key: 'className', label: 'Class' }, { key: 'subject', label: 'Subject' }, { key: 'sessions', label: 'Sessions' },
        { key: 'present', label: 'Present' }, { key: 'absent', label: 'Absent' }, { key: 'late', label: 'Late' },
        { key: 'attendanceRate', label: 'Rate', format: pct }, { key: 'tardinessRate', label: 'Tardiness', format: pct },
      ] },
    ],
  },
  enrollment: {
    title: 'Enrollment Report',
    subtitle: 'Demographics and new student statistics.',
    summary: [
      { key: 'totalStudents', label: 'Total Students' },
      { key: 'gradeLevels', label: 'Grade Levels' },
      { key: 'newLast30Days', label: 'New (30 days)' },
      { key: 'enrollmentsThisYear', label: 'Enrolled This Year' },
      { key: 'activeYear', label: 'Active Year' },
    ],
    tables: [
      { title: 'By Grade', dataKey: 'byGrade', columns: [
        { key: 'grade', label: 'Grade' }, { key: 'count', label: 'Students' }, { key: 'percentage', label: 'Share', format: pct },
      ] },
      { title: 'By Gender', dataKey: 'byGender', columns: [
        { key: 'gender', label: 'Gender' }, { key: 'count', label: 'Students' }, { key: 'percentage', label: 'Share', format: pct },
      ] },
    ],
  },
  financial: {
    title: 'Financial Summary',
    subtitle: 'High-level view of fee collections (read-only).',
    summary: [
      { key: 'totalBilled', label: 'Total Billed', format: money },
      { key: 'totalCollected', label: 'Collected', format: money },
      { key: 'totalPending', label: 'Pending', format: money },
      { key: 'collectionRate', label: 'Collection Rate', format: pct },
      { key: 'invoices', label: 'Invoices' },
    ],
    tables: [
      { title: 'By Month', dataKey: 'byMonth', columns: [
        { key: 'month', label: 'Month' }, { key: 'billed', label: 'Billed', format: money }, { key: 'collected', label: 'Collected', format: money }, { key: 'pending', label: 'Pending', format: money },
      ] },
      { title: 'By Grade', dataKey: 'byGrade', columns: [
        { key: 'grade', label: 'Grade' }, { key: 'billed', label: 'Billed', format: money }, { key: 'collected', label: 'Collected', format: money },
        { key: 'pending', label: 'Pending', format: money }, { key: 'collectionRate', label: 'Collection Rate', format: pct },
      ] },
    ],
  },
};

export default function ReportView() {
  const { type } = useParams();
  const navigate = useNavigate();
  const config = REPORTS[type];

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!config) { setLoading(false); return; }
    setLoading(true);
    setError('');
    axios.get(`/reports/${type}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load report.'))
      .finally(() => setLoading(false));
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownloadCSV = () => {
    if (!data) return;
    const lines = [];
    lines.push(`${config.title}`);
    lines.push(`Generated,${new Date().toLocaleString()}`);
    lines.push('');

    // Summary block
    lines.push('Summary');
    config.summary.forEach((s) => {
      const raw = data.summary?.[s.key];
      lines.push(`${s.label},${s.format ? s.format(raw) : plain(raw)}`);
    });
    lines.push('');

    // Each table
    config.tables.forEach((table) => {
      const rows = data[table.dataKey] || [];
      lines.push(table.title);
      lines.push(table.columns.map((c) => c.label).join(','));
      rows.forEach((row) => {
        lines.push(table.columns.map((c) => {
          const raw = row[c.key];
          const val = c.format ? c.format(raw) : plain(raw);
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(','));
      });
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported as CSV.');
  };

  if (!config) {
    return (
      <AdminLayout pageTitle="Report">
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center text-gray-500">
          <p className="font-semibold">Unknown report type.</p>
          <button onClick={() => navigate('/admin/academic-reports')} className="mt-4 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900">Back to Reports</button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      pageTitle={config.title}
      headerAction={
        <button
          onClick={handleDownloadCSV}
          disabled={!data}
          className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Download CSV
        </button>
      }
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin/academic-reports')} className="mb-2 text-sm font-semibold text-gray-500 hover:text-black">&larr; Back to Reporting Module</button>
          <h2 className="text-2xl font-bold text-gray-900">{config.title}</h2>
          <p className="max-w-2xl text-sm text-gray-500">{config.subtitle}</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-gray-500">Loading report…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 py-12 text-center text-red-600">{error}</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {config.summary.map((s) => {
              const raw = data.summary?.[s.key];
              return (
                <div key={s.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{s.label}</div>
                  <div className="text-2xl font-bold text-gray-900">{s.format ? s.format(raw) : plain(raw)}</div>
                </div>
              );
            })}
          </div>

          {/* Tables */}
          {config.tables.map((table) => {
            const rows = data[table.dataKey] || [];
            return (
              <div key={table.dataKey} className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                  <h3 className="text-lg font-bold text-gray-900">{table.title}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        {table.columns.map((c) => (
                          <th key={c.key} className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {rows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {table.columns.map((c) => (
                            <td key={c.key} className="px-6 py-3">{c.format ? c.format(row[c.key]) : plain(row[c.key])}</td>
                          ))}
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr><td colSpan={table.columns.length} className="px-6 py-8 text-center text-gray-500">No data available yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}
    </AdminLayout>
  );
}
