import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../api/axios';
import { toast } from 'react-toastify';

const STEPS = [
  { key: 'student', label: 'Student Info', icon: <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z" /> },
  { key: 'parent', label: 'Parent Info', icon: <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 19c0-2.7 3.1-4 6-4s6 1.3 6 4v1H2v-1zm14.5-3.9c1.8.5 3.5 1.6 3.5 3.9v1h-4v-1c0-1.2-.5-2.2-1.3-3 .6-.4 1.2-.7 1.8-.9z" /> },
  { key: 'enrollment', label: 'Enrollment', icon: <path d="M12 3 1 9l11 6 9-4.9V17h2V9L12 3zM5 13.2v3.3l7 3.8 7-3.8v-3.3L12 17l-7-3.8z" /> },
  { key: 'documents', label: 'Documents', icon: <path d="M6 2h9l5 5v15H6V2zm8 1.5V8h4.5z" /> },
  { key: 'review', label: 'Review', icon: <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" /> },
];

const blank = {
  firstName: '', fatherName: '', grandfatherName: '',
  email: '', dateOfBirth: '', gender: '', address: '',
  parentFirst: '', parentFather: '', parentGrandfather: '',
  parentRelationship: '', parentEmail: '', parentPhone: '', parentOccupation: '',
  emergencyName: '', emergencyPhone: '',
  grade: '', section: '', classId: '', transport: false,
  consent: false,
};

const splitNameParts = (name = '') => {
  const [firstName = '', fatherName = '', ...rest] = String(name).trim().split(/\s+/).filter(Boolean);
  return { firstName, fatherName, grandfatherName: rest.join(' ') };
};

const noteValue = (notes = '', label) => {
  const item = String(notes).split(' • ').find((entry) => entry.startsWith(`${label}:`));
  return item ? item.replace(`${label}:`, '').trim() : '';
};

const labelCls = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5';

export default function StudentRegistrationWizard() {
  const navigate = useNavigate();
  const { id: studentId } = useParams();
  const isEditMode = Boolean(studentId);
  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState(blank);
  const [gradeFees, setGradeFees] = useState([]);
  const [classes, setClasses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [emailStatus, setEmailStatus] = useState([]);
  const [activeYear, setActiveYear] = useState(null);
  // Uploaded document metadata, keyed by document type.
  const [docs, setDocs] = useState({});

  // Registration is blocked when there is no active year or its window is closed.
  // Editing an existing student is always allowed (it does not create a new enrollment).
  const registrationClosed = !isEditMode && !(activeYear && activeYear.registrationOpen);

  const uploadDoc = async (key, file) => {
    if (!file) return;
    setDocs((d) => ({ ...d, [key]: { name: file.name, status: 'uploading' } }));
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await axios.post('/uploads', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDocs((d) => ({ ...d, [key]: { name: res.data.originalName, url: res.data.url, size: res.data.size, status: 'done' } }));
      toast.success(`${key} uploaded.`);
    } catch (err) {
      setDocs((d) => ({ ...d, [key]: { name: file.name, status: 'error', error: err.response?.data?.message } }));
      toast.error(err.response?.data?.message || 'Upload failed.');
    }
  };

  const removeDoc = (key) => setDocs((d) => { const next = { ...d }; delete next[key]; return next; });

  useEffect(() => {
    axios.get('/students/grade-fee').then((r) => setGradeFees(r.data || [])).catch(() => {});
    axios.get('/students/classes').then((r) => setClasses(r.data || [])).catch(() => setClasses([]));
    axios.get('/academic-years')
      .then((r) => setActiveYear((r.data || []).find((y) => y.isActive) || null))
      .catch(() => setActiveYear(null));
  }, []);

  useEffect(() => {
    if (!isEditMode) return;

    setLoadingStudent(true);
    axios.get(`/students/${studentId}`)
      .then((res) => {
        const student = res.data || {};
        const studentName = splitNameParts(student.user?.name || '');
        const primaryGuardian = (student.guardianContacts || []).find((contact) => contact.primary) || student.guardianContacts?.[0] || student.guardians?.[0] || {};
        const guardianName = splitNameParts(primaryGuardian.fullName || '');
        const notes = student.familyBackground?.notes || '';

        setForm({
          ...blank,
          ...studentName,
          email: student.user?.email || '',
          dateOfBirth: student.personalDetails?.dateOfBirth ? String(student.personalDetails.dateOfBirth).slice(0, 10) : '',
          gender: student.personalDetails?.gender || '',
          address: student.personalDetails?.address || primaryGuardian.address || '',
          parentFirst: guardianName.firstName,
          parentFather: guardianName.fatherName,
          parentGrandfather: guardianName.grandfatherName,
          parentRelationship: primaryGuardian.relationship || '',
          parentEmail: primaryGuardian.email || '',
          parentPhone: primaryGuardian.phone || student.personalDetails?.phone || '',
          parentOccupation: student.familyBackground?.occupation || '',
          emergencyName: noteValue(notes, 'Emergency').replace(/\s*\([^)]*\)\s*$/, ''),
          emergencyPhone: noteValue(notes, 'Emergency').match(/\(([^)]*)\)/)?.[1] || '',
          grade: student.grade || '',
          section: noteValue(notes, 'Section'),
          classId: student.classes?.[0]?.id || student.classes?.[0]?._id || '',
          transport: notes.includes('Transport: Yes'),
          consent: true,
        });
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Failed to load student details.');
        navigate('/students');
      })
      .finally(() => setLoadingStudent(false));
  }, [isEditMode, navigate, studentId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  const selectedFee = useMemo(
    () => gradeFees.find((g) => String(g.grade) === String(form.grade)),
    [gradeFees, form.grade],
  );
  const selectedClass = useMemo(
    () => classes.find((c) => (c.id || c._id) === form.classId),
    [classes, form.classId],
  );
  const fullName = [form.firstName, form.fatherName, form.grandfatherName].filter(Boolean).join(' ');
  const parentName = [form.parentFirst, form.parentFather, form.parentGrandfather].filter(Boolean).join(' ');

  const canProceed = () => {
    if (step.key === 'student') return form.firstName && form.fatherName;
    if (step.key === 'enrollment') return !!form.grade && (classes.length === 0 || !!form.classId);
    if (step.key === 'review') return form.consent;
    return true;
  };

  const handleSubmit = async () => {
    if (registrationClosed) {
      return toast.error(
        activeYear
          ? `Registration for ${activeYear.year} is currently closed.`
          : 'No active academic year. Registration is closed.'
      );
    }
    if (!form.consent) return toast.error('Please confirm the declaration before submitting.');
    setSubmitting(true);
    try {
      const payload = {
        name: fullName,
        email: form.email || undefined,
        grade: form.grade,
        classId: form.classId || undefined,
        personalDetails: {
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          phone: form.parentPhone,
          address: form.address,
        },
        familyBackground: {
          fatherName: form.fatherName,
          guardianName: parentName,
          occupation: form.parentOccupation,
          notes: [
            form.section ? `Section: ${form.section}` : '',
            form.transport ? 'Transport: Yes' : '',
            form.emergencyName ? `Emergency: ${form.emergencyName} (${form.emergencyPhone})` : '',
            ...Object.entries(docs).filter(([, d]) => d.status === 'done').map(([k, d]) => `${k}: ${d.url}`),
          ].filter(Boolean).join(' • '),
        },
        parent: {
          fullName: parentName,
          email: form.parentEmail,
          phone: form.parentPhone,
          relationship: form.parentRelationship,
          address: form.address,
        },
      };

      const res = isEditMode
        ? await axios.put(`/students/${studentId}`, payload)
        : await axios.post('/students', payload);

      if (isEditMode) {
        toast.success('Student updated successfully!');
        navigate('/students');
        return;
      }

      setCredentials({
        ...(res.data?.credentials || {}),
        parentCredentials: res.data?.parentCredentials || null,
        guardianCredentials: res.data?.guardianCredentials || [],
      });
      setEmailStatus(res.data?.guardianEmailStatus || []);
      toast.success('Registration submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || (isEditMode ? 'Student update failed.' : 'Registration failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStudent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">
        Loading student details…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
          <div className="flex items-center gap-3 px-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 1 9l11 6 9-4.9V17h2V9L12 3z" /></svg>
            </span>
              <div>
                <div className="text-base font-black leading-tight">{isEditMode ? 'Edit Student' : 'Student Registration'}</div>
                <div className="text-xs text-slate-400">Academic Year {activeYear?.year || '—'}</div>
              </div>
          </div>
          <nav className="mt-8 flex-1 space-y-1.5">
            {STEPS.map((s, i) => {
              const active = i === stepIdx;
              const done = i < stepIdx;
              return (
                <button
                  key={s.key}
                  onClick={() => setStepIdx(i)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <svg className={`h-5 w-5 ${done ? 'text-emerald-600' : ''}`} viewBox="0 0 24 24" fill="currentColor">{done ? <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /> : s.icon}</svg>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
            <div className="text-lg font-black">EduAdmin Pro</div>
            <div className="flex items-center gap-3">
              {!isEditMode && <button className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">Save Draft</button>}
              <button onClick={() => navigate(-1)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900">Exit</button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
            {registrationClosed && (
              <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-5 py-4">
                <div className="text-sm font-bold text-amber-900">Registration is closed</div>
                <div className="mt-0.5 text-xs text-amber-800">
                  {activeYear
                    ? `The registration period for ${activeYear.year} is not currently open. Submissions are disabled until a SuperAdmin opens or extends the registration window.`
                    : 'There is no active academic year. A SuperAdmin must activate a year and open its registration window before new students can be registered.'}
                </div>
              </div>
            )}
            {/* Step progress (mobile) */}
            <div className="mb-6 flex gap-2 lg:hidden">
              {STEPS.map((s, i) => (
                <div key={s.key} className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? 'bg-slate-900' : 'bg-slate-200'}`} />
              ))}
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{isEditMode ? 'Edit' : `Step ${stepIdx + 1}:`} {step.label === 'Student Info' ? 'Student Information' : step.label === 'Parent Info' ? 'Parent / Guardian Information' : step.label === 'Documents' ? 'Document Upload' : step.label === 'Review' ? 'Review & Submit' : 'Academic Placement'}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {step.key === 'student' && 'Enter the legal personal details of the student as they appear on official identity documents.'}
              {step.key === 'parent' && "Provide primary and emergency contact details for the student's legal guardians."}
              {step.key === 'enrollment' && 'Select the academic year, grade, and section placement.'}
              {step.key === 'documents' && 'Upload scanned copies of the required documents (PDF or JPEG).'}
              {step.key === 'review' && 'Please verify all details before finalizing the registration.'}
            </p>

            <div className="mt-6">
              {credentials ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
                  </div>
                  <h2 className="mt-4 text-xl font-black text-emerald-900">Student Registered!</h2>
                  <p className="mt-1 text-sm text-emerald-800">Share these login credentials with the student and parent.</p>
                  <div className="mx-auto mt-4 max-w-md rounded-xl border border-emerald-200 bg-white p-4 text-left text-sm">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Student Account</div>
                      <div className="flex justify-between py-1"><span className="font-semibold text-slate-500">Student ID</span><span className="font-mono font-bold">{credentials.studentId}</span></div>
                      <div className="flex justify-between py-1"><span className="font-semibold text-slate-500">Password</span><span className="font-mono font-bold">{credentials.password}</span></div>
                    </div>

                    {credentials.parentCredentials && (
                      <div className="mt-3 rounded-lg border border-slate-200 p-3">
                        <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Parent Account</div>
                        <div className="flex justify-between py-1"><span className="font-semibold text-slate-500">Parent ID</span><span className="font-mono font-bold">{credentials.parentCredentials.parentId}</span></div>
                        {credentials.parentCredentials.email && (
                          <div className="flex justify-between py-1"><span className="font-semibold text-slate-500">Email</span><span className="font-mono font-bold">{credentials.parentCredentials.email}</span></div>
                        )}
                        <div className="flex justify-between py-1"><span className="font-semibold text-slate-500">Password</span><span className="font-mono font-bold">{credentials.parentCredentials.password || 'Existing password unchanged'}</span></div>
                      </div>
                    )}

                    <div className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-700">Please change the password after first login.</div>
                  </div>
                  <button onClick={() => { setForm(blank); setCredentials(null); setEmailStatus([]); setStepIdx(0); }} className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white">Register Another</button>

                  {emailStatus.length > 0 && (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm shadow-sm">
                      <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Guardian email delivery status</div>
                      <div className="space-y-3">
                        {emailStatus.map((status, index) => (
                          <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                              <span>{status.email || 'No guardian email'}</span>
                              <span className={status.status === 'sent' ? 'text-emerald-600' : status.status === 'failed' ? 'text-rose-600' : 'text-slate-500'}>{status.status}</span>
                            </div>
                            {status.reason && <div className="mt-1 text-xs text-slate-500">{status.reason}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {step.key === 'student' && (
                    <div className="space-y-6">
                      <Card title="Personal Identity">
                        <div className="grid gap-5 sm:grid-cols-3">
                          <Field label="First Name"><input className={inputCls} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Abebe" /></Field>
                          <Field label="Father's Name"><input className={inputCls} value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} placeholder="Kebede" /></Field>
                          <Field label="Grandfather's Name"><input className={inputCls} value={form.grandfatherName} onChange={(e) => set('grandfatherName', e.target.value)} placeholder="Demissie" /></Field>
                        </div>
                      </Card>
                      <div className="grid gap-5 lg:grid-cols-2">
                        <Card title="Biographical Data">
                          <Field label="Date of Birth"><input type="date" className={inputCls} value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} /></Field>
                          <div className="mt-4">
                            <span className={labelCls}>Gender</span>
                            <div className="flex gap-3">
                              {['Male', 'Female'].map((g) => (
                                <button key={g} onClick={() => set('gender', g)} className={`flex-1 rounded-lg border px-4 py-3 text-sm font-semibold transition ${form.gender === g ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>{g}</button>
                              ))}
                            </div>
                          </div>
                          <div className="mt-4">
                            <Field label="Student Email (optional)"><input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="student@email.com" /></Field>
                          </div>
                        </Card>
                        <Card title="Contact & Location">
                          <Field label="Home Address"><textarea rows={6} className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Woreda, House No, Street Address..." /></Field>
                        </Card>
                      </div>
                    </div>
                  )}

                  {step.key === 'parent' && (
                    <Card title="Primary Guardian">
                      <div className="grid gap-5 sm:grid-cols-3">
                        <Field label="First Name"><input className={inputCls} value={form.parentFirst} onChange={(e) => set('parentFirst', e.target.value)} placeholder="e.g. Abebe" /></Field>
                        <Field label="Father's Name"><input className={inputCls} value={form.parentFather} onChange={(e) => set('parentFather', e.target.value)} placeholder="e.g. Bekele" /></Field>
                        <Field label="Grandfather's Name"><input className={inputCls} value={form.parentGrandfather} onChange={(e) => set('parentGrandfather', e.target.value)} placeholder="e.g. Lemma" /></Field>
                      </div>
                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <Field label="Relationship to Student">
                          <select className={inputCls} value={form.parentRelationship} onChange={(e) => set('parentRelationship', e.target.value)}>
                            <option value="">Select Relationship</option>
                            {['Father', 'Mother', 'Guardian', 'Sibling', 'Other'].map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </Field>
                        <Field label="Email Address"><input type="email" className={inputCls} value={form.parentEmail} onChange={(e) => set('parentEmail', e.target.value)} placeholder="example@email.com" /></Field>
                        <Field label="Primary Contact Number"><input className={inputCls} value={form.parentPhone} onChange={(e) => set('parentPhone', e.target.value)} placeholder="+251 911 223 344" /></Field>
                        <Field label="Occupation"><input className={inputCls} value={form.parentOccupation} onChange={(e) => set('parentOccupation', e.target.value)} placeholder="e.g. Civil Engineer" /></Field>
                      </div>
                      <div className="mt-6 border-t border-slate-200 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900"><span className="text-rose-500">*</span> Emergency Contact Detail</h4>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <Field label="Full Name (Emergency)"><input className={inputCls} value={form.emergencyName} onChange={(e) => set('emergencyName', e.target.value)} placeholder="Contact Person Name" /></Field>
                          <Field label="Emergency Phone Number"><input className={inputCls} value={form.emergencyPhone} onChange={(e) => set('emergencyPhone', e.target.value)} placeholder="+251 912 345 678" /></Field>
                        </div>
                      </div>
                    </Card>
                  )}

                  {step.key === 'enrollment' && (
                    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
                      <Card title="Academic Placement">
                        <Field label="Academic Year"><select className={inputCls} disabled><option>{activeYear?.year ? `${activeYear.year} Academic Year` : 'No active academic year'}</option></select></Field>
                        <div className="mt-5">
                          <span className={labelCls}>Grade Level Selection</span>
                          <div className="grid grid-cols-4 gap-3">
                            {(gradeFees.length ? gradeFees.map((g) => String(g.grade)) : ['9', '10', '11', '12']).map((g) => (
                              <button key={g} onClick={() => set('grade', g)} className={`rounded-xl border py-4 text-center transition ${String(form.grade) === String(g) ? 'border-slate-900 bg-slate-100' : 'border-slate-300 hover:bg-slate-50'}`}>
                                <div className="text-xl font-black">{String(g).replace(/\D/g, '') || g}</div>
                                <div className="text-xs text-slate-400">Grade</div>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="mt-5">
                          <Field label="Assigned Class">
                            <select className={inputCls} value={form.classId} onChange={(e) => set('classId', e.target.value)}>
                              <option value="">{classes.length ? 'Select a class…' : 'No classes available yet'}</option>
                              {classes.map((c) => (
                                <option key={c.id || c._id} value={c.id || c._id}>
                                  {c.name}{c.subject ? ` — ${c.subject}` : ''}{c.teacherName ? ` (${c.teacherName})` : ' (no teacher assigned)'}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <p className="mt-1.5 text-xs text-slate-400">Determines which teacher's roster the student appears in.</p>
                        </div>
                        <div className="mt-5">
                          <Field label="Section (optional)"><input className={inputCls} value={form.section} onChange={(e) => set('section', e.target.value)} placeholder="e.g. Section A" /></Field>
                        </div>
                        <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-slate-700">
                          <input type="checkbox" checked={form.transport} onChange={(e) => set('transport', e.target.checked)} className="h-4 w-4" />
                          Requires school transport service
                        </label>
                      </Card>
                      <div className="rounded-2xl bg-slate-900 p-6 text-white">
                        <h3 className="text-lg font-bold">Capacity Analytics</h3>
                        <p className="text-sm text-slate-400">Real-time enrollment metrics{form.grade ? ` for Grade ${form.grade}` : ''}.</p>
                        <div className="mt-5 rounded-xl bg-white/5 p-4">
                          <div className="text-xs font-semibold uppercase text-slate-400">Registration Summary</div>
                          <div className="mt-2 space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-slate-400">Grade</span><span className="font-bold">{form.grade || '—'}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Section</span><span className="font-bold">{form.section || '—'}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Tuition (ETB)</span><span className="font-bold">{selectedFee ? `ETB ${Number(selectedFee.amount).toLocaleString()}` : '—'}</span></div>
                          </div>
                        </div>
                        <p className="mt-4 text-xs text-slate-400">Section assignments are prioritized by date of registration completion.</p>
                      </div>
                    </div>
                  )}

                  {step.key === 'documents' && (
                    <div className="grid gap-5 lg:grid-cols-2">
                      {['Birth Certificate', 'School Transcript', 'National ID / Kebele ID', 'Student Photo'].map((doc) => {
                        const state = docs[doc];
                        return (
                          <Card key={doc} title={doc}>
                            {state?.status === 'done' ? (
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                <div className="flex items-center gap-3">
                                  <svg className="h-7 w-7 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h9l5 5v15H6V2zm8 1.5V8h4.5z" /></svg>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-bold text-slate-900">{state.name}</div>
                                    <div className="text-xs text-emerald-700">{(state.size / 1024 / 1024).toFixed(2)} MB · Verified</div>
                                  </div>
                                </div>
                                <div className="mt-3 flex gap-3 text-xs font-bold">
                                  <a href={state.url} target="_blank" rel="noreferrer" className="text-slate-600 hover:underline">VIEW</a>
                                  <button onClick={() => removeDoc(doc)} className="text-rose-600 hover:underline">REMOVE</button>
                                </div>
                              </div>
                            ) : (
                              <label className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 text-center transition ${state?.status === 'error' ? 'border-rose-300 bg-rose-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'}`}>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => uploadDoc(doc, e.target.files?.[0])} />
                                {state?.status === 'uploading' ? (
                                  <p className="text-sm font-semibold text-slate-600">Uploading…</p>
                                ) : state?.status === 'error' ? (
                                  <>
                                    <svg className="h-9 w-9 text-rose-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 7 7h3v6h4V7h3l-5-5zM5 18h14v2H5z" /></svg>
                                    <p className="mt-2 text-sm font-bold text-rose-600">{state.error || 'Upload failed'}</p>
                                    <p className="text-xs text-slate-400">Click to try again (PDF/JPG/PNG)</p>
                                  </>
                                ) : (
                                  <>
                                    <svg className="h-9 w-9 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 7 7h3v6h4V7h3l-5-5zM5 18h14v2H5z" /></svg>
                                    <p className="mt-2 text-sm font-semibold text-slate-600">Drag and drop or <span className="font-bold underline">browse</span></p>
                                    <p className="mt-1 text-[10px] uppercase text-slate-400">Max 5MB · PDF, JPG, PNG</p>
                                  </>
                                )}
                              </label>
                            )}
                          </Card>
                        );
                      })}
                      <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{Object.values(docs).filter((d) => d.status === 'done').length}/4 uploaded.</span> Files are stored securely and linked to the registration on submit.
                      </div>
                    </div>
                  )}

                  {step.key === 'review' && (
                    <div className="space-y-5">
                      <ReviewCard title="Student Information" onEdit={() => setStepIdx(0)} rows={[
                        ['Full Name', fullName || '—'], ['Gender', form.gender || '—'],
                        ['Date of Birth', form.dateOfBirth || '—'], ['Email', form.email || '—'],
                        ['Address', form.address || '—'],
                      ]} />
                      <ReviewCard title="Parent / Guardian Information" onEdit={() => setStepIdx(1)} rows={[
                        ['Primary Guardian', parentName || '—'], ['Relationship', form.parentRelationship || '—'],
                        ['Phone', form.parentPhone || '—'], ['Email', form.parentEmail || '—'],
                        ['Emergency Contact', form.emergencyName ? `${form.emergencyName} (${form.emergencyPhone})` : '—'],
                      ]} />
                      <ReviewCard title="Enrollment Details" onEdit={() => setStepIdx(2)} rows={[
                        ['Target Grade', form.grade ? `Grade ${form.grade}` : '—'],
                        ['Assigned Class', selectedClass ? `${selectedClass.name}${selectedClass.teacherName ? ` (${selectedClass.teacherName})` : ''}` : '—'],
                        ['Section', form.section || '—'],
                        ['Transport Service', form.transport ? 'Yes' : 'No'],
                        ['Tuition (ETB)', selectedFee ? `ETB ${Number(selectedFee.amount).toLocaleString()}` : '—'],
                      ]} />
                      <label className="flex items-start gap-3 rounded-2xl bg-slate-900 p-5 text-sm text-white">
                        <input type="checkbox" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} className="mt-0.5 h-4 w-4" />
                        <span>I verify that all the information provided in this application is accurate and true. I understand that any false information may lead to cancellation of the registration.</span>
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer nav */}
            {!credentials && (
              <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
                <button
                  onClick={() => (stepIdx === 0 ? navigate(-1) : setStepIdx((i) => i - 1))}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
                >
                  ← {stepIdx === 0 ? (isEditMode ? 'Cancel Edit' : 'Cancel Registration') : 'Previous'}
                </button>
                {isLast ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !form.consent || registrationClosed}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-40"
                  >
                    {submitting ? (isEditMode ? 'Saving…' : 'Submitting…') : (isEditMode ? 'Save Changes' : 'Submit Registration')} →
                  </button>
                ) : (
                  <button
                    onClick={() => canProceed() ? setStepIdx((i) => i + 1) : toast.error('Please complete the required fields.')}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Next Step →
                  </button>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 flex items-center gap-2 text-base font-bold text-slate-900">
        <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v4H4V4zm0 6h16v10H4V10z" /></svg>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ReviewCard({ title, rows, onEdit }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <button onClick={onEdit} className="text-sm font-semibold text-slate-500 hover:text-slate-900">✎ Edit</button>
      </div>
      <dl className="grid gap-4 sm:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{k}</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
