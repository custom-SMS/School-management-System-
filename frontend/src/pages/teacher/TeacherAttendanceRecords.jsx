import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import TeacherLayout from '../../components/TeacherLayout';

const STATUS_STYLES = {
  P: 'bg-emerald-50 text-emerald-700',
  A: 'bg-rose-50 text-rose-700',
  L: 'bg-amber-50 text-amber-700',
  '': 'bg-slate-50 text-slate-400',
};

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthRange(monthValue) {
  if (!monthValue || !monthValue.includes('-')) {
    return { startDate: '', endDate: '' };
  }

  const [year, month] = monthValue.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    startDate: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    endDate: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
  };
}

function formatMonthLabel(monthValue) {
  if (!monthValue) return 'Selected month';
  const [year, month] = monthValue.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function TeacherAttendanceRecords() {
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClassId = searchParams.get('classId') || '';
  const [selectedClassId, setSelectedClassId] = useState(queryClassId);
  const [selectedMonth, setSelectedMonth] = useState(searchParams.get('month') || getCurrentMonthValue());

  const [classes, setClasses] = useState([]);
  const [register, setRegister] = useState(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedClassId(queryClassId);
  }, [queryClassId]);

  useEffect(() => {
    const endpoint = user?.role === 'Admin' ? '/assignments' : '/assignments/me';

    setLoadingClasses(true);
    setError('');

    axios
      .get(endpoint)
      .then((res) => {
        const list = Array.from(
          new Map(
            (res.data || [])
              .map((assignment) => assignment.class)
              .filter(Boolean)
              .map((classItem) => [classItem._id, classItem]),
          ).values(),
        );

        setClasses(list);

        if (!queryClassId && list.length > 0) {
          setSelectedClassId(list[0]._id);
        }
      })
      .catch((err) => {
        const message = err.response?.data?.message || 'Failed to load classes';
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoadingClasses(false));
  }, [user, queryClassId]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    if (selectedClassId) nextParams.set('classId', selectedClassId);
    else nextParams.delete('classId');

    if (selectedMonth) nextParams.set('month', selectedMonth);
    else nextParams.delete('month');

    const current = searchParams.toString();
    const next = nextParams.toString();

    if (current !== next) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [selectedClassId, selectedMonth, searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedClassId || !selectedMonth) {
      setRegister(null);
      return;
    }

    const { startDate, endDate } = getMonthRange(selectedMonth);

    if (!startDate || !endDate) {
      setRegister(null);
      return;
    }

    setLoadingRegister(true);
    setError('');

    axios
      .get('/classroom/attendance/register', {
        params: {
          classId: selectedClassId,
          startDate,
          endDate,
        },
      })
      .then((res) => {
        setRegister(res.data || null);
      })
      .catch((err) => {
        const message = err.response?.data?.message || 'Failed to load attendance register';
        setRegister(null);
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoadingRegister(false));
  }, [selectedClassId, selectedMonth]);

  const selectedClass = useMemo(
    () => classes.find((item) => item._id === selectedClassId),
    [classes, selectedClassId],
  );

  const dates = register?.dates || [];
  const students = register?.students || [];

  const totals = useMemo(() => {
    return students.reduce(
      (acc, student) => {
        acc.present += student.totals?.present || 0;
        acc.absent += student.totals?.absent || 0;
        acc.late += student.totals?.late || 0;
        return acc;
      },
      { present: 0, absent: 0, late: 0 },
    );
  }, [students]);

  return (
    <TeacherLayout searchPlaceholder="Search attendance records...">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Attendance Records</h1>
          <p className="text-sm text-slate-500">
            Monthly attendance spreadsheet for your assigned students.
          </p>
        </div>
        <Link
          to={selectedClassId ? `/teacher/attendance?classId=${selectedClassId}` : '/teacher/attendance'}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Back to Attendance
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-xs font-semibold uppercase text-slate-400">Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="mt-2 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="">Select class</option>
            {classes.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
                {item.subject ? ` - ${item.subject}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-xs font-semibold uppercase text-slate-400">Month</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="mt-2 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Template</div>
          <div className="mt-2 text-lg font-black text-slate-900">{formatMonthLabel(selectedMonth)}</div>
          <div className="mt-1 text-sm text-slate-500">
            {selectedClass
              ? `${selectedClass.name}${selectedClass.subject ? ` - ${selectedClass.subject}` : ''}`
              : 'Choose a class to view attendance'}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Students</div>
          <div className="mt-1 text-3xl font-black text-slate-900">{students.length}</div>
        </div>
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Present</div>
          <div className="mt-1 text-3xl font-black text-emerald-600">{totals.present}</div>
        </div>
        <div className="rounded-2xl border-l-4 border-rose-500 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Absent</div>
          <div className="mt-1 text-3xl font-black text-rose-600">{totals.absent}</div>
        </div>
        <div className="rounded-2xl border-l-4 border-amber-500 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Late</div>
          <div className="mt-1 text-3xl font-black text-amber-600">{totals.late}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Monthly Attendance Sheet</h2>
            <p className="text-sm text-slate-500">Spreadsheet view by month with daily attendance marks.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold uppercase">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">P Present</span>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">A Absent</span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">L Late</span>
          </div>
        </div>

        {loadingClasses || loadingRegister ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading attendance register...</div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="font-semibold text-rose-600">{error}</p>
          </div>
        ) : !selectedClassId ? (
          <div className="py-12 text-center text-sm text-slate-400">Select a class to load the attendance template.</div>
        ) : !register ? (
          <div className="py-12 text-center text-sm text-slate-400">No attendance register available for this selection.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <th className="sticky left-0 z-20 rounded-l-lg border-b border-slate-200 bg-slate-50 px-4 py-3 text-left font-semibold">
                    Student Name
                  </th>
                  {dates.map((column) => (
                    <th
                      key={column.date}
                      className="min-w-[58px] border-b border-slate-200 px-2 py-3 text-center font-semibold"
                    >
                      <div>{column.day}</div>
                      <div className="mt-1 text-[10px] normal-case text-slate-400">{column.weekday}</div>
                    </th>
                  ))}
                  <th className="border-b border-slate-200 px-4 py-3 text-center font-semibold text-emerald-700">P</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center font-semibold text-rose-700">A</th>
                  <th className="rounded-r-lg border-b border-slate-200 px-4 py-3 text-center font-semibold text-amber-700">L</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={dates.length + 4} className="px-4 py-10 text-center text-sm text-slate-400">
                      No students found in this class.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="odd:bg-white even:bg-slate-50/50">
                      <td className="sticky left-0 z-10 border-b border-slate-100 bg-inherit px-4 py-3">
                        <div className="font-semibold text-slate-900">{student.name}</div>
                        <div className="mt-1 font-mono text-xs text-slate-500">{student.studentId}</div>
                      </td>
                      {dates.map((column) => {
                        const mark = student.marksByDate?.[column.date] || '';
                        return (
                          <td key={`${student.id}-${column.date}`} className="border-b border-slate-100 px-2 py-3 text-center">
                            <span
                              className={`inline-flex min-h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-bold ${STATUS_STYLES[mark] || STATUS_STYLES['']}`}
                            >
                              {mark || '-'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="border-b border-slate-100 px-4 py-3 text-center font-bold text-emerald-700">
                        {student.totals?.present || 0}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-center font-bold text-rose-700">
                        {student.totals?.absent || 0}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-center font-bold text-amber-700">
                        {student.totals?.late || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}