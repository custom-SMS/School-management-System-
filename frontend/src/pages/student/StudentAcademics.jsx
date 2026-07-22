import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import StudentLayout from '../../components/StudentLayout';
import { useBranch } from '../../hooks/useBranch';
import { useStudentAcademicsQuery } from '../../queries/studentPortalQueries';

const letterFor = (p) => (p >= 90 ? 'A+' : p >= 85 ? 'A' : p >= 80 ? 'A-' : p >= 75 ? 'B+' : p >= 70 ? 'B' : p >= 60 ? 'C' : 'D');

function FetchError({ onRetry }) {
  return (
    <div className="mt-10 rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <svg className="mx-auto mb-3 h-10 w-10 text-rose-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2zm0-8h2v6h-2z" />
      </svg>
      <p className="text-lg font-bold text-rose-700">Could not load academic data</p>
      <p className="mt-1 text-sm text-rose-500">The server may be unavailable or you may be offline.</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-rose-700">Retry</button>
    </div>
  );
}

export default function StudentAcademics() {
  const { activeSemester } = useBranch();
  const [semesters, setSemesters] = useState([]);
  const [selectedSemId, setSelectedSemId] = useState('');

  // Fetch semesters of active academic year
  useEffect(() => {
    if (activeSemester?.academicYearId) {
      axios.get(`/semesters?academicYearId=${activeSemester.academicYearId}`)
        .then((r) => {
          setSemesters(r.data || []);
        })
        .catch(console.error);
    }
  }, [activeSemester]);

  // Set the default selected semester to the active one
  useEffect(() => {
    if (activeSemester) {
      setSelectedSemId(activeSemester.id);
    }
  }, [activeSemester]);

  const { data, isLoading: loading, isError: error, refetch: load } = useStudentAcademicsQuery(selectedSemId);

  const stats = data?.stats || null;
  const timetable = data?.timetable || [];
  const subjects = data?.subjects || [];

  const grades = stats?.grades || [];

  const avgPct = (() => {
    if (subjects.length) {
      const vals = subjects
        .map((s) => s.latestPercentage)
        .filter((p) => p != null && Number.isFinite(Number(p)));
      return vals.length ? vals.reduce((sum, v) => sum + Number(v), 0) / vals.length : null;
    }
    const vals = grades.map((g) => {
      const raw = g.percentage;
      if (raw == null || (typeof raw === 'string' && String(raw).trim() === '')) return NaN;
      const n = Number(raw);
      return Number.isFinite(n) ? n : NaN;
    }).filter((n) => !Number.isNaN(n));
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  })();

  const subjectList = subjects.length
    ? subjects.map((s) => ({
        id: s.subjectKey,
        name: s.subjectName,
        courseCode: s.courseCode,
        totalMarks: s.latestTotalMarks,
        percentage: s.latestPercentage,
      }))
    : (() => {
        const map = new Map();
        (grades || []).forEach((g) => {
          const id = g.subjectId || g.subject || g.subjectRef?.id || g._id || g.id || g.subjectRef?.name;
          const name = g.subject || g.subjectRef?.name || 'Subject';
          const key = String(id || name);
          if (!map.has(key)) map.set(key, { id: key, name });
        });
        return Array.from(map.values());
      })();

  const selectedSem = semesters.find(s => s.id === selectedSemId) || activeSemester;

  return (
    <StudentLayout searchPlaceholder="Search records...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            Academic Performance
            {selectedSem && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {selectedSem.name}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500">
            Student ID: {stats?.studentId || '—'} · {stats?.grade || ''}{stats?.stream ? ` (${stats.stream})` : ''}
            {(() => {
              // Try several possible locations for the student's section/stream
              const section = stats?.section
                || stats?.profile?.section
                || (Array.isArray(stats?.profile?.classes) && stats.profile.classes[0]?.name)
                || stats?.enrollments?.[0]?.section?.name
                || stats?.sectionName
                || stats?.profile?.sectionName;
              return section ? ` · ${section}` : null;
            })()}
          </p>
        </div>
          {/* Transcript button removed per request */}
      </div>

      {loading ? (
        <div className="mt-10 flex flex-col items-center py-20 text-slate-400">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
          Loading academic data…
        </div>
      ) : error ? (
        <FetchError onRetry={load} />
      ) : (
        <>
          {/* Semester Tabs/Pills Toggle */}
          {semesters.length > 1 && (
            <div className="mb-6 flex border-b border-slate-100">
              {semesters.map((sem) => (
                <button
                  key={sem.id}
                  onClick={() => setSelectedSemId(sem.id)}
                  className={`border-b-2 px-6 py-3 text-sm font-bold transition ${
                    selectedSemId === sem.id
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {sem.name}
                </button>
              ))}
            </div>
          )}

          {/* Semester un-opened / Coming Soon state check */}
          {selectedSem && !selectedSem.isActive && subjectList.length === 0 && grades.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{selectedSem.name} Coming Soon</h2>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                This semester has not officially opened yet. Academic records and subject results will be available once the term begins and grades are published.
              </p>
            </div>
          ) : (
            <>
              {/* Top cards */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-1">
                <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-8 border-white/80 text-2xl font-black">{avgPct != null ? Math.round(avgPct) + '%' : '—'}</div>
                  <div className="mt-3 text-center text-lg font-bold">Target Goal</div>
                  <div className="text-center text-xs text-slate-400">Term performance average</div>
                </div>
              </div>

              {/* Subject list (clickable) */}
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold text-slate-900">Enrolled Subjects</h2>
                <div className="space-y-2">
                  {subjectList.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">No enrolled subjects yet.</p>
                  ) : (
                    subjectList.map((sub) => (
                      <Link key={sub.id} to={`/student/academics/${encodeURIComponent(String(sub.id))}`} className="block rounded-xl border border-slate-100 p-4 hover:bg-slate-50">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900">{sub.name}</div>
                            <div className="text-xs text-slate-400">
                              {sub.courseCode ? `${sub.courseCode} · ` : ''}
                              {sub.percentage != null ? `${Number(sub.percentage).toFixed(1)}%` : 'Click to view detailed results'}
                            </div>
                          </div>
                          <div className="text-right">
                            {sub.totalMarks != null && (
                              <div className="text-sm font-bold text-slate-900">{Number(sub.totalMarks).toFixed(1)}</div>
                            )}
                            <div className="text-xs font-semibold text-slate-500">View</div>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              {/* Upcoming (from timetable) */}
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold text-slate-900">This Week's Classes</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {timetable.slice(0, 6).map((s, i) => (
                    <div key={s.id || i} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                      <div>
                        <div className="font-bold text-slate-900">{s.subject?.name || s.class?.name}</div>
                        <div className="text-xs text-slate-400">{s.dayOfWeek} · {s.startTime}–{s.endTime}{s.room ? ` · Room ${s.room}` : ''}</div>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">{s.class?.name}</span>
                    </div>
                  ))}
                  {timetable.length === 0 && <p className="py-6 text-center text-sm text-slate-400 sm:col-span-2">No timetable published yet.</p>}
                </div>
              </section>
            </>
          )}
        </>
      )}
    </StudentLayout>
  );
}
