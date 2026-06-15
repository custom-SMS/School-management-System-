import { useEffect, useState } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';

export default function Settings() {
  const [weights, setWeights] = useState({ quizWeight: 10, assignmentWeight: 20, midtermWeight: 30, finalWeight: 40 });
  const [savingWeights, setSavingWeights] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [unlockingId, setUnlockingId] = useState('');

  const fetchWeights = async () => {
    try {
      const res = await axios.get('/classroom/grading-structure');
      if (res.data) {
        setWeights({
          quizWeight: res.data.quizWeight,
          assignmentWeight: res.data.assignmentWeight,
          midtermWeight: res.data.midtermWeight,
          finalWeight: res.data.finalWeight,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await axios.get('/classroom/attendance');
      setSessions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWeights();
    fetchSessions();
  }, []);

  const total = Number(weights.quizWeight) + Number(weights.assignmentWeight) + Number(weights.midtermWeight) + Number(weights.finalWeight);

  const handleWeightChange = (field, value) => {
    setWeights((w) => ({ ...w, [field]: value === '' ? '' : Number(value) }));
  };

  const handleSaveWeights = async (e) => {
    e.preventDefault();
    if (total !== 100) {
      toast.error(`Weights must sum to 100%. Current total: ${total}%.`);
      return;
    }
    setSavingWeights(true);
    try {
      await axios.post('/classroom/grading-structure', {
        quizWeight: Number(weights.quizWeight),
        assignmentWeight: Number(weights.assignmentWeight),
        midtermWeight: Number(weights.midtermWeight),
        finalWeight: Number(weights.finalWeight),
      });
      toast.success('Grading structure updated.');
      fetchWeights();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update grading structure.');
    } finally {
      setSavingWeights(false);
    }
  };

  const handleUnlock = async (id) => {
    setUnlockingId(id);
    try {
      await axios.patch(`/classroom/attendance/${id}/unlock`);
      toast.success('Attendance session unlocked.');
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlock session.');
    } finally {
      setUnlockingId('');
    }
  };

  const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10';
  const fields = [
    { key: 'quizWeight', label: 'Quiz Weight (%)' },
    { key: 'assignmentWeight', label: 'Assignment Weight (%)' },
    { key: 'midtermWeight', label: 'Midterm Weight (%)' },
    { key: 'finalWeight', label: 'Final Weight (%)' },
  ];

  return (
    <div className="min-h-screen bg-transparent pb-10">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-4xl border border-white/50 bg-white/75 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-600">System</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Settings</h1>
          <p className="mt-2 text-sm text-slate-500">Configure grading weights and manage attendance record locks.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* Grading structure */}
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Grading Structure</h2>
            <p className="text-sm text-slate-500 mb-4">Each component is scored out of 100 and combined using these weights. They must sum to 100%.</p>
            <form onSubmit={handleSaveWeights} className="space-y-4">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">{f.label}</label>
                  <input type="number" min="0" max="100" required className={inputClass} value={weights[f.key]} onChange={(e) => handleWeightChange(f.key, e.target.value)} />
                </div>
              ))}
              <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${total === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                Total: {total}% {total === 100 ? '✓' : '(must equal 100%)'}
              </div>
              <button type="submit" disabled={savingWeights || total !== 100} className="w-full rounded-2xl bg-violet-600 py-3 font-semibold text-white hover:bg-violet-700 transition disabled:opacity-50">
                {savingWeights ? 'Saving…' : 'Save Grading Structure'}
              </button>
            </form>
          </div>

          {/* Attendance locks */}
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Attendance Locks</h2>
            <p className="text-sm text-slate-500 mb-4">Sessions older than 7 days are locked. Unlock to allow teachers to amend them.</p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-150 w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Records</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sessions.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.className}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(s.date).toLocaleDateString()} <span className="text-xs text-slate-400">({s.ageDays}d)</span></td>
                      <td className="px-4 py-3 text-slate-600">{s.recordCount}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${s.locked ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {s.locked ? 'Locked' : 'Editable'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          disabled={!s.locked || unlockingId === s._id}
                          onClick={() => handleUnlock(s._id)}
                          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                        >
                          {unlockingId === s._id ? 'Unlocking…' : 'Unlock'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No attendance sessions recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
