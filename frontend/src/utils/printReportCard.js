/**
 * printReportCard — Professional A4 report card matching the official template.
 * Opens in a new tab. Admin clicks "Print / Save as PDF".
 */
export function printReportCard({
  reportCard: rc,
  grades = [],
  branding = {},
  logoUrl = null,
  passMark = 50,
  gpaEnabled = false,
  classSize = null,
  preOpenedWindow = null
}) {
  const school = branding.institutionNameEn || 'School';
  const schoolAm = branding.institutionNameAm || '';
  const primary = branding.brandColor || '#1e3a5f';
  const year = rc.academicYear?.year || '—';

  const studentName = rc.student?.user?.name || '—';
  const studentId = rc.student?.studentId || '—';
  const grade = rc.grade || '—';
  const avg = Number(rc.averageScore || 0).toFixed(1);
  const gpa = (Number(rc.averageScore || 0) / 100 * 4).toFixed(2);
  const attPct = Number(rc.attendancePercentage || 0).toFixed(1);
  const rank = rc.rank ? (classSize ? `${rc.rank}/${classSize}` : `#${rc.rank}`) : '—';
  const result = rc.status || '—';
  const promotion = rc.promotionStatus || '—';
  const conduct = rc.conductGrade || '—';
  const present = rc.attendancePresent ?? 0;
  const absent = rc.attendanceAbsent ?? 0;
  const late = rc.attendanceLate ?? 0;
  const totalAtt = rc.attendanceTotal ?? 0;
  const hRemarks = rc.homeroomRemarks || '';
  const tComments = rc.teacherComments || '';
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── logo block ──────────────────────────────────────────────────────────
  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" style="width:80px;height:80px;object-fit:contain;border-radius:50%;border:3px solid #fff" />`
    : `<div style="width:80px;height:80px;border-radius:50%;background:#d1d5db;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#374151;text-align:center;line-height:1.2">LOGO<br/><span style="font-size:7px;font-weight:400">Slogan text here</span></div>`;

  // ── grade rows ───────────────────────────────────────────────────────────
  // Each subject gets one row. We show Quiz, Assignment, Midterm, Final as Q1–Q4
  const gradeRows = grades.length
    ? grades.map((g, i) => {
      const subj = g.subjectRef?.name || g.subject || `Subject – ${i + 1}`;
      const bg = i % 2 === 0 ? '#fff' : '#f9fafb';
      const fmt = (v) => v != null ? String(v) : '';
      // Mark the overall row differently if it's the last
      return `<tr style="background:${bg}">
          <td class="td-subj">${subj}</td>
          <td class="td-grade">${fmt(g.quiz)}</td>
          <td class="td-grade">${fmt(g.assignment)}</td>
          <td class="td-grade">${fmt(g.midterm)}</td>
          <td class="td-grade">${fmt(g.final)}</td>
        </tr>`;
    }).join('')
    : `<tr><td class="td-subj" colspan="5" style="color:#9ca3af;font-style:italic;text-align:center">No grades recorded</td></tr>`;

  // ── Overall row (weighted average per subject if available) ──────────────
  const overallRow = `
    <tr style="background:#e5e7eb;font-weight:700">
      <td class="td-subj" style="font-weight:700">Overall</td>
      <td class="td-grade" colspan="4" style="font-weight:700;color:#1e293b">${avg}%&nbsp;&nbsp;${result}</td>
    </tr>`;

  // ── feedback lines ───────────────────────────────────────────────────────
  const feedbackText = [tComments, hRemarks].filter(Boolean).join(' — ') || '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Student Report Card — ${studentName}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #fff;
    color: #111;
    font-size: 11px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  @page { size: A4 portrait; margin: 8mm 10mm; }
  @media print { .toolbar { display: none !important; } }

  /* ── toolbar ──────────────────────────────── */
  .toolbar {
    background: #f1f5f9;
    border-bottom: 1px solid #e2e8f0;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'Segoe UI', sans-serif;
  }
  .btn-print {
    background: ${primary};
    color: #fff;
    border: none;
    padding: 8px 22px;
    border-radius: 5px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-close {
    background: #e2e8f0;
    color: #334155;
    border: none;
    padding: 8px 16px;
    border-radius: 5px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .toolbar-hint { font-size: 11px; color: #64748b; }

  /* ── page ─────────────────────────────────── */
  .page { max-width: 680px; margin: 0 auto; background: #fff; }

  /* ── header ───────────────────────────────── */
  .header {
    display: flex;
    align-items: stretch;
    min-height: 110px;
    position: relative;
    overflow: hidden;
    background: #fff;
  }

  /* Left dark panel with logo */
  .header-left {
    width: 130px;
    flex-shrink: 0;
    background: ${primary};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    position: relative;
    z-index: 2;
  }

  /* Diagonal teal accent */
  .header-accent {
    width: 60px;
    flex-shrink: 0;
    background: linear-gradient(to bottom right, ${primary} 0%, ${primary} 50%, #14b8a6 50%, #14b8a6 100%);
    position: relative;
    z-index: 1;
  }

  /* Right white area with title */
  .header-right {
    flex: 1;
    padding: 18px 20px 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: #fff;
  }

  .doc-title {
    font-size: 22px;
    font-weight: 900;
    color: #1e293b;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    line-height: 1;
    margin-bottom: 14px;
  }

  /* Info lines below title */
  .info-line {
    display: flex;
    gap: 28px;
    margin-bottom: 6px;
    font-size: 10.5px;
    color: #374151;
  }
  .info-field {
    display: flex;
    align-items: baseline;
    gap: 4px;
    white-space: nowrap;
  }
  .info-label { font-weight: 700; color: #374151; }
  .info-val {
    border-bottom: 1px solid #9ca3af;
    min-width: 90px;
    padding: 0 2px;
    color: #1e293b;
    font-weight: 600;
  }

  /* ── tables ───────────────────────────────── */
  .section { margin-top: 12px; }

  .tbl {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
  }

  .tbl-head th {
    background: ${primary};
    color: #fff;
    padding: 6px 8px;
    text-align: left;
    font-weight: 700;
    font-size: 10.5px;
    border: 1px solid ${primary};
  }
  .tbl-head th.center { text-align: center; }

  td { border: 1px solid #d1d5db; }
  .td-subj  { padding: 5px 8px; font-weight: 500; width: 38%; }
  .td-grade { padding: 5px 6px; text-align: center; width: 15.5%; }

  /* ── behavior table ───────────────────────── */
  .beh-title th {
    background: ${primary};
    color: #fff;
    padding: 6px 8px;
    font-weight: 700;
    font-size: 10.5px;
    text-align: left;
    border: 1px solid ${primary};
  }
  .beh-row td {
    padding: 5px 8px;
    font-size: 10.5px;
    border: 1px solid #d1d5db;
    min-height: 22px;
  }
  .beh-lbl { font-weight: 700; color: #374151; }
  .beh-val { color: #1e293b; font-weight: 600; }

  /* ── feedback ─────────────────────────────── */
  .feedback-label {
    font-weight: 700;
    font-size: 10.5px;
    margin-top: 12px;
    margin-bottom: 4px;
    color: #111;
  }
  .feedback-line {
    border-bottom: 1px solid #9ca3af;
    height: 16px;
    margin-bottom: 8px;
    width: 100%;
  }

  /* ── signatures ───────────────────────────── */
  .sig-row {
    display: flex;
    gap: 0;
    margin-top: 18px;
    padding-top: 0;
  }
  .sig-cell {
    flex: 1;
    text-align: center;
    padding: 0 10px;
    border-right: 1px solid #e5e7eb;
  }
  .sig-cell:last-child { border-right: none; }
  .sig-line {
    border-top: 1.5px solid #374151;
    margin-top: 36px;
    padding-top: 5px;
  }
  .sig-label { font-weight: 700; font-size: 10px; color: #374151; }

  /* ── footer ───────────────────────────────── */
  .footer {
    margin-top: 16px;
    border-top: 1px solid #d1d5db;
    padding-top: 6px;
    text-align: center;
    font-size: 8.5px;
    color: #9ca3af;
    font-style: italic;
  }
</style>
</head>
<body>

<!-- Toolbar (hidden on print) -->
<div class="toolbar">
  <button class="btn-print" onclick="window.print()">🖨 Print / Save as PDF</button>
  <button class="btn-close" onclick="window.close()">Close</button>
  <span class="toolbar-hint">In the print dialog, choose "Save as PDF" to download.</span>
</div>

<div class="page">

  <!-- ════════════════ HEADER ════════════════ -->
  <div class="header">
    <div class="header-left">
      ${logoBlock}
    </div>
    <div class="header-accent"></div>
    <div class="header-right">
      <div class="doc-title">Student Report Card</div>
      <div class="info-line">
        <div class="info-field">
          <span class="info-label">Name:</span>
          <span class="info-val">${studentName}</span>
        </div>
        <div class="info-field">
          <span class="info-label">School Year:</span>
          <span class="info-val">${year}</span>
        </div>
        <div class="info-field">
          <span class="info-label">Grade:</span>
          <span class="info-val">${grade}</span>
        </div>
      </div>
      <div class="info-line">
        <div class="info-field">
          <span class="info-label">Student ID:</span>
          <span class="info-val">${studentId}</span>
        </div>
        <div class="info-field">
          <span class="info-label">Date:</span>
          <span class="info-val">${today}</span>
        </div>
        <div class="info-field">
          <span class="info-label">Result:</span>
          <span class="info-val">${result}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ════════════════ GRADES TABLE ════════════════ -->
  <div class="section">
    <table class="tbl">
      <thead class="tbl-head">
        <tr>
          <th>Subject</th>
          <th class="center">Quiz (10%)</th>
          <th class="center">Assignment (20%)</th>
          <th class="center">Midterm (30%)</th>
          <th class="center">Final (40%)</th>
        </tr>
      </thead>
      <tbody>
        ${gradeRows}
        ${overallRow}
      </tbody>
    </table>
  </div>

  <!-- ════════════════ OVERALL BEHAVIOR ════════════════ -->
  <div class="section">
    <table class="tbl" style="border:1px solid #d1d5db">
      <thead class="beh-title">
        <tr><th colspan="4" style="border:1px solid ${primary}">Overall Behavior</th></tr>
      </thead>
      <tbody>
        <tr class="beh-row">
          <td style="width:22%" class="beh-lbl">Absences:</td>
          <td style="width:28%" class="beh-val">${absent}</td>
          <td style="width:22%" class="beh-lbl">Tardies:</td>
          <td style="width:28%" class="beh-val">${late}</td>
        </tr>
        <tr class="beh-row">
          <td class="beh-lbl">Present Days:</td>
          <td class="beh-val">${present} / ${totalAtt}</td>
          <td class="beh-lbl">Attendance:</td>
          <td class="beh-val">${attPct}%</td>
        </tr>
        <tr class="beh-row">
          <td class="beh-lbl">Conduct Grade:</td>
          <td class="beh-val">${conduct}</td>
          <td class="beh-lbl">Overall Class Rank:</td>
          <td class="beh-val">${rank}${gpaEnabled ? `&nbsp;&nbsp;GPA: ${gpa}` : ''}</td>
        </tr>
        <tr class="beh-row">
          <td class="beh-lbl">Promotion:</td>
          <td class="beh-val" colspan="3">${promotion}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ════════════════ TEACHER FEEDBACK ════════════════ -->
  <div class="feedback-label">Teacher's Feedback:</div>
  <div class="feedback-line">${feedbackText}</div>
  <div class="feedback-line"></div>
  <div class="feedback-line"></div>

  <!-- ════════════════ SIGNATURES ════════════════ -->
  <div class="sig-row">
    <div class="sig-cell">
      <div class="sig-line">
        <div class="sig-label">Class Teacher Signature</div>
      </div>
    </div>
    <div class="sig-cell">
      <div class="sig-line">
        <div class="sig-label">Principal Signature</div>
      </div>
    </div>
    <div class="sig-cell">
      <div class="sig-line">
        <div class="sig-label">Parent's Signature</div>
      </div>
    </div>
  </div>

  <!-- ════════════════ FOOTER ════════════════ -->
  <div class="footer">
    ${school}${schoolAm ? ' · ' + schoolAm : ''} &nbsp;|&nbsp; ${year} &nbsp;|&nbsp; This is an official document. Any alteration renders it invalid.
  </div>

</div><!-- /page -->
</body>
</html>`;

  const win = preOpenedWindow || window.open('', '_blank', 'width=800,height=700,scrollbars=yes');
  if (!win) {
    alert('Popup blocked — please allow popups for this site and try again.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
}
