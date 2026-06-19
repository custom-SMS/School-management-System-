import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import AdminLayout from '../../components/AdminLayout';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/classroom/classes')
      .then(res => setClasses(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout pageTitle="Classes Management"><div className="p-4">Loading...</div></AdminLayout>;

  return (
    <AdminLayout pageTitle="Classes Management">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Manage Classes</h2>
            <p className="text-sm font-medium text-gray-500">View and manage all active classes.</p>
          </div>
          <button className="px-4 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition shadow-sm">
            + New Class
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Class Name</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Subject</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Teacher</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Sections</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {classes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-bold text-gray-900">{c.name}</td>
                  <td className="px-6 py-4">{c.subject}</td>
                  <td className="px-6 py-4 text-gray-500">{c.teacher?.user?.name || 'Unassigned'}</td>
                  <td className="px-6 py-4">{c.sections?.length || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-xs font-bold text-black hover:text-slate-900 bg-slate-100 px-3 py-1 rounded-md">Edit</button>
                  </td>
                </tr>
              ))}
              {classes.length === 0 && (
                <tr><td colSpan="5" className="p-4 text-center text-gray-500">No classes found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
