import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { useAuth } from '../../hooks/useAuth';
import axios from '../../api/axios';
import { toast } from 'react-toastify';

const MATERIAL_TYPE_LABELS = {
  LectureNote: 'Lecture Note',
  Worksheet: 'Worksheet',
  Syllabus: 'Syllabus',
  ReferenceBook: 'Reference Book',
  PastExam: 'Past Exam',
  Other: 'Other Resource',
};

const STATUS_COLORS = {
  Draft: 'bg-amber-50 text-amber-700 border border-amber-200',
  Published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Closed: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const STANDARD_GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtBytes = (b) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

export default function AcademicOversight() {
  const { user } = useAuth();
  const isSuper = user?.role === 'SuperAdmin';
  const Layout = isSuper ? SuperAdminLayout : AdminLayout;

  const [overview, setOverview] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [compliance, setCompliance] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  // Filter state
  const [filterBranch, setFilterBranch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const q = new URLSearchParams({
      ...(filterBranch && { branchId: filterBranch }),
      ...(filterGrade && { grade: filterGrade }),
      ...(filterStatus && { status: filterStatus }),
      ...(filterTeacher && { teacherId: filterTeacher }),
    }).toString();

    try {
      const [ovRes, aRes, mRes, cRes, bRes] = await Promise.all([
        axios.get(`/coursework/admin/overview?${filterBranch ? `branchId=${filterBranch}` : ''}`),
        axios.get(`/coursework/admin/all-assignments?${q}&limit=50`),
        axios.get(`/coursework/admin/all-materials?${q}&limit=50`),
        axios.get(`/coursework/admin/teacher-compliance?${filterBranch ? `branchId=${filterBranch}` : ''}`),
        axios.get('/branches/branches').catch(() => ({ data: [] })),
      ]);

      setOverview(ovRes.data || null);
      setAssignments(aRes.data.items || []);
      setMaterials(mRes.data.items || []);
      setCompliance(cRes.data || []);
      setBranches(bRes.data || []);
    } catch {
      toast.error('Failed to load academic oversight data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterBranch, filterGrade, filterStatus, filterTeacher]);

  const StatCard = ({ label, value, sub, color = 'text-[#203e4f]' }) => (
    <div className="rounded-2xl border border-[#d8e5ec] bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md">
      <p className={`text-2xl sm:text-3xl font-black ${color}`}>{value}</p>
      <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#6a8b9c] mt-1">{label}</p>
      {sub && <p className="text-xs text-[#799cb0] mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <Layout pageTitle="Academic Oversight">
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#203e4f]">
            Academic Coursework Oversight
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[#6a8b9c] mt-0.5">
            Monitor teacher assignments, curriculum coverage, and study materials across all classes.
          </p>
        </div>
      </div>

      {/* Filter Bar with Dropdowns */}
      <div className="mb-6 rounded-2xl border border-[#d8e5ec] bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
          {isSuper && (
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="rounded-xl border border-[#d8e5ec] bg-slate-50 px-3 py-2 text-xs sm:text-sm font-semibold text-[#203e4f] outline-none"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Grade Dropdown Option */}
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="rounded-xl border border-[#d8e5ec] bg-slate-50 px-3 py-2 text-xs sm:text-sm font-semibold text-[#203e4f] outline-none"
          >
            <option value="">All Grade Levels</option>
            {STANDARD_GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-[#d8e5ec] bg-slate-50 px-3 py-2 text-xs sm:text-sm font-semibold text-[#203e4f] outline-none"
          >
            <option value="">All Publishing Statuses</option>
            <option value="Draft">Draft Only</option>
            <option value="Published">Published Only</option>
            <option value="Closed">Closed</option>
          </select>

          {(filterBranch || filterGrade || filterStatus || filterTeacher) && (
            <button
              onClick={() => {
                setFilterBranch('');
                setFilterGrade('');
                setFilterStatus('');
                setFilterTeacher('');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2 py-1"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#e2ebf0] rounded-xl mb-6 overflow-x-auto w-full sm:w-auto">
        {[
          ['overview', '📊 Academic Overview'],
          ['assignments', `📋 Assignments (${assignments.length})`],
          ['materials', `📚 Materials (${materials.length})`],
          ['compliance', '👩‍🏫 Teacher Activity Tracker'],
        ].map(([t, l]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-shrink-0 py-2 px-4 rounded-lg text-xs sm:text-sm font-bold transition ${
              tab === t ? 'bg-white text-[#203e4f] shadow-xs' : 'text-[#6a8b9c] hover:text-[#203e4f]'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-[#6a8b9c]">Loading academic data...</div>
      ) : (
        <>
          {/* ── Overview ── */}
          {tab === 'overview' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard label="Total Assignments" value={overview.totalAssignments} color="text-[#203e4f]" />
                <StatCard label="Active Published" value={overview.activeAssignments} color="text-emerald-700" />
                <StatCard label="Study Materials" value={overview.totalMaterials} color="text-[#3b6b82]" />
                <StatCard label="Total Submissions" value={overview.totalSubmissions} color="text-indigo-800" />
                <StatCard label="Total Teachers" value={overview.totalTeachers} color="text-slate-700" />
                <StatCard
                  label="Participation Rate"
                  value={`${overview.teacherParticipationRate}%`}
                  sub={`${overview.activeTeachers} of ${overview.totalTeachers} teachers active`}
                  color={overview.teacherParticipationRate >= 60 ? 'text-emerald-700' : 'text-amber-700'}
                />
              </div>

              {/* Teacher Engagement Tracker Card */}
              <div className="rounded-2xl border border-[#d8e5ec] bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-black text-[#203e4f] text-base">Teacher Coursework Engagement</h3>
                    <p className="text-xs text-[#6a8b9c] mt-0.5">
                      Percentage of registered teachers actively publishing coursework or study materials.
                    </p>
                  </div>
                  <span className="text-lg font-black text-[#203e4f]">
                    {overview.teacherParticipationRate}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      overview.teacherParticipationRate >= 60 ? 'bg-emerald-600' : 'bg-amber-500'
                    }`}
                    style={{ width: `${overview.teacherParticipationRate}%` }}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-[#6a8b9c] font-semibold">
                  <span>{overview.activeTeachers} Active Teachers</span>
                  <span>{overview.totalTeachers - overview.activeTeachers} Inactive</span>
                </div>
              </div>
            </div>
          )}

          {/* ── All Assignments ── */}
          {tab === 'assignments' && (
            assignments.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#d8e5ec] bg-white py-16 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-bold text-[#203e4f]">No assignments match current filters</p>
                <p className="text-xs text-[#6a8b9c] mt-1">Try clearing or adjusting your filter criteria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-[#d8e5ec] bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STATUS_COLORS[a.status]}`}>
                            {a.status}
                          </span>
                          <h3 className="font-black text-[#203e4f] text-base">{a.title}</h3>
                        </div>

                        <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-[#6a8b9c]">
                          <span className="font-bold text-[#203e4f]">👩‍🏫 {a.teacher?.user?.name || 'Teacher'}</span>
                          <span>📚 {a.subject}</span>
                          <span>🎓 {a.grade}</span>
                          {a.class && <span>🏫 {a.class.name}</span>}
                          {a.dueDate && <span>📅 Due {fmtDate(a.dueDate)}</span>}
                          <span>⭐ {a.points} pts</span>
                          <span className="font-bold text-[#3b6b82]">
                            📥 {a._count?.submissions ?? 0} submission(s)
                          </span>
                        </div>

                        {a.description && (
                          <p className="mt-2 text-xs sm:text-sm text-[#4d6b7c] line-clamp-2">
                            {a.description}
                          </p>
                        )}
                      </div>

                      {a.attachmentUrl && (
                        <a
                          href={a.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#eaf2f6] px-3.5 py-2 text-xs font-bold text-[#203e4f] hover:bg-[#d8e5ec] transition"
                        >
                          📎 View File
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── All Materials ── */}
          {tab === 'materials' && (
            materials.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#d8e5ec] bg-white py-16 text-center">
                <p className="text-4xl mb-3">📚</p>
                <p className="font-bold text-[#203e4f]">No study materials match current filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {materials.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-[#d8e5ec] bg-white p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-[#1c4d66] bg-[#E4EFF6] border border-[#d8e5ec] px-2 py-0.5 rounded-full">
                        {MATERIAL_TYPE_LABELS[m.type] || m.type}
                      </span>

                      <h3 className="font-black text-[#203e4f] text-sm sm:text-base mt-2 line-clamp-2">
                        {m.title}
                      </h3>

                      <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-[#6a8b9c]">
                        <span className="font-semibold text-[#203e4f]">👩‍🏫 {m.teacher?.user?.name || 'Teacher'}</span>
                        <span>📚 {m.subject}</span>
                        <span>🎓 {m.grade}</span>
                      </div>

                      {m.description && (
                        <p className="mt-2 text-xs text-[#4d6b7c] line-clamp-2">{m.description}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-xs text-[#6a8b9c] truncate">{m.fileName}</span>
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg bg-[#203e4f] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#172d3a] transition"
                      >
                        ⬇ Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Teacher Activity Tracker ── */}
          {tab === 'compliance' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#d8e5ec] bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[650px]">
                    <thead className="bg-[#f0f5f8] border-b border-[#d8e5ec]">
                      <tr>
                        <th className="px-5 py-3.5 font-bold text-[#203e4f] uppercase tracking-wider text-xs">
                          Teacher
                        </th>
                        <th className="px-5 py-3.5 font-bold text-[#203e4f] uppercase tracking-wider text-xs">
                          Primary Subject
                        </th>
                        <th className="px-5 py-3.5 font-bold text-[#203e4f] uppercase tracking-wider text-xs text-center">
                          Assignments
                        </th>
                        <th className="px-5 py-3.5 font-bold text-[#203e4f] uppercase tracking-wider text-xs text-center">
                          Materials
                        </th>
                        <th className="px-5 py-3.5 font-bold text-[#203e4f] uppercase tracking-wider text-xs text-center">
                          Activity Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {compliance.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-12 text-[#6a8b9c]">
                            No teachers registered.
                          </td>
                        </tr>
                      ) : (
                        compliance.map((t) => (
                          <tr
                            key={t.id}
                            onClick={() => setFilterTeacher(filterTeacher === t.id ? '' : t.id)}
                            className={`hover:bg-[#f0f5f8]/60 transition cursor-pointer ${
                              filterTeacher === t.id ? 'bg-[#eaf2f6]' : ''
                            }`}
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-xl bg-[#203e4f] text-white flex items-center justify-center text-xs font-black shrink-0">
                                  {t.name
                                    .split(' ')
                                    .map((w) => w[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </div>
                                <div>
                                  <p className="font-bold text-[#203e4f]">{t.name}</p>
                                  <p className="text-xs text-[#6a8b9c]">{t.email || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-xs font-semibold text-[#203e4f]">{t.subject}</td>
                            <td className="px-5 py-4 text-center">
                              <span className={`font-black ${t.assignments > 0 ? 'text-[#203e4f]' : 'text-slate-300'}`}>
                                {t.assignments}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`font-black ${t.materials > 0 ? 'text-[#3b6b82]' : 'text-slate-300'}`}>
                                {t.materials}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              {t.isActive ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ✓ Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  ⚠ No Coursework
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {filterTeacher && (
                <p className="text-xs font-bold text-[#3b6b82] px-1">
                  Filtering records for selected teacher. Click the row again to reset filter.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
