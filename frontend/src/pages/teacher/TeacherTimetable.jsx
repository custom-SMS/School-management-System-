import { useEffect, useMemo, useState } from 'react';
import axios from '../../api/axios';
import TeacherLayout from '../../components/TeacherLayout';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

// Pick a swatch colour by grade number for the block.
const gradeTone = (name) => {
  const n = Number(String(name || '').match(/\d+/)?.[0]) || 0;
  if (n <= 10) return { bar: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' };
  if (n === 11) return { bar: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' };
  return { bar: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' };
};

const toHourKey = (t) => String(t || '').slice(0, 2) + ':00';

export default function TeacherTimetable() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(null);

  useEffect(() => {
    axios
      .get('/timetables/teacher/me')
      .then((r) => {
        setSlots(r.data?.timetable || []);
        setAcademicYear(r.data?.academicYear || null);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, []);

  // Index slots by "Day|HH:00".
  const grid = useMemo(() => {
    const map = {};
    slots.forEach((s) => {
      map[`${s.dayOfWeek}|${toHourKey(s.startTime)}`] = s;
    });
    return map;
  }, [slots]);

  const totalHours = slots.length;
  const sections = new Set(slots.map((s) => s.class?.name)).size;
  const studentsImpacted = slots.reduce((sum, s) => sum + (s.class?.students?.length || 0), 0);

  return (
    <TeacherLayout searchPlaceholder="Search schedule...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Weekly Timetable</h1>
          <p className="text-sm text-slate-500">{academicYear?.name ? `Academic Year ${academicYear.name}` : 'Current academic year'}</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12v6H6V2zM4 9h16a2 2 0 0 1 2 2v7h-4v4H6v-4H2v-7a2 2 0 0 1 2-2zm4 9v3h8v-5H8v2z" /></svg>
          Print Schedule
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-slate-400">Loading timetable…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr>
                  <th className="w-20 border-b border-slate-100 p-2"></th>
                  {DAYS.map((d) => (
                    <th key={d} className="border-b border-slate-100 p-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((h) => (
                  <tr key={h}>
                    <td className="border-r border-slate-100 p-2 align-top text-xs font-semibold text-slate-400">{h}</td>
                    {DAYS.map((d) => {
                      const slot = grid[`${d}|${h}`];
                      if (h === '12:00') {
                        return <td key={d} className="border border-slate-50 p-1"><div className="rounded-md bg-slate-50 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-300">Lunch</div></td>;
                      }
                      if (!slot) return <td key={d} className="border border-slate-50 p-1 h-16"></td>;
                      const tone = gradeTone(slot.class?.name);
                      return (
                        <td key={d} className="border border-slate-50 p-1 align-top">
                          <div className={`flex h-full gap-2 rounded-lg ${tone.bg} p-2`}>
                            <span className={`w-1 rounded-full ${tone.bar}`} />
                            <div className="min-w-0">
                              <div className={`truncate text-[10px] font-bold uppercase ${tone.text}`}>{slot.subject?.name || 'Class'}</div>
                              <div className="truncate text-sm font-bold text-slate-900">{slot.class?.name}</div>
                              {slot.room && <div className="truncate text-xs text-slate-400">Room {slot.room}</div>}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend + summary */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Color Code by Grade</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-500" /> Grade 9–10 Classes</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500" /> Grade 11 Classes</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Grade 12 Classes</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-400">Total Slots</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{totalHours}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-400">Total Sections</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{sections}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-400">Students Impacted</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{studentsImpacted}</div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
