import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import ParentLayout from '../../components/ParentLayout';

export default function ParentNotifications() {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    axios.get('/stats/parent/me').then(res => {
      const kids = res.data?.children || [];
      setChildren(kids);
      if (kids.length > 0) setSelectedChildId(kids[0].profile._id);
    }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;
    axios.get(`/notifications/teachers-for-student`, { params: { studentId: selectedChildId } }).then(res => {
      setTeachers(res.data || []);
    }).catch(err => console.error(err));
  }, [selectedChildId]);

  const toggleTeacher = (id) => {
    setSelectedTeachers((cur) => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedChildId) return toast.error('Select a child.');
    if (!message.trim()) return toast.error('Message is required.');
    setSending(true);
    try {
      const payload = { studentId: selectedChildId, teacherIds: selectedTeachers, title, message };
      const res = await axios.post('/notifications/to-teachers', payload);
      toast.success(res.data?.message || 'Notification sent to teacher(s).');
      setTitle(''); setMessage(''); setSelectedTeachers([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message.');
    } finally { setSending(false); }
  };

  return (
    <ParentLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Message Teachers</h2>
        <p className="text-sm font-medium text-slate-500">Send a private message to the teachers assigned to your child.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <form onSubmit={handleSend} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500">Child</label>
              <select value={selectedChildId} onChange={(e) => setSelectedChildId(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                {children.length === 0 && <option value="">No linked children</option>}
                {children.map((k) => <option key={k.profile._id} value={k.profile._id}>{k.profile.user?.name || 'Child'}</option>)}
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

            <button disabled={sending} type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">{sending ? 'Sending…' : 'Send to Teacher(s)'}</button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Assigned Teachers</h3>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {teachers.length === 0 ? (
                <div className="text-sm text-slate-400">No teachers found for this child.</div>
              ) : teachers.map((t) => (
                <label key={t.id} className={`flex items-center gap-3 rounded-lg border p-3 ${selectedTeachers.includes(t.user?.id) ? 'bg-slate-100' : ''}`}>
                  <input type="checkbox" checked={selectedTeachers.includes(t.user?.id)} onChange={() => toggleTeacher(t.user?.id)} />
                  <div>
                    <div className="font-bold text-slate-900">{t.user?.name || t.user?.email || 'Teacher'}</div>
                    <div className="text-xs text-slate-500">{t.user?.email || ''}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ParentLayout>
  );
}
