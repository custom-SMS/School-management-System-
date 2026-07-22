import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import ParentLayout from '../../components/ParentLayout';
import { useParentChildren } from '../../hooks/useParentChildren';

export default function ParentNotifications() {
  const { children, childId, setChildId, loading: loadingChildren } = useParentChildren();
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!childId) {
      setTeachers([]);
      return;
    }
    setLoadingTeachers(true);
    axios.get(`/notifications/teachers-for-student`, { params: { studentId: childId } })
      .then(res => {
        setTeachers(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        console.error(err);
        setTeachers([]);
      })
      .finally(() => {
        setLoadingTeachers(false);
      });
  }, [childId]);

  const toggleTeacher = (id) => {
    if (!id) return;
    setSelectedTeachers((cur) => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!childId) return toast.error('Select a child.');
    if (!message.trim()) return toast.error('Message is required.');
    setSending(true);
    try {
      const payload = { studentId: childId, teacherIds: selectedTeachers, title, message };
      const res = await axios.post('/notifications/to-teachers', payload);
      toast.success(res.data?.message || 'Notification sent to teacher(s).');
      setTitle('');
      setMessage('');
      setSelectedTeachers([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const safeChildren = Array.isArray(children) ? children : [];
  const safeTeachers = Array.isArray(teachers) ? teachers : [];

  return (
    <ParentLayout kids={safeChildren} childId={childId} onSelectChild={setChildId}>
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Message Teachers</h2>
        <p className="text-sm font-medium text-slate-500">Send a private message to the teachers assigned to your child.</p>
      </div>

      {loadingChildren ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 font-medium">
          Loading children information…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <form onSubmit={handleSend} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Child</label>
                <select value={childId} onChange={(e) => setChildId(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium">
                  {safeChildren.length === 0 && <option value="">No linked children</option>}
                  {safeChildren.map((k) => {
                    const id = k?.profile?._id || k?.profile?.id || k?.id;
                    const name = k?.profile?.user?.name || k?.name || 'Child';
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Message Subject / Title" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Message</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message here..." rows={6} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />
              </div>

              <button disabled={sending || !childId} type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
                {sending ? 'Sending…' : 'Send to Teacher(s)'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-3">Assigned Teachers</h3>
              {loadingTeachers ? (
                <div className="py-8 text-center text-sm text-slate-400">Loading assigned teachers…</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {safeTeachers.length === 0 ? (
                    <div className="col-span-2 text-sm text-slate-400 py-6 text-center">No teachers found for this child.</div>
                  ) : safeTeachers.map((t) => {
                    const teacherUserId = t?.user?.id || t?.user?._id || t?.id;
                    const isSelected = selectedTeachers.includes(teacherUserId);
                    return (
                      <label key={t.id || teacherUserId} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${isSelected ? 'bg-slate-100 border-slate-400' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleTeacher(teacherUserId)} className="h-4 w-4 rounded border-slate-300" />
                        <div>
                          <div className="font-bold text-slate-900">{t?.user?.name || t?.user?.email || 'Teacher'}</div>
                          <div className="text-xs text-slate-500">{t?.role || t?.user?.email || ''}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ParentLayout>
  );
}
