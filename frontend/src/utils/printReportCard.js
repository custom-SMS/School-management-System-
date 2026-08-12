/**
 * printReportCard — Professional A4 Landscape Dynamic Report Card.
 * Opens in a new tab. Allows Admin, Teachers, Parents, and Students to print or save as PDF.
 */
export function printReportCard({
  reportCardData = null,
  reportCard: rc = null,
  grades = [],
  branding = {},
  logoUrl = null,
  passMark = 50,
  preOpenedWindow = null,
}) {
  const schoolName = branding.institutionNameEn || branding.schoolName || 'School Management System';
  const primaryColor = branding.brandColor || '#1e3a5f';
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  // Resolve Student Info
  const studentName = reportCardData?.student?.name || rc?.student?.user?.name || '—';
  const studentId = reportCardData?.student?.studentId || rc?.student?.studentId || '—';
  const gradeLevel = reportCardData?.student?.grade || rc?.grade || '—';
  const sectionName = reportCardData?.student?.section || '—';
  const academicYear = reportCardData?.student?.academicYear || rc?.academicYear?.year || '—';

  // Resolve Comments & Status
  const sem1Comment = reportCardData?.reportCard?.semester1Comment || rc?.semester1Comment || rc?.teacherComments || '';
  const sem2Comment = reportCardData?.reportCard?.semester2Comment || rc?.semester2Comment || rc?.homeroomRemarks || '';
  const overallComment = reportCardData?.reportCard?.overallComment || rc?.overallComment || '';
  const conductGrade = reportCardData?.reportCard?.conductGrade || rc?.conductGrade || '—';
  const promotionStatus = reportCardData?.reportCard?.promotionStatus || rc?.promotionStatus || 'Pending';
  const promotedTo = reportCardData?.reportCard?.promotedToGrade || rc?.promotedToGrade || rc?.promotedToClass?.name || '__________';

  // Resolve Subject Rows
  let subjectRows = [];
  let sem1OverallAvg = reportCardData?.summary?.sem1OverallAvg ?? null;
  let sem2OverallAvg = reportCardData?.summary?.sem2OverallAvg ?? null;
  let annualOverallAvg = reportCardData?.summary?.annualOverallAvg ?? null;

  if (reportCardData?.subjects) {
    subjectRows = reportCardData.subjects;
  } else if (Array.isArray(grades) && grades.length > 0) {
    subjectRows = grades.map((g) => {
      const s1 = g.percentage != null ? Number(g.percentage) : null;
      return {
        subjectName: g.subjectRef?.name || g.subject || 'Subject',
        sem1Score: s1,
        sem2Score: null,
        annualAverage: s1,
      };
    });
    if (rc?.averageScore != null) {
      annualOverallAvg = Number(rc.averageScore);
    }
  }

  // Build Subjects Table HTML
  const tableRowsHtml = subjectRows.length > 0
    ? subjectRows.map((s, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        const s1 = s.sem1Score !== null ? Number(s.sem1Score).toFixed(1) : '—';
        const s2 = s.sem2Score !== null ? Number(s.sem2Score).toFixed(1) : '—';
        const ann = s.annualAverage !== null ? Number(s.annualAverage).toFixed(1) : '—';
        return `
          <tr style="background:${bg}">
            <td style="padding:6px 10px;font-weight:600;color:#1e293b;border-bottom:1px solid #e2e8f0;">${s.subjectName}</td>
            <td style="padding:6px 10px;text-align:center;color:#334155;border-bottom:1px solid #e2e8f0;">${s1}</td>
            <td style="padding:6px 10px;text-align:center;color:#334155;border-bottom:1px solid #e2e8f0;">${s2}</td>
            <td style="padding:6px 10px;text-align:center;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">${ann}</td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="4" style="padding:16px;text-align:center;color:#94a3b8;font-style:italic;">No subject scores available</td></tr>`;

  const sem1Status = reportCardData?.summary?.sem1Status || (sem1OverallAvg !== null ? 'Pass' : 'Incomplete');
  const sem2Status = reportCardData?.summary?.sem2Status || (sem2OverallAvg !== null ? 'Pass' : 'Incomplete');
  const annualStatus = reportCardData?.summary?.annualStatus || (annualOverallAvg !== null ? 'Pass' : 'Incomplete');

  const overallSem1Display = sem1OverallAvg !== null ? `${sem1OverallAvg}%` : (sem1Status === 'Incomplete' ? 'Incomplete' : '—');
  const overallSem2Display = sem2OverallAvg !== null ? `${sem2OverallAvg}%` : (sem2Status === 'Incomplete' ? 'Incomplete' : '—');
  const overallAnnualDisplay = annualOverallAvg !== null ? `${annualOverallAvg}%` : (annualStatus === 'Incomplete' ? 'Incomplete' : '—');

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="height:60px;width:60px;object-fit:contain;border-radius:50%;" />`
    : `<div style="height:55px;width:55px;border-radius:50%;background:${primaryColor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;">${schoolName.charAt(0)}</div>`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Dynamic Report Card — ${studentName}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #fff;
    color: #0f172a;
    font-size: 11px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page { size: A4 landscape; margin: 6mm 8mm; }
  @media print { .toolbar { display: none !important; } }
  .toolbar {
    background: #f1f5f9;
    border-bottom: 1px solid #cbd5e1;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .btn-print {
    background: ${primaryColor};
    color: #fff;
    border: none;
    padding: 8px 20px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-close {
    background: #e2e8f0;
    color: #334155;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .page-container {
    max-width: 1060px;
    margin: 0 auto;
    padding: 12px 16px;
    background: #fff;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid ${primaryColor};
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .school-name {
    font-size: 20px;
    font-weight: 900;
    color: ${primaryColor};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .doc-title {
    font-size: 14px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
  }
  .main-grid {
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    gap: 16px;
  }
  .student-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 10px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .info-item {
    font-size: 10px;
  }
  .info-label {
    color: #64748b;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 9px;
  }
  .info-value {
    color: #0f172a;
    font-weight: 700;
    font-size: 11px;
  }
  .marks-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
  }
  .marks-table th {
    background: ${primaryColor};
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 7px 10px;
    text-align: left;
  }
  .marks-table th.center { text-align: center; }
  .overall-row {
    background: #e2e8f0;
    font-weight: 800;
  }
  .overall-row td {
    padding: 7px 10px;
    border-top: 2px solid #cbd5e1;
    font-size: 11px;
  }
  .comment-box {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #fff;
    padding: 10px;
    margin-bottom: 12px;
    min-height: 115px;
    display: flex;
    flex-direction: column;
  }
  .comment-header {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    color: ${primaryColor};
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 4px;
    margin-bottom: 6px;
  }
  .comment-content {
    font-size: 11px;
    color: #334155;
    line-height: 1.4;
    white-space: pre-wrap;
    flex: 1;
  }
  .footer-section {
    margin-top: 10px;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
  }
  .promotion-banner {
    background: #f0fdf4;
    border: 1px dashed #16a34a;
    border-radius: 6px;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .signatures-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    align-items: end;
    margin-top: 14px;
  }
  .sig-block {
    text-align: center;
    border-top: 1px solid #94a3b8;
    padding-top: 4px;
    font-size: 10px;
    font-weight: 600;
    color: #475569;
  }
  .stamp-box {
    border: 2px dashed #cbd5e1;
    border-radius: 8px;
    height: 55px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
  }
</style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <script>
    function downloadPDF() {
      const element = document.querySelector('.page-container');
      const opt = {
        margin: [4, 6, 4, 6],
        filename: 'ReportCard_${studentId.replace(/[^a-zA-Z0-9]/g, '_')}.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      const btn = document.querySelector('.btn-download');
      btn.innerText = 'Downloading PDF...';
      btn.disabled = true;
      html2pdf().set(opt).from(element).save().then(() => {
        btn.innerText = '📥 Download PDF';
        btn.disabled = false;
      }).catch(err => {
        alert('Failed to generate PDF. Opening browser print/save dialog instead.');
        window.print();
        btn.innerText = '📥 Download PDF';
        btn.disabled = false;
      });
    }
  </script>
</head>
<body>

<div class="toolbar">
  <button class="btn-download" onclick="downloadPDF()" style="background:#16a34a;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">📥 Download PDF</button>
  <button class="btn-print" onclick="window.print()">🖨️ Print Hardcopy</button>
  <button class="btn-close" onclick="window.close()">Close Window</button>
  <span style="font-size:12px;color:#64748b;margin-left:8px;">(Select Landscape orientation when printing)</span>
</div>

<div class="page-container">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      ${logoHtml}
      <div>
        <div class="school-name">${schoolName}</div>
        <div class="doc-title">Official Student Academic Progress Report</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:10px;color:#64748b;font-weight:600;">ACADEMIC YEAR</div>
      <div style="font-size:14px;font-weight:800;color:${primaryColor};">${academicYear}</div>
      <div style="font-size:9px;color:#94a3b8;margin-top:2px;">Issued: ${today}</div>
    </div>
  </div>

  <!-- Main 2-Column Grid -->
  <div class="main-grid">
    <!-- LEFT SIDE: Student Metadata & Marks Table -->
    <div>
      <div class="student-card">
        <div class="info-item">
          <div class="info-label">Student Name</div>
          <div class="info-value">${studentName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Student ID</div>
          <div class="info-value">${studentId}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Grade / Class</div>
          <div class="info-value">${gradeLevel}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Section</div>
          <div class="info-value">${sectionName}</div>
        </div>
      </div>

      <table class="marks-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th class="center" style="width:90px;">Semester 1</th>
            <th class="center" style="width:90px;">Semester 2</th>
            <th class="center" style="width:110px;">Annual Average</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
        <tfoot>
          <tr class="overall-row">
            <td>OVERALL AVERAGE</td>
            <td style="text-align:center;">${overallSem1Display}</td>
            <td style="text-align:center;">${overallSem2Display}</td>
            <td style="text-align:center;color:${primaryColor};font-size:12px;">${overallAnnualDisplay}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- RIGHT SIDE: Comments -->
    <div>
      <div class="comment-box">
        <div class="comment-header">Semester 1 Homeroom Teacher Comment</div>
        <div class="comment-content">${sem1Comment || 'No comment recorded for Semester 1.'}</div>
      </div>

      <div class="comment-box">
        <div class="comment-header">Semester 2 Homeroom Teacher Comment</div>
        <div class="comment-content">${sem2Comment || 'No comment recorded for Semester 2.'}</div>
      </div>
    </div>
  </div>

  <!-- FOOTER SECTION -->
  <div class="footer-section">
    ${overallComment ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;margin-bottom:8px;">
        <span style="font-weight:800;color:${primaryColor};font-size:9px;text-transform:uppercase;">Overall Comment: </span>
        <span style="font-size:10px;color:#334155;">${overallComment}</span>
      </div>
    ` : ''}

    <div class="promotion-banner">
      <div>
        <span style="font-weight:700;color:#166534;font-size:11px;">Status: </span>
        <span style="font-weight:900;color:#15803d;font-size:12px;text-transform:uppercase;">${promotionStatus}</span>
        <span style="margin:0 10px;color:#cbd5e1;">|</span>
        <span style="font-weight:700;color:#1e293b;font-size:11px;">Conduct Grade: </span>
        <span style="font-weight:900;color:${primaryColor};font-size:12px;">${conductGrade}</span>
      </div>
      <div>
        <span style="font-weight:700;color:#0f172a;font-size:11px;">Promoted To: </span>
        <span style="font-weight:900;color:${primaryColor};font-size:12px;border-bottom:1px solid ${primaryColor};padding:0 6px;">${promotedTo}</span>
      </div>
    </div>

    <div class="signatures-grid">
      <div class="sig-block">
        Homeroom Teacher Signature &amp; Date
      </div>
      <div class="sig-block">
        Principal Signature &amp; Date
      </div>
      <div class="stamp-box">
        School Official Stamp Area
      </div>
    </div>
  </div>
</div>

</body>
</html>`;

  const win = preOpenedWindow || window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(htmlContent);
    win.document.close();
  }
}
