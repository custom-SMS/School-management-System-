import { useState, useEffect, useContext } from 'react';
import { showDangerConfirmDialog } from '../utils/sweetAlert';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
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
    const { isConfirmed } = await showDangerConfirmDialog({
      title: 'Remove schedule slot?',
      text: 'Are you sure you want to remove this schedule slot?',
      confirmButtonText: 'Remove',
    });
    if (!isConfirmed) return;
    try {
      await axios.delete(`/timetables/${id}`);
      toast.success('Schedule slot deleted.');
      fetchTimetables();
    } catch (err) {
      toast.error('Failed to delete slot.');
    }
  };

  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const inputClass = "w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-black focus:bg-white focus:ring-2 focus:ring-black/20";

  const content = (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">School Timetable</h2>
        <p className="text-sm font-medium text-slate-500">Track weekly classes, subjects, rooms, and schedules.</p>
      </div>

      {/* Dashboard filter / selector */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          {isAdmin && (
            <>
              <div className="flex flex-col gap-1.5 w-48">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Academic Year</label>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className={inputClass}>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.year} {y.isActive ? '(Active)' : ''}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 w-64">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Class</label>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className={inputClass}>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name} ({c.subject})</option>)}
                </select>
              </div>
            </>
          )}

          {user?.role === 'Parent' && (
            <div className="flex flex-col gap-1.5 w-64">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Child</label>
              <select value={selectedChildId} onChange={e => setSelectedChildId(e.target.value)} className={inputClass}>
                {children.map(kid => <option key={kid.profile._id} value={kid.profile._id}>{kid.profile.user?.name}</option>)}
              </select>
            </div>
          )}

          {!isAdmin && (
            <div className="text-sm text-slate-500 font-semibold bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100 flex items-center h-[42px]">
              Showing personal schedule for <span className="text-slate-900 ml-1 font-bold">{user?.name} ({user?.role})</span>.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Timetable Weekly Grid View */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Weekly Calendar Schedule</h3>
          
          {loading ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-500">Loading schedules…</div>
          ) : (
            <div className="space-y-6">
              {daysOfWeek.map(day => {
                const daySlots = timetableSlots.filter(s => s.dayOfWeek === day);
                return (
                  <div key={day} className="border-b border-slate-100 pb-4 last:border-none last:pb-0">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{day}</h4>
                    {daySlots.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {daySlots.map(slot => (
                          <div key={slot.id} className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <span className="font-bold text-slate-900 truncate">{slot.subject?.name || 'Subject'}</span>
                              <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-black border border-slate-200">
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
                                className="absolute top-2 right-2 text-red-500 hover:text-red-700 bg-white rounded p-1 font-semibold text-[10px] uppercase border border-white hover:border-red-100 transition"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-slate-400 italic bg-slate-50 py-3 px-4 rounded-lg border border-dashed border-slate-200">No classes scheduled for {day}.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Admin Scheduler Form */}
        {isAdmin && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-fit sticky top-24">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Schedule Class Slot</h3>
            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Select Class</label>
                <select value={formClass} onChange={e => setFormClass(e.target.value)} className={inputClass}>
                  {classes.map(c => <option key={`form-c-${c._id}`} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Select Section (Optional)</label>
                <select value={formSection} onChange={e => setFormSection(e.target.value)} className={inputClass}>
                  <option value="">No Section</option>
                  {sections.map(s => <option key={`form-s-${s.id}`} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Select Subject</label>
                <select value={formSubject} onChange={e => setFormSubject(e.target.value)} className={inputClass}>
                  <option value="">-- Choose Subject --</option>
                  {subjects.map(sub => <option key={`form-sub-${sub.id}`} value={sub.id}>{sub.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Day of Week</label>
                <select value={formDay} onChange={e => setFormDay(e.target.value)} className={inputClass}>
                  {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Start Time</label>
                  <input type="time" required value={formStartTime} onChange={e => setFormStartTime(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">End Time</label>
                  <input type="time" required value={formEndTime} onChange={e => setFormEndTime(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Room / Location</label>
                <input type="text" placeholder="e.g. Room 204B" value={formRoom} onChange={e => setFormRoom(e.target.value)} className={inputClass} />
              </div>

              <button type="submit" className="w-full mt-2 rounded-lg bg-black py-2.5 font-bold text-white hover:bg-slate-800 transition shadow-sm">
                Schedule Slot
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );

  return isAdmin ? (
    <AdminLayout pageTitle="Timetables">
      {content}
    </AdminLayout>
  ) : (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {content}
      </div>
    </div>
  );
}
