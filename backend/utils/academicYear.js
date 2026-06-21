// Shared academic-year registration logic.
// Registration is open only while the ACTIVE year's date window covers "now".
// Used by both the academic-year controller (to report status) and the student
// registration gate (to enforce it).
function isRegistrationOpen(year, now = new Date()) {
  if (!year || !year.isActive) return false;
  if (!year.registrationStart || !year.registrationEnd) return false;

  const start = new Date(year.registrationStart);
  const end = new Date(year.registrationEnd);
  end.setHours(23, 59, 59, 999); // include the whole closing day

  return now >= start && now <= end;
}

module.exports = { isRegistrationOpen };
