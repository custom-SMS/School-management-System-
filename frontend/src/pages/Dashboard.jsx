import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from '../api/axios';
import Navbar from '../components/Navbar';

const normalizeClassLabel = (value) => {
  const label = String(value ?? '').trim();
  return label || 'Unassigned';
};

const classSortWeight = (value) => {
  const label = normalizeClassLabel(value);
  const match = label.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
};

const sortChartRows = (rows) => [...rows].sort((left, right) => {
  const leftWeight = classSortWeight(left.label);
  const rightWeight = classSortWeight(right.label);

  if (leftWeight !== rightWeight) {
    return leftWeight - rightWeight;
  }

  return left.label.localeCompare(right.label);
});

const buildTeacherFallbackData = (assignments = [], user = null) => {
  const uniqueClasses = Array.from(
    new Map(
      assignments
        .map((assignment) => assignment.class)
        .filter(Boolean)
        .map((klass) => [klass._id, klass]),
    ).values(),
  ).sort((left, right) => normalizeClassLabel(left.name).localeCompare(normalizeClassLabel(right.name), undefined, { numeric: true, sensitivity: 'base' }));

  const classSummaries = uniqueClasses.map((klass) => ({
    classId: klass._id,
    className: normalizeClassLabel(klass.name),
    subject: normalizeClassLabel(klass.subject),
    studentCount: klass.students?.length || 0,
    attendanceSessions: 0,
    attendanceRate: 0,
    gradesCount: 0,
    averageGrade: 0,
    latestAttendanceDate: null,
  }));

  const assignedStudentsCount = new Set(
    uniqueClasses.flatMap((klass) => (klass.students || []).map((student) => student?._id?.toString()).filter(Boolean)),
  ).size;

  return {
    teacher: {
      name: user?.name || 'Teacher',
      email: user?.email || '',
      role: user?.role || 'Teacher',
    },
    teacherId: '—',
    subject: 'Assigned Classes',
    assignedClassesCount: uniqueClasses.length,
    assignedStudentsCount,
    gradesRecordedCount: 0,
    attendanceSessionsCount: 0,
    averageGrade: 0,
    classSummaries,
    recentGrades: [],
    recentAttendance: [],
  };
};

