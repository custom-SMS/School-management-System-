import { useState, useEffect, useContext } from 'react';
import axios from '../api/axios';
import AdminLayout from '../components/AdminLayout';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function Timetables() {
  const { user } = useContext(AuthContext);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  
  // Filter states
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  
  // Timetable records
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states (Admin only)
  const [formClass, setFormClass] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formDay, setFormDay] = useState('Monday');
  const [formStartTime, setFormStartTime] = useState('08:30');
  const [formEndTime, setFormEndTime] = useState('09:30');
  const [formRoom, setFormRoom] = useState('');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Parent state
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');

  // Fetch initial data
  useEffect(() => {
    axios.get('/academic-years').then(res => {
      setAcademicYears(res.data || []);
      const active = res.data?.find(y => y.isActive);
      if (active) setSelectedYear(active.id);
    }).catch(err => console.error(err));

    axios.get('/students').then(res => {
      // If parent, fetch their children
      if (user?.role === 'Parent') {
        axios.get('/stats/parent/me').then(parentRes => {
          const kids = parentRes.data?.children || [];
          setChildren(kids);
          if (kids.length > 0) setSelectedChildId(kids[0].profile._id);
        });
      }
    }).catch(err => console.error(err));

    if (user?.role === 'Admin' || user?.role === 'SuperAdmin') {
      // Fetch subjects
      axios.get('/subjects').then(res => setSubjects(res.data || [])).catch(err => console.error(err));
      // Fetch assignments to get classes
      axios.get('/assignments').then(res => {
        const uniqueClasses = Array.from(
          new Map(
            (res.data || [])
              .map((assignment) => assignment.class)
              .filter(Boolean)
              .map((klass) => [klass._id, klass]),
          ).values(),
        );
        setClasses(uniqueClasses);
        if (uniqueClasses.length > 0) {
          setSelectedClass(uniqueClasses[0]._id);
          setFormClass(uniqueClasses[0]._id);
        }
      }).catch(err => console.error(err));
    }
  }, [user]);

  // Load sections when formClass changes
  useEffect(() => {
    if (formClass) {
      axios.get(`/classroom/sections/${formClass}`).then(res => {
        setSections(res.data || []);
        if (res.data && res.data.length > 0) {
          setFormSection(res.data[0].id);
        } else {
          setFormSection('');
        }
      }).catch(err => console.error(err));
    }
  }, [formClass]);

  // Fetch timetable slots based on user role
  const fetchTimetables = async () => {
    setLoading(true);
    try {
      if (user?.role === 'Student') {
        const res = await axios.get('/timetables/student/me');
        setTimetableSlots(res.data?.timetable || []);
      } else if (user?.role === 'Teacher') {
        const res = await axios.get('/timetables/teacher/me');
        setTimetableSlots(res.data?.timetable || []);
      } else if (user?.role === 'Parent') {
        if (selectedChildId) {
          const res = await axios.get(`/timetables/student/me?childStudentId=${selectedChildId}`);
          setTimetableSlots(res.data?.timetable || []);
        }
      } else if (selectedClass && selectedYear) {
        // Admin view
        const sectionQuery = selectedSection ? `?sectionId=${selectedSection}` : '';
        const res = await axios.get(`/timetables/class/${selectedClass}/${selectedYear}${sectionQuery}`);
        setTimetableSlots(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load timetable schedules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetables();
  }, [selectedClass, selectedYear, selectedSection, selectedChildId]);

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (!formClass || !formSubject || !formDay || !formStartTime || !formEndTime || !selectedYear) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      await axios.post('/timetables', {
        academicYearId: selectedYear,
        classId: formClass,
        sectionId: formSection || null,
        subjectId: formSubject,
        dayOfWeek: formDay,
        startTime: formStartTime,
        endTime: formEndTime,
        room: formRoom || null
      });
      toast.success('Timetable slot scheduled successfully!');
      fetchTimetables();
      // Clear optional room
      setFormRoom('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error scheduling timetable slot.');
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm('Are you sure you want to remove this schedule slot?')) return;
    try {
      await axios.delete(`/timetables/${id}`);
      toast.success('Schedule slot deleted.');
      fetchTimetables();
    } catch (err) {
      toast.error('Failed to delete slot.');
    }
  };

  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  return (
    <AdminLayout
      pageTitle="School Timetable"
      pageSubtitle="Track weekly classes, subjects, rooms, and schedules."
      searchPlaceholder="Search schedules, classes, sections, subjects, or rooms..."
    >
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Academic Years</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{academicYears.length}</div>
            <p className="mt-2 text-sm text-slate-500">Available year windows for timetable planning and publishing.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Classes Loaded</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{classes.length}</div>
            <p className="mt-2 text-sm text-slate-500">Classes available for filtering and schedule assignment.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Visible Slots</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{timetableSlots.length}</div>
            <p className="mt-2 text-sm text-slate-500">Current timetable entries shown in the weekly calendar view.</p>
          </div>
        </div>

        {/* Dashboard filter / selector */}
        <div className="mb-8 rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap gap-4 items-center">
            {isAdmin && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-600">Academic Year:</label>
                  <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none">
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.year} {y.isActive ? '(Active)' : ''}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-600">Select Class:</label>
                  <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none">
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name} ({c.subject})</option>)}
                  </select>
                </div>
              </>
            )}

            {user?.role === 'Parent' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-600">Select Child:</label>
                <select value={selectedChildId} onChange={e => setSelectedChildId(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none">
                  {children.map(kid => <option key={kid.profile._id} value={kid.profile._id}>{kid.profile.user?.name}</option>)}
                </select>
              </div>
            )}

            {!isAdmin && (
              <div className="text-sm text-slate-500 font-semibold">
                Logged in as <span className="text-slate-900">{user?.name} ({user?.role})</span>. Showing personal schedule.
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Timetable Weekly Grid View */}
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Weekly Calendar Schedule</h3>
            
            {loading ? (
              <div className="py-12 text-center text-slate-500">Loading schedules…</div>
            ) : (
              <div className="space-y-6">
                {daysOfWeek.map(day => {
                  const daySlots = timetableSlots.filter(s => s.dayOfWeek === day);
                  return (
                    <div key={day} className="border-b border-slate-100 pb-4 last:border-none last:pb-0">
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">{day}</h4>
                      {daySlots.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {daySlots.map(slot => (
                            <div key={slot.id} className="relative rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-slate-100/80">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <span className="font-bold text-slate-900">{slot.subject?.name || 'Subject'}</span>
                                <span className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-semibold text-blue-700">
                                  {slot.startTime} - {slot.endTime}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 space-y-1">
                                <div>Class: <span className="font-semibold text-slate-700">{slot.class?.name}</span></div>
                                {slot.section && <div>Section: <span className="font-semibold text-slate-700">{slot.section?.name}</span></div>}
                                {slot.room && <div>Room: <span className="font-semibold text-slate-700">{slot.room}</span></div>}
                              </div>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 p-1 font-semibold text-xs"
                                >
                                  × Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No classes scheduled for {day}.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin Scheduler Form */}
          {isAdmin && (
            <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] h-fit">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Schedule Class Slot</h3>
              <form onSubmit={handleCreateSlot} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Class</label>
                  <select value={formClass} onChange={e => setFormClass(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none">
                    {classes.map(c => <option key={`form-c-${c._id}`} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Section (Optional)</label>
                  <select value={formSection} onChange={e => setFormSection(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none">
                    <option value="">No Section</option>
                    {sections.map(s => <option key={`form-s-${s.id}`} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Subject</label>
                  <select value={formSubject} onChange={e => setFormSubject(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none">
                    <option value="">-- Choose Subject --</option>
                    {subjects.map(sub => <option key={`form-sub-${sub.id}`} value={sub.id}>{sub.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Day of Week</label>
                  <select value={formDay} onChange={e => setFormDay(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none">
                    {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Start Time</label>
                    <input type="text" placeholder="e.g. 08:30" required value={formStartTime} onChange={e => setFormStartTime(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">End Time</label>
                    <input type="text" placeholder="e.g. 09:30" required value={formEndTime} onChange={e => setFormEndTime(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Room / Location</label>
                  <input type="text" placeholder="e.g. Room 204B" value={formRoom} onChange={e => setFormRoom(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
                </div>

                <button type="submit" className="w-full rounded-2xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition">
                  Schedule Slot
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
