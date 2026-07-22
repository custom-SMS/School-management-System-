import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "../../api/axios";
import AdminLayout from "../../components/AdminLayout";

const money = (n) =>
  `ETB ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0))}`;
const pct = (n) => `${Number(n || 0)}%`;
const plain = (n) => (n === null || n === undefined || n === "" ? "\u2014" : n);

const REPORTS = {
  academic: {
    title: "Academic Report",
    subtitle: "Grade performance and top performers across the school.",
    summary: [
      { key: "totalEntries", label: "Graded Entries", icon: "pencil" },
      { key: "overallAverage", label: "Overall Average", format: pct, icon: "chart" },
      { key: "subjectsAssessed", label: "Subjects Assessed", icon: "book" },
      { key: "passRate", label: "Pass Rate", format: pct, icon: "check" },
    ],
    tables: [],
    custom: "gradePerformance",
  },
  attendance: {
    title: "Attendance Report",
    subtitle: "School-wide attendance and tardiness statistics.",
    summary: [
      { key: "totalSessions", label: "Sessions", icon: "calendar" },
      { key: "totalRecords", label: "Records", icon: "list" },
      { key: "attendanceRate", label: "Attendance Rate", format: pct, icon: "check" },
      { key: "absenteeismRate", label: "Absenteeism", format: pct, icon: "x" },
      { key: "tardinessRate", label: "Tardiness", format: pct, icon: "clock" },
    ],
    tables: [
      {
        title: "Breakdown by Class",
        dataKey: "byClass",
        columns: [
          { key: "className", label: "Class" },
          { key: "subject", label: "Subject" },
          { key: "sessions", label: "Sessions" },
          { key: "present", label: "Present" },
          { key: "absent", label: "Absent" },
          { key: "late", label: "Late" },
          { key: "attendanceRate", label: "Rate", format: pct, bar: true },
          { key: "tardinessRate", label: "Tardiness", format: pct },
        ],
      },
    ],
  },
  enrollment: {
    title: "Enrollment Report",
    subtitle: "Demographics and new student statistics.",
    summary: [
      { key: "totalStudents", label: "Total Students", icon: "users" },
      { key: "gradeLevels", label: "Grade Levels", icon: "school" },
      { key: "newLast30Days", label: "New (30 days)", icon: "new" },
      { key: "enrollmentsThisYear", label: "This Year", icon: "calendar" },
      { key: "activeYear", label: "Active Year", icon: "star" },
    ],
    tables: [
      {
        title: "By Grade",
        dataKey: "byGrade",
        columns: [
          { key: "grade", label: "Grade" },
          { key: "count", label: "Students" },
          { key: "percentage", label: "Share", format: pct, bar: true },
        ],
      },
      {
        title: "By Gender",
        dataKey: "byGender",
        columns: [
          { key: "gender", label: "Gender" },
          { key: "count", label: "Students" },
          { key: "percentage", label: "Share", format: pct, bar: true },
        ],
      },
    ],
  },
  financial: {
    title: "Financial Summary",
    subtitle: "High-level view of fee collections (read-only).",
    summary: [
      { key: "totalBilled", label: "Total Billed", format: money, icon: "receipt" },
      { key: "totalCollected", label: "Collected", format: money, icon: "money" },
      { key: "totalPending", label: "Pending", format: money, icon: "pending" },
      { key: "collectionRate", label: "Collection Rate", format: pct, icon: "chart" },
      { key: "invoices", label: "Invoices", icon: "list" },
    ],
    tables: [
      {
        title: "By Month",
        dataKey: "byMonth",
        columns: [
          { key: "month", label: "Month" },
          { key: "billed", label: "Billed", format: money },
          { key: "collected", label: "Collected", format: money },
          { key: "pending", label: "Pending", format: money },
        ],
      },
      {
        title: "By Grade",
        dataKey: "byGrade",
        columns: [
          { key: "grade", label: "Grade" },
          { key: "billed", label: "Billed", format: money },
          { key: "collected", label: "Collected", format: money },
          { key: "pending", label: "Pending", format: money },
          { key: "collectionRate", label: "Rate", format: pct, bar: true },
        ],
      },
    ],
  },
};

const SummaryCard = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-1 min-w-0">
    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 truncate">{label}</div>
    <div className="text-lg sm:text-xl font-black text-gray-900 break-words leading-tight mt-1">{value}</div>
  </div>
);

const BarCell = ({ value }) => {
  const num = Math.min(Number(value) || 0, 100);
  const color = num >= 80 ? "bg-emerald-500" : num >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 bg-gray-100 rounded-full h-1.5 shrink-0">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${num}%` }} />
      </div>
      <span className="font-bold text-sm">{value}</span>
    </div>
  );
};