function AnalyticsBarCard({ title, description, rows, valueKey, valueFormatter, barClass, emptyMessage }) {
  const maxValue = rows.reduce((max, row) => Math.max(max, Number(row[valueKey] || 0)), 0);

  return (
    <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
      <div className="mb-5">
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="space-y-4">
        {rows.length > 0 ? rows.map((row, index) => {
          const value = Number(row[valueKey] || 0);
          const width = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 8 : 0) : 0;
          const rowKey = row.key || `${row.label}-${index}`;

          return (
            <div key={rowKey}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-700">{row.label}</span>
                <span className="font-semibold text-slate-900">{valueFormatter(value, row)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${barClass}`}
                  style={{ width: `${width}%` }}
                  aria-hidden="true"
                />
              </div>
              {row.caption && <p className="mt-2 text-xs text-slate-500">{row.caption}</p>}
            </div>
          );
        }) : (
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}

function FeeStackedCard({ title, description, rows, emptyMessage }) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
      <div className="mb-5">
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="space-y-4">
        {rows.length > 0 ? rows.map((row, index) => {
          const totalAmount = Number(row.totalAmount || 0);
          const paidAmount = Number(row.paidAmount || 0);
          const pendingAmount = Number(row.pendingAmount || 0);
          const paidWidth = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
          const pendingWidth = totalAmount > 0 ? (pendingAmount / totalAmount) * 100 : 0;
          const rowKey = row.key || `${row.label}-${index}`;

          return (
            <div key={rowKey}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-700">{row.label}</span>
                <span className="font-semibold text-slate-900">ETB {totalAmount}</span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${paidWidth}%` }}
                  aria-hidden="true"
                />
                <div
                  className="h-full bg-rose-400"
                  style={{ width: `${pendingWidth}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>Paid: ETB {paidAmount}</span>
                <span>Pending: ETB {pendingAmount}</span>
              </div>
            </div>
          );
        }) : (
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [parentData, setParentData] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [teacherError, setTeacherError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        if (!user) return;

        if (active) {
          setPortalError('');
          setTeacherError('');
          setPortalLoading(user.role === 'Student');
          setTeacherLoading(user.role === 'Teacher');
        }

        if (user.role === 'Admin') {
          const res = await axios.get('/stats/admin');
          setStats(res.data);
        } else if (user.role === 'Student') {
          const res = await axios.get('/stats/student/me');
          if (active) setStudentData(res.data);
        } else if (user.role === 'Parent') {
          const res = await axios.get('/stats/parent/me');
          if (active) setParentData(res.data);
        } else if (user.role === 'Teacher') {
          const assignmentsRes = await axios.get('/assignments/me');
          if (active) setTeacherData(buildTeacherFallbackData(assignmentsRes.data || [], user));
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
        if (active && user?.role === 'Student') {
          setPortalError(err.response?.data?.message || 'Unable to load your student portal right now.');
        } else if (active && user?.role === 'Teacher') {
          setTeacherError(err.response?.data?.message || 'Unable to load your teacher dashboard right now.');
        }
      } finally {
        if (active) setPortalLoading(false);
        if (active) setTeacherLoading(false);
      }
    };
    fetchData();

    return () => {
      active = false;
    };
  }, [user]);

  const studentProfile = studentData?.profile ?? {};
  const studentId = studentData?.studentId || studentProfile.studentId || '—';
  const studentGrade = studentData?.grade || studentProfile.grade || '—';
  const guardianContacts = studentProfile.guardianContacts || [];
  const attendanceCount =
    studentData?.attendanceCount ?? studentData?.attendance?.length ?? 0;
  const gradeEntries = studentData?.grades || [];
  const gradesCount = studentData?.gradesCount ?? gradeEntries.length ?? 0;
  const attendanceEntries = studentData?.attendance || [];
  const attendancePresentCount = attendanceEntries.filter((entry) => entry.status === 'Present').length;
  const attendanceAbsentCount = attendanceEntries.filter((entry) => entry.status === 'Absent').length;
  const attendanceLateCount = attendanceEntries.filter((entry) => entry.status === 'Late').length;
  const attendanceRate = Number(studentData?.attendanceRate ?? (attendanceCount > 0 ? ((attendancePresentCount / attendanceCount) * 100).toFixed(2) : 0));

  const normalizedGradeEntries = gradeEntries.map((grade) => ({
    ...grade,
    percentageValue: Number(grade.percentage ?? 0),
    totalValue: Number(grade.total ?? ((grade.marks?.test || 0) + (grade.marks?.midterm || 0) + (grade.marks?.final || 0))),
  }));
  const gradeAverage = normalizedGradeEntries.length > 0
    ? Math.round(
        normalizedGradeEntries.reduce((sum, grade) => sum + grade.percentageValue, 0) /
          normalizedGradeEntries.length,
      )
    : 0;
  const bestSubject = normalizedGradeEntries.reduce((best, grade) => {
    if (!best || grade.percentageValue > best.percentageValue) return grade;
    return best;
  }, null);
  const latestGradeEntries = [...normalizedGradeEntries].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );

  const feeEntries = studentData?.fees || [];
  const paidFeeAmount = feeEntries.reduce((sum, fee) => (fee.paid ? sum + Number(fee.amount || 0) : sum), 0);
  const pendingFeeAmount =
    studentData?.totalFees ??
    feeEntries.reduce(
      (sum, fee) => (fee.paid ? sum : sum + Number(fee.amount || 0)),
      0,
    ) ?? 0;
  const paidFeeCount = feeEntries.filter((fee) => fee.paid).length;
  const pendingFeeCount = feeEntries.filter((fee) => !fee.paid).length;

  const studentsByClass = sortChartRows(
    (stats?.studentsByClass || []).map((entry) => ({
      label: normalizeClassLabel(entry.className),
      studentCount: Number(entry.studentCount || 0),
    })),
  );

  const attendanceByClass = sortChartRows(
    (stats?.attendanceSummary || []).map((entry) => ({
      label: normalizeClassLabel(entry.className),
      attendanceRate: Number(entry.attendanceRate || 0),
      caption: `${entry.present || 0} present out of ${entry.checked || 0} check-ins`,
    })),
  );

  const feeSummaryByClass = sortChartRows(
    (stats?.feeSummaryByClass || []).map((entry) => ({
      label: normalizeClassLabel(entry.className),
      totalAmount: Number(entry.totalAmount || 0),
      paidAmount: Number(entry.paidAmount || 0),
      pendingAmount: Number(entry.pendingAmount || 0),
    })),
  );

  const teacherClassSummaries = sortChartRows(
    (teacherData?.classSummaries || []).map((entry) => ({
      label: normalizeClassLabel(entry.className),
      studentCount: Number(entry.studentCount || 0),
      attendanceRate: Number(entry.attendanceRate || 0),
      averageGrade: Number(entry.averageGrade || 0),
      caption: `${entry.subject || 'General'} • ${entry.gradesCount || 0} grade${entry.gradesCount === 1 ? '' : 's'}`,
    })),
  );

  const teacherStudentsByClass = teacherClassSummaries.map((entry) => ({
    label: entry.label,
    studentCount: entry.studentCount,
    caption: entry.caption,
  }));

  const teacherAttendanceByClass = teacherClassSummaries.map((entry) => ({
    label: entry.label,
    attendanceRate: entry.attendanceRate,
    caption: `${entry.attendanceRate}% attendance • ${entry.subject || 'General'}`,
  }));

  const teacherGradeByClass = teacherClassSummaries.map((entry) => ({
    label: entry.label,
    averageGrade: entry.averageGrade,
    caption: `${entry.gradesCount || 0} grade${entry.gradesCount === 1 ? '' : 's'} recorded`,
  }));

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 overflow-hidden rounded-4xl border border-white/50 bg-white/75 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Overview</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Welcome, {user.name}</h1>
              <p className="mt-2 text-sm text-slate-500">Signed in as <span className="font-semibold text-slate-700">{user.role}</span></p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
              Secure session active <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>
      
        {user.role === 'Admin' && stats && (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Total Students</h3>
                <p className="text-4xl font-black tracking-tight text-slate-900">{stats.totalStudents}</p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Total Revenue</h3>
                <p className="text-4xl font-black tracking-tight text-emerald-600">ETB {stats.totalRevenue}</p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Avg Attendance</h3>
                <p className="text-4xl font-black tracking-tight text-blue-600">{stats.avgAttendance}%</p>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">Admin Analytics</h2>
                    <p className="mt-1 text-sm text-slate-500">Quick visual insights across classes, attendance, and fees.</p>
                  </div>
                  <div className="rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                    {stats.totalPendingRevenue ? `Outstanding fees: ETB ${stats.totalPendingRevenue}` : 'All fee collections are up to date'}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <AnalyticsBarCard
                  title="Students by Class"
                  description="Student distribution across the available classes."
                  rows={studentsByClass}
                  valueKey="studentCount"
                  valueFormatter={(value) => `${value} student${value === 1 ? '' : 's'}`}
                  barClass="bg-blue-500"
                  emptyMessage="No student distribution data is available yet."
                />

                <AnalyticsBarCard
                  title="Attendance by Class"
                  description="Average attendance percentage recorded for each class."
                  rows={attendanceByClass}
                  valueKey="attendanceRate"
                  valueFormatter={(value) => `${value}%`}
                  barClass="bg-emerald-500"
                  emptyMessage="No attendance analytics are available yet."
                />

                <FeeStackedCard
                  title="Fee Collection by Class"
                  description="Paid and pending fee amounts summarized by class."
                  rows={feeSummaryByClass}
                  emptyMessage="No fee analytics are available yet."
                />
              </div>
            </div>
          </>
        )}

        {user.role === 'Teacher' && teacherLoading && (
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <h3 className="mb-2 text-xl font-bold text-slate-900">Loading teacher dashboard…</h3>
            <p className="text-slate-600">Fetching your classes, grades, and attendance summaries.</p>
          </div>
        )}

        {user.role === 'Teacher' && teacherError && !teacherLoading && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <h3 className="mb-2 text-xl font-bold text-rose-900">Teacher dashboard unavailable</h3>
            <p className="text-rose-700">{teacherError}</p>
          </div>
        )}

        {user.role === 'Teacher' && teacherData && !teacherLoading && !teacherError && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Assigned Classes</h3>
                <p className="text-4xl font-black tracking-tight text-slate-900">{teacherData.assignedClassesCount}</p>
                <p className="mt-2 text-sm text-slate-500">Classes currently linked to you.</p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Students You Reach</h3>
                <p className="text-4xl font-black tracking-tight text-blue-600">{teacherData.assignedStudentsCount}</p>
                <p className="mt-2 text-sm text-slate-500">Unique learners across your classes.</p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Grades Recorded</h3>
                <p className="text-4xl font-black tracking-tight text-emerald-600">{teacherData.gradesRecordedCount}</p>
                <p className="mt-2 text-sm text-slate-500">Recent subject marks submitted by you.</p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Average Grade</h3>
                <p className="text-4xl font-black tracking-tight text-violet-600">{teacherData.averageGrade}%</p>
                <p className="mt-2 text-sm text-slate-500">Average of your recorded marks.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Teacher Overview</h2>
                  <p className="mt-1 text-sm text-slate-500">A quick look at your classes, student load, and recent classroom activity.</p>
                </div>
                <div className="rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                  {teacherData.teacherId} • {teacherData.subject}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {teacherData.classSummaries.length > 0 ? teacherData.classSummaries.map((klass) => (
                  <div key={klass.classId} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{klass.className}</h3>
                        <p className="mt-1 text-sm text-slate-500">{klass.subject}</p>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {klass.studentCount} student{klass.studentCount === 1 ? '' : 's'}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Attendance</div>
                        <div className="mt-1 text-xl font-black text-emerald-600">{klass.attendanceRate}%</div>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Average Grade</div>
                        <div className="mt-1 text-xl font-black text-blue-600">{klass.averageGrade}%</div>
                      </div>
                    </div>

                    <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-400">
                      {klass.gradesCount} grade{klass.gradesCount === 1 ? '' : 's'} • {klass.attendanceSessions} attendance session{klass.attendanceSessions === 1 ? '' : 's'}
                    </p>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">No class assignments are available yet.</p>
                )}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <AnalyticsBarCard
                title="Students per Class"
                description="How many students are in each of your classes."
                rows={teacherStudentsByClass}
                valueKey="studentCount"
                valueFormatter={(value) => `${value} student${value === 1 ? '' : 's'}`}
                barClass="bg-blue-500"
                emptyMessage="No class roster data available yet."
              />

              <AnalyticsBarCard
                title="Attendance Rate by Class"
                description="Attendance percentage across your assigned classes."
                rows={teacherAttendanceByClass}
                valueKey="attendanceRate"
                valueFormatter={(value) => `${value}%`}
                barClass="bg-emerald-500"
                emptyMessage="No attendance records available yet."
              />

              <AnalyticsBarCard
                title="Average Grade by Class"
                description="Your classroom performance by average score."
                rows={teacherGradeByClass}
                valueKey="averageGrade"
                valueFormatter={(value) => `${value}%`}
                barClass="bg-violet-500"
                emptyMessage="No grade records available yet."
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-4 text-xl font-bold text-slate-900">Recent Grades</h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-[720px] w-full border-collapse text-left text-sm sm:text-base">
                    <thead>
                      <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                        <th className="px-4 py-4">Student</th>
                        <th className="px-4 py-4">Class</th>
                        <th className="px-4 py-4">Subject</th>
                        <th className="px-4 py-4">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {teacherData.recentGrades.length > 0 ? teacherData.recentGrades.map((grade) => (
                        <tr key={grade.gradeId} className="transition hover:bg-slate-50">
                          <td className="px-4 py-4 font-semibold text-slate-900">{grade.studentName}</td>
                          <td className="px-4 py-4 text-slate-600">{grade.className}</td>
                          <td className="px-4 py-4 text-slate-600">{grade.subject}</td>
                          <td className="px-4 py-4 font-semibold text-slate-900">{grade.percentage}%</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="4" className="px-4 py-8 text-center text-slate-500">No recent grades yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-4 text-xl font-bold text-slate-900">Recent Attendance</h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-[640px] w-full border-collapse text-left text-sm sm:text-base">
                    <thead>
                      <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                        <th className="px-4 py-4">Class</th>
                        <th className="px-4 py-4">Date</th>
                        <th className="px-4 py-4">Present</th>
                        <th className="px-4 py-4">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {teacherData.recentAttendance.length > 0 ? teacherData.recentAttendance.map((session) => (
                        <tr key={session.attendanceId} className="transition hover:bg-slate-50">
                          <td className="px-4 py-4 font-semibold text-slate-900">{session.className}</td>
                          <td className="px-4 py-4 text-slate-600">{new Date(session.date).toLocaleDateString()}</td>
                          <td className="px-4 py-4 text-slate-600">{session.present}</td>
                          <td className="px-4 py-4 text-slate-600">{session.total}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="4" className="px-4 py-8 text-center text-slate-500">No recent attendance sessions yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {user.role === 'Student' && portalLoading && (
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <h3 className="mb-2 text-xl font-bold text-slate-900">Loading student portal…</h3>
            <p className="text-slate-600">Fetching your profile, attendance, and fee summary.</p>
          </div>
        )}

        {user.role === 'Student' && portalError && !portalLoading && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <h3 className="mb-2 text-xl font-bold text-rose-900">Student portal unavailable</h3>
            <p className="text-rose-700">{portalError}</p>
          </div>
        )}

        {user.role === 'Student' && !portalLoading && !portalError && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-4">
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Attendance Rate</h3>
                <p className="text-4xl font-black tracking-tight text-blue-600">{attendanceRate}%</p>
                <p className="mt-2 text-sm text-slate-500">Based on your recorded attendance logs.</p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Paid Fees</h3>
                <p className="text-4xl font-black tracking-tight text-emerald-600">ETB {paidFeeAmount}</p>
                <p className="mt-2 text-sm text-slate-500">{paidFeeCount} payment record{paidFeeCount === 1 ? '' : 's'}.</p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Pending Fees</h3>
                <p className="text-4xl font-black tracking-tight text-rose-600">ETB {pendingFeeAmount}</p>
                <p className="mt-2 text-sm text-slate-500">{pendingFeeCount} unpaid item{pendingFeeCount === 1 ? '' : 's'}.</p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Grade Average</h3>
                <p className="text-4xl font-black tracking-tight text-slate-900">{gradeAverage}%</p>
                <p className="mt-2 text-sm text-slate-500">Across {gradesCount} subject{gradesCount === 1 ? '' : 's'}.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
              <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Grade Details</h3>
                  <p className="mt-1 text-sm text-slate-500">Subject-by-subject marks and performance breakdown.</p>
                </div>
                <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                  Average Score: {gradeAverage}%
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-[720px] w-full border-collapse text-left text-sm sm:text-base">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-4 py-4">Subject</th>
                      <th className="px-4 py-4">Test</th>
                      <th className="px-4 py-4">Midterm</th>
                      <th className="px-4 py-4">Final</th>
                      <th className="px-4 py-4">Total</th>
                      <th className="px-4 py-4">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {latestGradeEntries.length > 0 ? latestGradeEntries.map((grade) => (
                      <tr key={grade._id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-4 font-semibold text-slate-900">{grade.subject}</td>
                        <td className="px-4 py-4 text-slate-700">{grade.marks?.test ?? 0}</td>
                        <td className="px-4 py-4 text-slate-700">{grade.marks?.midterm ?? 0}</td>
                        <td className="px-4 py-4 text-slate-700">{grade.marks?.final ?? 0}</td>
                        <td className="px-4 py-4 font-semibold text-slate-900">{grade.totalValue}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${grade.percentageValue >= 75 ? 'bg-emerald-100 text-emerald-700' : grade.percentageValue >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                            {grade.percentageValue}%
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-slate-500">No grade records available yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-4 text-xl font-bold text-slate-900">Attendance Breakdown</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                    <div className="text-sm font-semibold text-emerald-700">Present</div>
                    <div className="text-2xl font-black text-emerald-700">{attendancePresentCount}</div>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-4 py-3">
                    <div className="text-sm font-semibold text-rose-700">Absent</div>
                    <div className="text-2xl font-black text-rose-700">{attendanceAbsentCount}</div>
                  </div>
                  <div className="rounded-2xl bg-amber-50 px-4 py-3">
                    <div className="text-sm font-semibold text-amber-700">Late</div>
                    <div className="text-2xl font-black text-amber-700">{attendanceLateCount}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-500">Attendance total: {attendanceCount} session{attendanceCount === 1 ? '' : 's'}.</p>
              </div>

              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <h3 className="mb-4 text-xl font-bold text-slate-900">Guardians</h3>
                {guardianContacts.length > 0 ? (
                  <div className="space-y-3">
                    {guardianContacts.map((guardian, index) => (
                      <div key={`${guardian.parent?._id || guardian.fullName || index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-900">{guardian.fullName}</div>
                            <div className="text-sm text-slate-500">{guardian.relationship || 'Guardian'}</div>
                          </div>
                          {guardian.primary && (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Primary</span>
                          )}
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                          {guardian.email && <div>Email: {guardian.email}</div>}
                          {guardian.phone && <div>Phone: {guardian.phone}</div>}
                          {guardian.address && <div>Address: {guardian.address}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No guardian details linked yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
              <h3 className="mb-4 text-xl font-bold text-slate-900">Recent Attendance</h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-[640px] w-full border-collapse text-left text-sm sm:text-base">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {attendanceEntries.length > 0 ? attendanceEntries.map((entry) => (
                      <tr key={entry.date} className="transition hover:bg-slate-50">
                        <td className="px-4 py-4 text-slate-700">{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${entry.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : entry.status === 'Late' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="2" className="px-4 py-8 text-center text-slate-500">No attendance records available yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
              <h3 className="mb-4 text-xl font-bold text-slate-900">Fee Ledger</h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-[520px] w-full border-collapse text-left text-sm sm:text-base">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-4 py-4">Month</th>
                      <th className="px-4 py-4">Amount</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {feeEntries.length > 0 ? feeEntries.map((fee) => (
                      <tr key={fee._id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-4 text-slate-700">{fee.month}</td>
                        <td className="px-4 py-4 font-semibold text-slate-900">ETB {fee.amount}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${fee.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {fee.paid ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {fee.paid
                            ? new Date(fee.paymentDate || fee.createdAt).toLocaleDateString()
                            : new Date(fee.dueDate || fee.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="px-4 py-8 text-center text-slate-500">No fee records available yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {user.role === 'Parent' && parentData && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
              <h3 className="mb-3 text-xl font-bold text-slate-900">Parent Portal</h3>
              <p className="text-slate-600">Track your linked children’s attendance, progress, and fee payments.</p>
            </div>

            {parentData.children?.map((child) => (
              <div key={child.profile._id} className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                  <h4 className="mb-4 text-lg font-bold text-slate-900">{child.profile.user?.name}</h4>
                  <p className="text-slate-600"><strong className="text-slate-900">Student ID:</strong> {child.profile.studentId}</p>
                  <p className="mt-2 text-slate-600"><strong className="text-slate-900">Grade:</strong> {child.profile.grade}</p>
                  <p className="mt-2 text-slate-600"><strong className="text-slate-900">Grades:</strong> {child.grades.length}</p>
                  <p className="mt-2 text-slate-600"><strong className="text-slate-900">Payments:</strong> {child.fees.length}</p>
                </div>

                <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                  <h4 className="mb-4 text-lg font-bold text-slate-900">Recent Attendance</h4>
                  <div className="space-y-2">
                    {child.attendance.slice(0, 5).map((entry) => (
                      <div key={`${child.profile._id}-${entry.date}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                        <span className="text-slate-600">{new Date(entry.date).toLocaleDateString()}</span>
                        <span className="font-semibold text-slate-900">{entry.status}</span>
                      </div>
                    ))}
                    {child.attendance.length === 0 && <div className="text-sm text-slate-500">No attendance records yet.</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
