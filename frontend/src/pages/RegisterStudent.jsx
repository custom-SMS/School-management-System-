import { useState, useEffect } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';

export default function RegisterStudent() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', grade: '' });
  const [gradeFees, setGradeFees] = useState([]);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const res = await axios.get('/students/grade-fee');
        setGradeFees(res.data);
      } catch (err) {}
    };
    fetchFees();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/students', formData);
      toast.success('Student registered successfully!');
      setFormData({ name: '', email: '', password: '', grade: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-4xl border border-white/50 bg-white/75 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="bg-slate-950 px-8 py-10 text-white sm:px-10 lg:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Registrar</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Create student accounts with one clean form.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Keep the workflow simple: create the profile, set the grade, and the system takes care of the rest.</p>

              <div className="mt-8 space-y-4">
                {gradeFees.slice(0, 3).map((gf) => (
                  <div key={gf._id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                    <span className="font-semibold text-white">Grade {gf.grade}</span>
                    <span className="ml-2 text-slate-300">• ETB {gf.amount}</span>
                  </div>
                ))}
                {gradeFees.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">No fee rules configured yet.</div>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-10 lg:p-12">
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Registration</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Register Student</h3>
                <p className="mt-2 text-sm text-slate-500">Add a student account and assign a class level.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                    <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10" type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
                    <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                    <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10" type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Target Grade</label>
                    <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10" required value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})}>
                      <option value="">Select Grade</option>
                      {gradeFees.map(gf => (
                        <option key={gf._id} value={gf.grade}>Grade {gf.grade} (ETB {gf.amount})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" className="inline-flex w-full items-center justify-center rounded-2xl bg-linear-to-r from-blue-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:from-blue-500 hover:to-violet-500">
                  Register Student
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