export default function ReportView() {
  const { type } = useParams();
  const navigate = useNavigate();
  const config = REPORTS[type];

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = () => {
    if (!config) { setLoading(false); return; }
    setLoading(true);
    setError("");
    axios
      .get(`/reports/${type}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load report."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownloadCSV = () => {
    if (!data) return;
    const lines = [];
    lines.push(config.title);
    lines.push(`Generated,${new Date().toLocaleString()}`);
    lines.push("");
    lines.push("Summary");
    config.summary.forEach((s) => {
      const raw = data.summary?.[s.key];
      lines.push(`${s.label},${s.format ? s.format(raw) : plain(raw)}`);
    });
    lines.push("");
    config.tables.forEach((table) => {
      const rows = data[table.dataKey] || [];
      lines.push(table.title);
      lines.push(table.columns.map((c) => c.label).join(","));
      rows.forEach((row) => {
        lines.push(
          table.columns
            .map((c) => {
              const val = c.format ? c.format(row[c.key]) : plain(row[c.key]);
              return `"${String(val).replace(/"/g, '""')}"`;
            })
            .join(",")
        );
      });
      lines.push("");
    });
    if (config.custom === "gradePerformance") {
      (data.gradePerformance || []).forEach(({ gradeLevel, topStudents }) => {
        lines.push(`Grade Performance - ${gradeLevel}`);
        lines.push("Rank,Student,Average Score,Entries");
        topStudents.forEach((s, i) => {
          lines.push(`"${i + 1}","${s.name}","${pct(s.averageScore)}","${s.entries}"`);
        });
        lines.push("");
      });
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported as CSV.");
  };

  if (!config) {
    return (
      <AdminLayout pageTitle="Report">
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center text-gray-500">
          <p className="font-semibold">Unknown report type.</p>
          <button
            onClick={() => navigate("/admin/academic-reports")}
            className="mt-4 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900"
          >
            Back to Reports
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      pageTitle={config.title}
      headerAction={
        <button
          onClick={handleDownloadCSV}
          disabled={!data}
          className="flex items-center gap-2 flex-nowrap whitespace-nowrap shrink-0 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download CSV
        </button>
      }
    >
      {/* Back + Title */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/admin/academic-reports")}
          className="mb-2 flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-black transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Reporting Module
        </button>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{config.title}</h2>
        <p className="mt-1 text-sm text-gray-500">{config.subtitle}</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
                <div className="h-3 w-16 bg-gray-200 rounded mb-3" />
                <div className="h-7 w-20 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded mb-2" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 py-12 text-center">
          <p className="font-semibold text-red-600">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {config.summary.map((s) => {
              const raw = data?.summary?.[s.key];
              return (
                <SummaryCard key={s.key} label={s.label} value={s.format ? s.format(raw) : plain(raw)} />
              );
            })}
          </div>

          {/* Data Tables */}
          {config.tables.map((table) => {
            const rows = data[table.dataKey] || [];
            return (
              <div key={table.dataKey} className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 bg-gray-50 px-4 sm:px-6 py-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900">{table.title}</h3>
                  <span className="text-xs font-semibold text-gray-400">{rows.length} row{rows.length !== 1 ? "s" : ""}</span>
                </div>
                {rows.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-gray-500">No data available yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                          {table.columns.map((c) => (
                            <th key={c.key} className="px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                        {rows.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition">
                            {table.columns.map((c) => (
                              <td key={c.key} className="px-4 sm:px-6 py-3 text-sm">
                                {c.bar ? (
                                  <BarCell value={c.format ? c.format(row[c.key]) : plain(row[c.key])} rawValue={row[c.key]} />
                                ) : (
                                  c.format ? c.format(row[c.key]) : plain(row[c.key])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {/* Grade Performance (Academic Report only) */}
          {config.custom === "gradePerformance" &&
            (() => {
              const gradePerformance = data.gradePerformance || [];
              return (
                <>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Grade Performance</h3>
                    <p className="text-sm text-gray-500">Top 5 students per grade level based on recorded marks.</p>
                  </div>
                  {gradePerformance.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center text-gray-500 text-sm">
                      No grade performance data yet — marks have not been recorded.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {gradePerformance.map(({ gradeLevel, topStudents }) => (
                        <div key={gradeLevel} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                          <div className="border-b border-gray-100 bg-gray-50 px-4 sm:px-6 py-3">
                            <h4 className="text-sm font-bold text-gray-900">{gradeLevel}</h4>
                            <p className="text-xs text-gray-500">
                              Top {topStudents.length} performer{topStudents.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {topStudents.map((student, idx) => (
                              <div key={idx} className="flex items-center gap-3 px-4 sm:px-6 py-3">
                                <span
                                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold
                                  ${idx === 0 ? "bg-yellow-100 text-yellow-700" : idx === 1 ? "bg-gray-200 text-gray-600" : idx === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}
                                >
                                  {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-gray-900">{student.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {student.entries} subject{student.entries !== 1 ? "s" : ""}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold
                                  ${student.averageScore >= 90 ? "bg-green-100 text-green-700" : student.averageScore >= 75 ? "bg-blue-100 text-blue-700" : student.averageScore >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}
                                >
                                  {pct(student.averageScore)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
        </>
      )}
    </AdminLayout>
  );
}
