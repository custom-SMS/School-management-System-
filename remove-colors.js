const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'frontend/src/components/SuperAdminLayout.jsx',
  'frontend/src/pages/superadmin/SuperAdminDashboard.jsx',
  'frontend/src/pages/superadmin/UserManagement.jsx',
  'frontend/src/pages/superadmin/AcademicYears.jsx',
  'frontend/src/pages/superadmin/AttendanceGovernance.jsx',
  'frontend/src/pages/superadmin/FinancialOversight.jsx',
  'frontend/src/pages/admin/AdminDashboard.jsx',
  'frontend/src/pages/admin/Classes.jsx',
  'frontend/src/pages/admin/Sections.jsx',
  'frontend/src/pages/admin/AcademicReports.jsx',
  'frontend/src/pages/ReportCards.jsx',
  'frontend/src/pages/Timetables.jsx'
];

filesToProcess.forEach(file => {
  const fullPath = path.join('c:\\branch commits SMS', file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');

    const colorMap = {
      'bg-indigo-600': 'bg-black',
      'hover:bg-indigo-700': 'hover:bg-slate-800',
      'text-indigo-600': 'text-black',
      'bg-indigo-50': 'bg-slate-100',
      'text-indigo-700': 'text-black',
      'border-indigo-100': 'border-slate-200',
      'border-indigo-500': 'border-black',
      'ring-indigo-500': 'ring-black',
      'focus:border-indigo-500': 'focus:border-black',
      'focus:ring-indigo-500': 'focus:ring-slate-900',
      
      'bg-emerald-600': 'bg-slate-800',
      'hover:bg-emerald-700': 'hover:bg-slate-900',
    };

    for (const [key, value] of Object.entries(colorMap)) {
        content = content.split(key).join(value);
    }
    
    content = content.replace(/indigo/g, 'slate');
    content = content.replace(/emerald/g, 'slate');
    content = content.replace(/amber/g, 'gray');
    content = content.replace(/rose/g, 'zinc');
    content = content.replace(/teal/g, 'neutral');
    content = content.replace(/cyan/g, 'zinc');
    content = content.replace(/violet/g, 'slate');
    content = content.replace(/purple/g, 'neutral');
    content = content.replace(/blue/g, 'gray');

    fs.writeFileSync(fullPath, content, 'utf8');
  }
});
console.log("Colors successfully removed and converted to monochrome.");
