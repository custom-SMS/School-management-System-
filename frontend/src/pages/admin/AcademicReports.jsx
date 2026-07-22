import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';

const REPORT_CARDS = [
  {
    key: 'academic',
    title: 'Academic Reports',
    desc: 'Grade performance and top performers per grade level.',
    badge: null,
    btnLabel: 'Generate Report',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    iconBg: 'bg-blue-50 text-blue-600',
  },
  {
    key: 'attendance',
    title: 'Attendance Reports',
    desc: 'School-wide attendance rates, absences and tardiness.',
    badge: null,
    btnLabel: 'Generate Report',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
  {
    key: 'enrollment',
    title: 'Enrollment Reports',
    desc: 'Student demographics, new enrollments and grade distribution.',
    badge: null,
    btnLabel: 'Generate Report',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    iconBg: 'bg-violet-50 text-violet-600',
  },
  {
    key: 'financial',
    title: 'Financial Summaries',
    desc: 'High-level view of fee collections, monthly & grade breakdown.',
    badge: 'Read Only',
    btnLabel: 'View Dashboard',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-amber-50 text-amber-600',
  },
];

export default function AcademicReports() {
  const navigate = useNavigate();

  return (
    <AdminLayout pageTitle="Reporting Module">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">General Reports</h2>
        <p className="mt-1 text-sm text-gray-500">Select a report type to view live data and export a CSV.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {REPORT_CARDS.map((card) => (
          <div
            key={card.key}
            className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm hover:shadow-md transition flex flex-col gap-4"
          >
            <div className="flex items-start gap-4">
              <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">{card.title}</h3>
                  {card.badge && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500 leading-snug">{card.desc}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/admin/reports/${card.key}`)}
              className="w-full py-2.5 text-sm font-bold rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition"
            >
              {card.btnLabel} →
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
