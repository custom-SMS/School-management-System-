import AdminLayout from '../../components/AdminLayout';

export default function AcademicReports() {
  return (
    <AdminLayout pageTitle="Reporting Module">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Academic Reports */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 bg-slate-100 text-black rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Academic Reports</h3>
              <p className="text-sm font-medium text-gray-500">Grade distribution, subject performance.</p>
            </div>
          </div>
          <button className="w-full py-2 bg-gray-50 text-black font-bold rounded-lg hover:bg-gray-100 transition">Generate Report</button>
        </div>

        {/* Attendance Reports */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Attendance Reports</h3>
              <p className="text-sm font-medium text-gray-500">School-wide attendance and tardiness.</p>
            </div>
          </div>
          <button className="w-full py-2 bg-gray-50 text-slate-600 font-bold rounded-lg hover:bg-gray-100 transition">Generate Report</button>
        </div>

        {/* Enrollment Reports */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Enrollment Reports</h3>
              <p className="text-sm font-medium text-gray-500">Demographics, new student stats.</p>
            </div>
          </div>
          <button className="w-full py-2 bg-gray-50 text-gray-600 font-bold rounded-lg hover:bg-gray-100 transition">Generate Report</button>
        </div>

        {/* Financial Summaries (READ-ONLY) */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Financial Summaries</h3>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1 bg-gray-50 px-2 py-0.5 rounded-full">Read Only</span>
              <p className="text-sm font-medium text-gray-500 mt-1">High-level view of fee collections.</p>
            </div>
          </div>
          <button className="w-full py-2 bg-gray-50 text-gray-600 font-bold rounded-lg hover:bg-gray-100 transition">View Dashboard</button>
        </div>

      </div>
    </AdminLayout>
  );
}
