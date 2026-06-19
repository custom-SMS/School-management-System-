import { useState, useEffect, useContext } from 'react';
import axios from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import AdminLayout from './AdminLayout';
import { toast } from 'react-toastify';

export default function AttendanceChecklist() {
  const { user } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchClassroomOptions = async () => {
      try {
        const endpoint = user?.role === 'Admin' ? '/assignments' : '/assignments/me';
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
    <AdminLayout
      pageTitle="System Management"
      pageSubtitle="Review classes and record attendance with the current admin workspace."
      searchPlaceholder="Search classes, students, or attendance records..."
    >
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Classroom operations</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Attendance Checklist</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Select a class, confirm the date, and capture attendance using the updated admin layout.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Classes Loaded</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{classes.length}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Students Visible</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{students.length}</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
              <div>
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

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Record Date</label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-170 w-full table-auto border-collapse text-sm sm:text-base">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                    <th className="border-b border-slate-200 p-4">Student Name</th>
                    <th className="border-b border-slate-200 p-4">Student ID</th>
                    <th className="border-b border-slate-200 p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {students.length > 0 ? students.map(s => (
                    <tr key={s._id} className="transition hover:bg-slate-50">
                      <td className="border-b border-slate-100 p-4 font-medium text-slate-800">{s.user?.name || 'Unknown'}</td>
                      <td className="border-b border-slate-100 p-4 text-slate-500">{s.studentId}</td>
                      <td className="border-b border-slate-100 p-4">
                        <select
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                          value={attendance[s._id]}
                          onChange={e => setAttendance({ ...attendance, [s._id]: e.target.value })}
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Late">Late</option>
                        </select>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" className="p-8 text-center text-slate-500">
                        Select a class to begin recording attendance.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                Attendance is saved for the selected class and date using the current teacher/admin identity.
              </p>
              <button type="submit" className="rounded-2xl bg-linear-to-r from-blue-600 to-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5">
                Save Attendance
              </button>
            </div>
          </form>
        </div>
      </section>
    </AdminLayout>
  );
}
