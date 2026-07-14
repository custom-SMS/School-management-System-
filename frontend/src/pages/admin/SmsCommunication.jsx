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

export default function SmsCommunication() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [smsMessage, setSmsMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const studentsRes = await axios.get('/students');
      const payload = studentsRes.data;
      const allStudents = Array.isArray(payload) ? payload : (payload?.students || []);
      // Filter out students whose parents don't have phone numbers
      const studentsWithPhones = allStudents.filter(student => {
        const guardians = student.guardians || [];
        return guardians.some(g => g.phone);
      });
      setStudents(studentsWithPhones);
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
      const haystacks = [student.user?.name, student.studentId, student.grade, guardian?.phone, guardian?.fullName]
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

  const pageIds = pagedStudents.map((s) => s.id); // The backend uses id (string uuid) for student
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

  const handleSendSms = async () => {
    if (selectedIds.size === 0) {
      toast.warn('Please select at least one student.');
      return;
    }
    if (!smsMessage.trim()) {
      toast.warn('Please enter a message.');
      return;
    }

    const { isConfirmed } = await showConfirmDialog({
      title: 'Send SMS?',
      text: `Are you sure you want to send this SMS to ${selectedIds.size} parent(s)? This action cannot be undone.`,
      icon: 'warning'
    });

    if (!isConfirmed) return;

    setSending(true);
    try {
      const res = await axios.post('/notifications/sms/parents', {
        studentIds: Array.from(selectedIds),
        message: smsMessage
      });
      
      toast.success(res.data.message || 'SMS processing complete.');
      setSmsMessage('');
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send SMS.');
    } finally {
      setSending(false);
    }
  };

  const startIndex = filteredStudents.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * PAGE_SIZE, filteredStudents.length);

  return (
    <AdminLayout pageTitle="SMS Communication">
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <span className="cursor-pointer hover:text-gray-900">Communications</span>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
        <span className="font-semibold text-gray-900">Parent SMS</span>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Direct SMS to Parents</h2>
        <p className="text-sm text-gray-500">Send direct mobile SMS to parents. (Note: standard SMS rates apply).</p>
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
                        placeholder="Search by student name, ID, or phone..."
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
                                <th className="px-4 py-3">Parent Phone</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && <tr><td colSpan={4} className="py-6 text-center text-gray-500">Loading...</td></tr>}
                            {!loading && filteredStudents.length === 0 && (
                                <tr><td colSpan={4} className="py-6 text-center text-gray-500">No students found with parent phone numbers.</td></tr>
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
                                        <td className="px-4 py-3 text-gray-600">{guardian?.phone || 'N/A'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
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
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sticky top-24">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                    Compose Message
                </h3>
                
                <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Message Text</label>
                    <textarea
                        value={smsMessage}
                        onChange={(e) => setSmsMessage(e.target.value)}
                        placeholder="Write your SMS here..."
                        className="w-full h-40 rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                    ></textarea>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                        <span>Characters: <span className={`font-bold ${smsMessage.length > 160 ? 'text-red-500' : 'text-gray-700'}`}>{smsMessage.length}</span></span>
                        {smsMessage.length > 160 && <span className="text-red-500">Will be sent as {Math.ceil(smsMessage.length/160)} messages</span>}
                    </div>
                </div>

                <button
                    onClick={handleSendSms}
                    disabled={sending || selectedIds.size === 0 || !smsMessage.trim()}
                    className="w-full flex justify-center items-center gap-2 rounded-xl bg-black py-3 px-4 text-sm font-bold text-white shadow-md transition-transform active:scale-[0.98] hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                    {sending ? (
                        <>
                            <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending...
                        </>
                    ) : (
                        <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                            Send SMS to {selectedIds.size} Parent(s)
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>
    </AdminLayout>
  );
}
