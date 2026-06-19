import AdminLayout from '../../components/AdminLayout';

export default function Sections() {
  return (
    <AdminLayout pageTitle="Sections Management">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Manage Sections</h2>
            <p className="text-sm font-medium text-gray-500">View and manage class sections (e.g. A, B, C).</p>
          </div>
          <button className="px-4 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition shadow-sm">
            + New Section
          </button>
        </div>
        <div className="p-12 text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="font-semibold text-gray-600 text-lg">No sections created yet.</p>
          <p className="text-sm mt-1">Select a class to add sections to it.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
