import { useState, useEffect, useContext } from 'react';
import axios from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import Navbar from './Navbar';
import { toast } from 'react-toastify';

import { useAppSelector } from '../store/hooks';

export default function AttendanceChecklist() {
  const user = useAppSelector((state) => state.auth.user);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    const fetchClassroomOptions = async () => {
      try {
        const endpoint = (user?.role === 'Admin' || user?.role === 'SuperAdmin') ? '/assignments' : '/assignments/me';
        const response = await axios.get(endpoint);
        const assignmentRows = response.data || [];
        const availableClasses = Array.from(
          new Map(
            assignmentRows
              .map((assignment) => assignment.class)
              .filter(Boolean)
              .map((klass) => [klass._id, klass]),
          ).values(),
        );
        setClasses(availableClasses);

        if (availableClasses.length > 0) {
          const firstClassId = availableClasses[0]._id;
          setSelectedClassId(firstClassId);
        }
      } catch (err) {
        console.error('Failed to fetch classroom options:', err);
        toast.error(err.response?.data?.message || 'Failed to load classroom options');
      }
    };

    fetchClassroomOptions();
  }, []);

  useEffect(() => {
    const selectedClass = classes.find((klass) => klass._id === selectedClassId);
    const classStudents = selectedClass?.students || [];
    setStudents(classStudents);

    const initial = {};
    classStudents.forEach((student) => {
      initial[student._id] = attendance[student._id] || 'Present';
    });
    setAttendance(initial);
  }, [classes, selectedClassId]);

  const selectedClass = classes.find((klass) => klass._id === selectedClassId);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedClassId) {
      toast.error('Please select a class first');
      return;
    }

    const records = Object.keys(attendance).map(studentId => ({
      student: studentId,
      status: attendance[studentId]
    }));
    
    try {
      await axios.post('/classroom/attendance', {
        classId: selectedClassId,
        date,
        records,
        teacherId: user._id || user.id
      });
      toast.success('Attendance saved successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save attendance');
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-10">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-4xl border border-white/50 bg-white/75 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 border-b border-slate-200 pb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Classroom</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Attendance Checklist</h2>
          </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Class</label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">Select a class</option>
              {classes.map((klass) => (
                <option key={klass._id} value={klass._id}>
                  {klass.name} {klass.subject ? `- ${klass.subject}` : ''}
                </option>
              ))}
            </select>
            {selectedClass && (
              <p className="mt-2 text-sm text-slate-500">
                Showing students for <span className="font-semibold text-slate-700">{selectedClass.name}</span>.
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Record Date</label>
            <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:w-auto" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="mb-6 min-w-170 w-full table-auto border-collapse overflow-hidden rounded-2xl border border-slate-200 text-sm sm:text-base">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                  <th className="border border-slate-200 p-3">Student Name</th>
                  <th className="border border-slate-200 p-3">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {students.map(s => (
                  <tr key={s._id} className="transition hover:bg-slate-50">
                    <td className="border border-slate-200 p-3 font-medium text-slate-800">{s.user?.name || 'Unknown'} - {s.studentId}</td>
                    <td className="border border-slate-200 p-3">
                      <select 
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                        value={attendance[s._id]} 
                        onChange={e => setAttendance({...attendance, [s._id]: e.target.value})}
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Late">Late</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="submit" className="rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5">Save Attendance</button>
        </form>
        </div>
      </div>
    </div>
  );
}

