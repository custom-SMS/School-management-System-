const escapePdfText = (value) => String(value ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const downloadBlob = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const buildAcademicSummary = (stats) => {
  const grades = stats?.grades || [];
  const average = grades.length
    ? grades.reduce((sum, grade) => sum + Number(grade.percentage || 0), 0) / grades.length
    : 0;

  return {
    studentName: stats?.profile?.user?.name || 'Student',
    studentId: stats?.studentId || '',
    gradeLevel: stats?.grade || '',
    grades,
    average,
    gpa: (average / 100 * 4).toFixed(2),
    attendanceRate: stats?.attendanceRate ?? 0,
  };
};

export const downloadTranscriptCsv = (stats) => {
  const summary = buildAcademicSummary(stats);
  const rows = [
    ['Student Name', summary.studentName],
    ['Student ID', summary.studentId],
    ['Grade Level', summary.gradeLevel],
    ['Cumulative GPA', summary.gpa],
    ['Average Score', `${summary.average.toFixed(2)}%`],
    [],
    ['Subject', 'Quiz', 'Assignment', 'Test', 'Midterm', 'Final', 'Total', 'Percentage', 'Comments'],
    ...summary.grades.map((grade) => [
      grade.subject || 'Subject',
      grade.quiz ?? '',
      grade.assignment ?? '',
      grade.test ?? '',
      grade.midterm ?? '',
      grade.final ?? '',
      grade.total ?? '',
      `${Number(grade.percentage || 0).toFixed(2)}%`,
      grade.comments || '',
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  downloadBlob(csv, `transcript-${summary.studentId || 'student'}.csv`, 'text/csv;charset=utf-8');
};

export const downloadStudentReportPdf = (stats) => {
  const summary = buildAcademicSummary(stats);
  const lines = [
    'Official Academic Performance Report',
    `Student: ${summary.studentName}`,
    `Student ID: ${summary.studentId || '-'}`,
    `Grade Level: ${summary.gradeLevel || '-'}`,
    `Cumulative GPA: ${summary.gpa}`,
    `Average Score: ${summary.average.toFixed(2)}%`,
    `Attendance Rate: ${summary.attendanceRate}%`,
    '',
    'Subject Records',
    ...(
      summary.grades.length
        ? summary.grades.map((grade) => `${grade.subject || 'Subject'} - ${Number(grade.percentage || 0).toFixed(2)}% - Total ${grade.total ?? '-'}`)
        : ['No published subject records yet.']
    ),
    '',
    `Generated: ${new Date().toLocaleString()}`,
  ];

  const contentLines = lines.slice(0, 42);
  const textCommands = contentLines
    .map((line, index) => `BT /F1 ${index === 0 ? 18 : 11} Tf 50 ${790 - index * 18} Td (${escapePdfText(line)}) Tj ET`)
    .join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${textCommands.length} >> stream\n${textCommands}\nendstream endobj`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  downloadBlob(pdf, `academic-report-${summary.studentId || 'student'}.pdf`, 'application/pdf');
};
