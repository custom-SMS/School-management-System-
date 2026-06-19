const fs = require('fs');

function fix(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed: ' + filePath);
}

// AuditLogs - colored status badges
fix('frontend/src/pages/AuditLogs.jsx', [
  ["COMPLETED: 'bg-slate-50 text-slate-700'", "COMPLETED: 'bg-emerald-50 text-emerald-700'"],
  ["MODIFIED: 'bg-gray-200 text-gray-700'", "MODIFIED: 'bg-blue-50 text-blue-700'"],
  ["PENDING: 'bg-slate-50 text-slate-700'", "PENDING: 'bg-amber-50 text-amber-700'"],
  ["FAILED: 'bg-slate-50 text-slate-700'", "FAILED: 'bg-red-50 text-red-700'"],
  ["COMPLETED: 'bg-slate-50 text-slate-600'", "COMPLETED: 'bg-emerald-50 text-emerald-700'"],
  ["PENDING: 'bg-slate-50 text-slate-600'", "PENDING: 'bg-amber-50 text-amber-700'"],
  ["FAILED: 'bg-slate-50 text-slate-600'", "FAILED: 'bg-red-50 text-red-700'"],
  ["MODIFIED: 'bg-slate-100 text-slate-600'", "MODIFIED: 'bg-blue-50 text-blue-700'"],
]);

// AttendanceGovernance - locked/open badges
fix('frontend/src/pages/superadmin/AttendanceGovernance.jsx', [
  ["bg-slate-100 text-slate-800'>Locked", "bg-red-100 text-red-800'>Locked"],
  ["bg-slate-100 text-slate-800'>Open", "bg-emerald-100 text-emerald-800'>Open"],
  ["text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50", "text-xs font-bold text-indigo-600 hover:text-indigo-900 bg-indigo-50"],
]);

// AcademicYears - active/inactive/open/closed badges
fix('frontend/src/pages/superadmin/AcademicYears.jsx', [
  ["bg-slate-100 text-slate-800\">Active", "bg-emerald-100 text-emerald-800\">Active"],
  ["bg-slate-100 text-slate-600\">Inactive", "bg-slate-100 text-slate-500\">Inactive"],
  ["y.registrationOpen ? 'bg-slate-100 text-slate-800 hover:bg-slate-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'",
   "y.registrationOpen ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"],
  ["text-xs font-bold text-slate-600 hover:text-slate-900\"\n                          >Set Active", "text-xs font-bold text-indigo-600 hover:text-indigo-900\">\n                          Set Active"],
  ["bg-black text-white font-bold py-2.5 rounded-lg hover:bg-slate-800", "bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700"],
]);

// UserManagement - action buttons and status badges
fix('frontend/src/pages/superadmin/UserManagement.jsx', [
  ["bg-slate-100 text-slate-800'\n                      }", "bg-emerald-100 text-emerald-800'\n                      }"],
  ["bg-slate-100 text-slate-800'}", "bg-emerald-100 text-emerald-800'}"],
  ["text-xs font-bold text-slate-600 hover:text-slate-900\"\n                      >\n                      {u.isActive ? 'Deactivate'", "text-xs font-bold text-blue-600 hover:text-blue-900\">\n                      {u.isActive ? 'Deactivate'"],
  ["text-xs font-bold text-slate-600 hover:text-slate-900\"\n                    >\n                      Reset Password", "text-xs font-bold text-red-600 hover:text-red-900\">\n                      Reset Password"],
]);

// FinancialOversight - colored icon backgrounds and value text
fix('frontend/src/pages/superadmin/FinancialOversight.jsx', [
  ["h-16 w-16 bg-slate-100 text-slate-600 rounded-2xl", "h-16 w-16 bg-emerald-100 text-emerald-600 rounded-2xl"],
  ["font-black text-slate-900\">ETB", "font-black text-emerald-700\">ETB"],
]);

// ReportCards - rank card color
fix('frontend/src/pages/ReportCards.jsx', [
  ["rounded-xl border border-slate-200 bg-slate-50 p-4\"><div className=\"text-xs font-bold uppercase tracking-wider text-slate-600\">Rank", 
   "rounded-xl border border-indigo-200 bg-indigo-50 p-4\"><div className=\"text-xs font-bold uppercase tracking-wider text-indigo-600\">Rank"],
  ["font-black text-slate-900\">{card.rank", "font-black text-indigo-900\">{card.rank"],
  ["font-black text-slate-900\">{g.percentage}", "font-black text-indigo-600\">{g.percentage}"],
  ["mt-3 rounded-lg bg-slate-700 px-5 py-2.5 font-bold text-white hover:bg-slate-800", "mt-3 rounded-lg bg-indigo-600 px-5 py-2.5 font-bold text-white hover:bg-indigo-700"],
]);

// Timetables - schedule button color
fix('frontend/src/pages/Timetables.jsx', [
  ["w-full mt-2 rounded-lg bg-slate-900 py-2.5 font-bold text-white hover:bg-slate-800", "w-full mt-2 rounded-lg bg-indigo-600 py-2.5 font-bold text-white hover:bg-indigo-700"],
  ["rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-900", "rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 border border-indigo-100"],
]);

console.log('All color fixes applied.');
