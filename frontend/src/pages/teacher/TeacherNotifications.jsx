import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import TeacherLayout from '../../components/TeacherLayout';

export default function TeacherNotifications() {
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [recipient, setRecipient] = useState('parents'); // parents | students | both
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    axios.get('/assignments/me').then(res => {
      setAssignments(res.data || []);
      // derive students
      const studentsList = [];
      (res.data || []).forEach(a => {
        (a.class?.students || []).forEach(s => studentsList.push(s));
      });
      const unique = Array.from(new Map((studentsList || []).map(s => [s.id || s._id, s])).values());
      setStudents(unique);
    }).catch(err => {
      console.error('Failed to load assignments', err);
      setError(true);
    });
  }, []);

  const toggleStudent = (id) => {
    setSelectedStudentIds((cur) => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) return toast.error('Select at least one student.');
    if (!message.trim()) return toast.error('Message is required.');
    setSending(true);
    try {
      const payload = { studentIds: selectedStudentIds, title, message };
      let url = '/notifications/parents';
      if (recipient === 'students') url = '/notifications/students';
      if (recipient === 'both') url = '/notifications/both';
      const res = await axios.post(url, payload);
      toast.success(res.data?.message || 'Notification sent.');
      setTitle(''); setMessage(''); setSelectedStudentIds([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send notification.');
    } finally { setSending(false); }
  };

  return (
    <TeacherLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Class Notifications</h2>
        <p className="text-sm font-medium text-slate-500">Send messages to your assigned students or their parents.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <form onSubmit={handleSend} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Compose</h3>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500">Recipients</label>
              <select value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <option value="parents">Parents</option>
                <option value="students">Students</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />
            </div>

            <button disabled={sending} type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">{sending ? 'Sending…' : 'Send'}</button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Assigned Students</h3>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {error ? (
                <div className="col-span-2 text-sm font-semibold text-rose-500">Failed to load assigned students.</div>
              ) : students.length === 0 ? (
                <div className="col-span-2 text-sm text-slate-400">No assigned students found.</div>
              ) : students.map((s) => (
                <label key={s.id || s._id} className={`flex items-center gap-3 rounded-lg border p-3 ${selectedStudentIds.includes(s.id || s._id) ? 'bg-slate-100' : ''}`}>
                  <input type="checkbox" checked={selectedStudentIds.includes(s.id || s._id)} onChange={() => toggleStudent(s.id || s._id)} />
                  <div>
                    <div className="font-bold text-slate-900">{s.user?.name || s.name || (s.firstName + ' ' + s.lastName)}</div>
                    <div className="text-xs text-slate-500">{s.grade || ''} {s.section || ''}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
