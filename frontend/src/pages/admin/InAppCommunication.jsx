import { useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { showConfirmDialog } from '../../utils/sweetAlert';
import axios from '../../api/axios';
import AdminLayout from '../../components/AdminLayout';

const PAGE_SIZE = 10;

const normalizeLabel = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const getPrimaryGuardian = (student) => {
  const guardians = Array.isArray(student.guardians) && student.guardians.length > 0 ? student.guardians : null;
  if (guardians) return guardians[0];

  const contacts = Array.isArray(student.guardianContacts) ? student.guardianContacts : [];
  const primary = contacts.find((c) => c.primary) || contacts[0];
  if (primary) return primary;
  
  return null;
};

export default function InAppCommunication() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  
  const [inAppTitle, setInAppTitle] = useState('');
  const [inAppMessage, setInAppMessage] = useState('');
  const [inAppTarget, setInAppTarget] = useState('both'); // 'both' | 'parents' | 'students'
  const [sendingInApp, setSendingInApp] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const studentsRes = await axios.get('/students');
      const payload = studentsRes.data;
      const allStudents = Array.isArray(payload) ? payload : (payload?.students || []);
      setStudents(allStudents);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load student records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredStudents = useMemo(() => {
    const term = normalizeLabel(searchTerm);
    if (!term) return students;
    
    return students.filter((student) => {
      const guardian = getPrimaryGuardian(student);
      const haystacks = [student.user?.name, student.studentId, student.grade, guardian?.fullName]
        .map(normalizeLabel).join(' | ');
      return haystacks.includes(term);
    });
  }, [searchTerm, students]);

  useEffect(() => { setPage(1); }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedStudents = useMemo(
    () => filteredStudents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredStudents, currentPage]
  );

  const pageIds = pagedStudents.map((s) => s.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      const next = new Set();
      filteredStudents.forEach(s => next.add(s.id));
      setSelectedIds(next);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSendInApp = async () => {
    if (selectedIds.size === 0) {
      toast.warn('Please select at least one student.');
      return;
    }
    if (!inAppMessage.trim()) {
      toast.warn('Please enter a message.');
      return;
    }

    const endpoint = inAppTarget === 'both' ? '/notifications/both' : (inAppTarget === 'parents' ? '/notifications/parents' : '/notifications/students');
    const targetLabel = inAppTarget === 'both' ? 'Parents & Students' : (inAppTarget === 'parents' ? 'Parents' : 'Students');

    const { isConfirmed } = await showConfirmDialog({
      title: 'Send In-App Notification?',
      text: `Send in-app message to ${targetLabel} of ${selectedIds.size} selected student(s)?`,
      icon: 'question'
    });

    if (!isConfirmed) return;

    setSendingInApp(true);
    try {
      const res = await axios.post(endpoint, {
        studentIds: Array.from(selectedIds),
        title: inAppTitle,
        message: inAppMessage
      });
      toast.success(res.data.message || 'Notification sent successfully.');
      setInAppTitle('');
      setInAppMessage('');
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send notification.');
    } finally {
      setSendingInApp(false);
    }
  };

  const startIndex = filteredStudents.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * PAGE_SIZE, filteredStudents.length);

  return (
    <AdminLayout pageTitle="In-App Communication">
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <span className="cursor-pointer hover:text-gray-900 font-medium">Communications</span>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
        <span className="font-semibold text-gray-900">In-App Notice</span>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Targeted In-App & Email Messages</h2>
        <p className="text-sm text-gray-500">Send in-app and email notifications to selected students, parents, or both.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Student Selection */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm h-full">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Select Recipients</h3>
              <div className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {selectedIds.size} Selected
              </div>
            </div>

            <div className="mb-4 relative flex items-center">
              <svg className="absolute left-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8" strokeWidth="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2"/></svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by student name, ID, or grade..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="mb-2 flex gap-3">
              <button onClick={toggleSelectAll} className="text-xs font-semibold text-gray-500 hover:text-black">
                {selectedIds.size === filteredStudents.length ? 'Deselect All' : 'Select All Filtered'}
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" className="rounded" checked={allPageSelected} onChange={toggleSelectAllOnPage} />
                    </th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">Guardian Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && <tr><td colSpan={4} className="py-6 text-center text-gray-500">Loading...</td></tr>}
                  {!loading && filteredStudents.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-gray-500">No student records found.</td></tr>
                  )}
                  {!loading && pagedStudents.map((student) => {
                    const guardian = getPrimaryGuardian(student);
                    return (
                      <tr key={student.id} className="hover:bg-blue-50/50 transition cursor-pointer" onClick={() => toggleSelect(student.id)}>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="rounded border-gray-300" checked={selectedIds.has(student.id)} onChange={() => toggleSelect(student.id)} />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{student.user?.name || student.studentId}</td>
                        <td className="px-4 py-3 text-gray-600">{student.grade}</td>
                        <td className="px-4 py-3 text-gray-600">{guardian?.fullName || guardian?.name || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!loading && filteredStudents.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Showing {startIndex} - {endIndex} of {filteredStudents.length}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                    &lt;
                  </button>
                  <span className="text-xs font-semibold py-1 px-2">{currentPage} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Message Composer */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sticky top-24 space-y-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              🔔 Compose In-App Notification
            </h3>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Target Recipient</label>
              <select
                value={inAppTarget}
                onChange={(e) => setInAppTarget(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="both">Parents & Students</option>
                <option value="parents">Parents Only</option>
                <option value="students">Students Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Title</label>
              <input
                type="text"
                value={inAppTitle}
                onChange={(e) => setInAppTitle(e.target.value)}
                placeholder="Title / Subject"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Message</label>
              <textarea
                value={inAppMessage}
                onChange={(e) => setInAppMessage(e.target.value)}
                placeholder="Write your in-app message..."
                rows={5}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
              />
            </div>

            <button
              onClick={handleSendInApp}
              disabled={sendingInApp || selectedIds.size === 0 || !inAppMessage.trim()}
              className="w-full rounded-xl bg-[#203e4f] py-3 px-4 text-sm font-bold text-white shadow-xs transition-transform active:scale-[0.98] hover:bg-[#172d3a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingInApp ? 'Sending…' : `Send In-App Notice to ${selectedIds.size} Student(s)`}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
