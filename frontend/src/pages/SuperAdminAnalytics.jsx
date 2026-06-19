import { useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';

const analyticsCards = [
  { label: 'Total Students', value: '2,846', tone: 'bg-slate-900 text-white', note: '+4.8% vs last term' },
  { label: 'Academic Average', value: '81.4%', tone: 'bg-sky-50 text-sky-700', note: 'Across all active classes' },
  { label: 'Attendance Stability', value: '94.1%', tone: 'bg-emerald-50 text-emerald-700', note: '7-day rolling average' },
  { label: 'Revenue Realization', value: 'ETB 12.4M', tone: 'bg-violet-50 text-violet-700', note: 'Collected this academic year' },
];

const governanceViews = [
  {
    title: 'Student Analytics',
    summary: 'Enrollment distribution, retention indicators, and registration trend monitoring.',
    metrics: [
      { label: 'New Registrations', value: '412' },
      { label: 'Active Students', value: '2,846' },
      { label: 'At-Risk Transfers', value: '18' },
    ],
  },
  {
    title: 'Academic Analytics',
    summary: 'Read-only insight into pass rate, performance variance, and assessment completion.',
    metrics: [
      { label: 'Pass Rate', value: '88.7%' },
      { label: 'Report Card Completion', value: '96%' },
      { label: 'Performance Alerts', value: '27' },
    ],
  },
  {
    title: 'Financial Analytics',
    summary: 'Governance-level visibility into revenue, payment backlog, and fee collection efficiency.',
    metrics: [
      { label: 'Collected Revenue', value: 'ETB 12.4M' },
      { label: 'Pending Verification', value: '143' },
      { label: 'Defaulter Exposure', value: 'ETB 1.1M' },
    ],
  },
  {
    title: 'Attendance Analytics',
    summary: 'School-wide attendance health, absence concentration, and escalation triggers.',
    metrics: [
      { label: 'Attendance Rate', value: '94.1%' },
      { label: 'Chronic Absence Cases', value: '36' },
      { label: 'Escalated Alerts', value: '11' },
    ],
  },
];

const analyticRecords = [
  { category: 'Student Analytics', metric: 'Enrollment Growth', value: '+4.8%', status: 'Stable' },
  { category: 'Student Analytics', metric: 'Registration Conversion', value: '72%', status: 'Monitoring' },
  { category: 'Academic Analytics', metric: 'Assessment Completion', value: '96%', status: 'Stable' },
  { category: 'Academic Analytics', metric: 'Low Performance Alerts', value: '27', status: 'Attention' },
  { category: 'Financial Analytics', metric: 'Collection Efficiency', value: '91%', status: 'Stable' },
  { category: 'Financial Analytics', metric: 'Pending Verification Queue', value: '143', status: 'Monitoring' },
  { category: 'Attendance Analytics', metric: 'School Attendance Rate', value: '94.1%', status: 'Stable' },
  { category: 'Attendance Analytics', metric: 'Escalated Attendance Alerts', value: '11', status: 'Attention' },
];

const statusStyles = {
  Stable: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Monitoring: 'bg-amber-50 text-amber-700 border border-amber-200',
  Attention: 'bg-rose-50 text-rose-700 border border-rose-200',
};

export default function SuperAdminAnalytics() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return analyticRecords;

    return analyticRecords.filter((record) =>
      [record.category, record.metric, record.value, record.status].join(' ').toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <AdminLayout
      pageTitle="Analytics"
      pageSubtitle="Read-only governance analytics across students, academics, finance, and attendance."
      searchPlaceholder="Search analytics or trends..."
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {analyticsCards.map((card) => (
            <div key={card.label} className={`rounded-3xl border border-slate-200 p-5 shadow-sm ${card.tone}`}>
              <div className="text-xs font-bold uppercase tracking-[0.22em] opacity-80">{card.label}</div>
              <div className="mt-4 text-3xl font-black tracking-tight">{card.value}</div>
              <div className="mt-2 text-sm opacity-80">{card.note}</div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {governanceViews.map((view) => (
            <article key={view.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">{view.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{view.summary}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Governance View</span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {view.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{metric.label}</div>
                    <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">{metric.value}</div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">Governance Trend Register</h2>
              <p className="mt-1 text-sm text-slate-500">
                High-level analytics register for strategic monitoring only. No operational editing is available here.
              </p>
            </div>

            <div className="w-full max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter analytics records..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300"
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Metric</th>
                  <th className="px-4 py-4">Value</th>
                  <th className="px-4 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr key={`${record.category}-${record.metric}`} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4 font-semibold text-slate-800">{record.category}</td>
                    <td className="px-4 py-4 text-slate-600">{record.metric}</td>
                    <td className="px-4 py-4 text-slate-900 font-bold">{record.value}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyles[record.status]}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-12 text-center text-sm font-medium text-slate-500">
                      No analytics records match the current search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}