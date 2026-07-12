import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import AdminLayout from '../../components/AdminLayout';

const FINANCIAL_STYLES = {
  cleared: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-700',
  pending: 'bg-orange-50 text-orange-700',
  neutral: 'bg-gray-100 text-gray-600',
};

const FinancialBadge = ({ status }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${FINANCIAL_STYLES[status.tone]}`}>
    {status.label}
  </span>
);

const AccountBadge = ({ status }) => {
  const isActive = status === 'Active';
  const isRestricted = status === 'Restricted';
  return (
    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 bg-gray-50">
      <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-emerald-500' : isRestricted ? 'bg-rose-500' : 'bg-gray-400'}`} />
      {status}
    </div>
  );
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const getPrimaryGuardian = (student) => {
  const contacts = Array.isArray(student.guardianContacts) ? student.guardianContacts : [];
  const primary = contacts.find((c) => c.primary) || contacts[0];
  return primary || (Array.isArray(student.guardians) ? student.guardians[0] : null) || null;
};

const parseFamilyBackgroundNotes = (notes = '') => {
  const parts = String(notes || '').split(' • ').map((item) => item.trim()).filter(Boolean);
  const result = {
    nationalId: '',
    studentPhotoUrl: '',
    nationalIdDocumentUrl: '',
    transport: false,
    emergencyContact: '',
    otherNotes: []
  };

  parts.forEach((item) => {
    const [key, ...rest] = item.split(':');
    if (!key) return;
    const label = key.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (/^national id( \/ kebele id)?$/i.test(label)) {
      result.nationalId = value;
      return;
    }
    if (/^student photo$/i.test(label)) {
      result.studentPhotoUrl = value;
      return;
    }
    if (/^(national id document|national id file|id document)$/i.test(label)) {
      result.nationalIdDocumentUrl = value;
      return;
    }
    if (/^transport$/i.test(label)) {
      result.transport = value.toLowerCase().startsWith('yes');
      result.otherNotes.push(item);
      return;
    }
    if (/^emergency$/i.test(label)) {
      result.emergencyContact = value;
      return;
    }

    result.otherNotes.push(item);
  });

  return result;
};

const buildFamilyBackgroundNotes = ({ familyNotes = '', nationalId, studentPhotoUrl, nationalIdDocumentUrl }) => {
  const preserved = String(familyNotes)
    .split(' • ')
    .map((item) => item.trim())
    .filter((item) => item && !/^(national id( \/ kebele id)?):/i.test(item) && !/^student photo:/i.test(item) && !/^(national id document|national id file|id document):/i.test(item));

  if (nationalId) {
    preserved.push(`National ID / Kebele ID: ${nationalId}`);
  }
  if (studentPhotoUrl) {
    preserved.push(`Student Photo: ${studentPhotoUrl}`);
  }
  if (nationalIdDocumentUrl) {
    preserved.push(`National ID Document: ${nationalIdDocumentUrl}`);
  }

  return preserved.join(' • ');
};

const buildFormFromStudent = (student) => {
  const guardian = getPrimaryGuardian(student) || {};
  const familyBackground = student.familyBackground || {};
  const notes = parseFamilyBackgroundNotes(familyBackground.notes);

  const emergencyContacts = student.personalDetails?.emergencyContacts;
  const emergencyValue = Array.isArray(emergencyContacts)
    ? emergencyContacts.join(', ')
    : emergencyContacts || '';

  return {
    name: student.user?.name || student.name || '',
    email: student.user?.email || '',
    classId: student.classes?.[0]?.id || '',
    grade: student.grade || '',
    phone: student.personalDetails?.phone || '',
    dateOfBirth: student.personalDetails?.dateOfBirth ? String(student.personalDetails?.dateOfBirth).slice(0, 10) : '',
    gender: student.personalDetails?.gender || '',
    address: student.personalDetails?.address || '',
    previousSchool: student.personalDetails?.previousSchool || '',
    emergencyContacts: emergencyValue,
    fatherName: familyBackground.fatherName || '',
    motherName: familyBackground.motherName || '',
    familyGuardianName: familyBackground.guardianName || '',
    occupation: familyBackground.occupation || '',
    familyNotes: notes.otherNotes.join(' • ') || '',
    nationalId: notes.nationalId || '',
    studentPhotoUrl: notes.studentPhotoUrl || '',
    nationalIdDocumentUrl: notes.nationalIdDocumentUrl || '',
    guardianFullName: guardian.fullName || '',
    guardianEmail: guardian.email || '',
    guardianPhone: guardian.phone || '',
    guardianRelationship: guardian.relationship || 'Guardian',
    guardianAddress: guardian.address || ''
  };
};

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [classes, setClasses] = useState([]);
  const [financial, setFinancial] = useState({ label: 'No Fees', tone: 'neutral' });
  const [accountStatus, setAccountStatus] = useState('Active');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingIdDocument, setUploadingIdDocument] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    classId: '',
    grade: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    previousSchool: '',
    emergencyContacts: '',
    fatherName: '',
    motherName: '',
    familyGuardianName: '',
    occupation: '',
    familyNotes: '',
    nationalId: '',
    studentPhotoUrl: '',
    nationalIdDocumentUrl: '',
    guardianFullName: '',
    guardianEmail: '',
    guardianPhone: '',
    guardianRelationship: 'Guardian',
    guardianAddress: ''
  });

  const loadStudent = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await axios.get(`/students/${id}`);
      const data = res.data || {};
      setStudent(data);
      setFormData(buildFormFromStudent(data));

      const fees = Array.isArray(data.fees) ? data.fees : [];
      const unpaid = fees.filter((f) => !f.paid);
      if (!fees.length) {
        setFinancial({ label: 'No Fees', tone: 'neutral' });
      } else if (!unpaid.length) {
        setFinancial({ label: 'Cleared', tone: 'cleared' });
      } else {
        const outstanding = unpaid.reduce((sum, f) => sum + Number(f.amount || 0), 0);
        const overdue = unpaid.some((f) => f.dueDate && new Date(f.dueDate).getTime() < Date.now());
        setFinancial({ label: `${overdue ? 'Overdue' : 'Pending'} (ETB ${outstanding.toLocaleString()})`, tone: overdue ? 'overdue' : 'pending' });
      }

      setAccountStatus(data.user?.isActive ?? true ? 'Active' : 'Inactive');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load student profile.');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const res = await axios.get('/students/classes');
      setClasses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setClasses([]);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    loadStudent();
  }, [id]);

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleFileUpload = async (field, file) => {
    if (!file) return;
    const isPhoto = field === 'studentPhotoUrl';
    const isIdDoc = field === 'nationalIdDocumentUrl';

    if (!isPhoto && !isIdDoc) return;

    if (isPhoto) setUploadingPhoto(true);
    if (isIdDoc) setUploadingIdDocument(true);

    try {
      const body = new FormData();
      body.append('file', file);
      const res = await axios.post('/uploads', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateField(field, res.data.url);
      toast.success(`${isPhoto ? 'Student photo' : 'ID document'} uploaded successfully.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'File upload failed.');
    } finally {
      if (isPhoto) setUploadingPhoto(false);
      if (isIdDoc) setUploadingIdDocument(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!student) return;

    setSaving(true);
    try {
      const currentNotes = parseFamilyBackgroundNotes(student.familyBackground?.notes);
      const payload = {
        name: formData.name,
        email: formData.email,
        classId: formData.classId || undefined,
        grade: formData.classId ? undefined : formData.grade || undefined,
        personalDetails: {
          phone: formData.phone || undefined,
          dateOfBirth: formData.dateOfBirth || undefined,
          gender: formData.gender || undefined,
          address: formData.address || undefined,
          previousSchool: formData.previousSchool || undefined,
          emergencyContacts: formData.emergencyContacts || undefined
        },
        familyBackground: {
          fatherName: formData.fatherName || undefined,
          motherName: formData.motherName || undefined,
          guardianName: formData.familyGuardianName || undefined,
          occupation: formData.occupation || undefined,
          notes: buildFamilyBackgroundNotes({
            familyNotes: formData.familyNotes || currentNotes.otherNotes.join(' • '),
            nationalId: formData.nationalId,
            studentPhotoUrl: formData.studentPhotoUrl,
            nationalIdDocumentUrl: formData.nationalIdDocumentUrl
          }) || undefined
        },
        guardians: [
          {
            fullName: formData.guardianFullName,
            email: formData.guardianEmail,
            phone: formData.guardianPhone,
            relationship: formData.guardianRelationship,
            address: formData.guardianAddress
          }
        ]
      };

      const res = await axios.put(`/students/${id}`, payload);
      setStudent(res.data.student || res.data);
      setFormData(buildFormFromStudent(res.data.student || res.data));
      setIsEditing(false);
      toast.success('Student profile updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student profile.');
    } finally {
      setSaving(false);
    }
  };

  const guardian = getPrimaryGuardian(student || {});
  const studentName = student?.user?.name || student?.name || 'Unknown Student';
  const initials = studentName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <AdminLayout pageTitle="Student Profile">
        <div className="py-20 text-center text-gray-500">Loading student profile…</div>
      </AdminLayout>
    );
  }

  if (!student) {
    return (
      <AdminLayout pageTitle="Student Profile">
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center text-gray-500">
          Student not found.
          <button onClick={() => navigate('/admin/students')} className="mt-6 inline-flex rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Back to students
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Student Profile" headerAction={
      isEditing ? (
        <div className="flex items-center gap-2">
          <button
            onClick={handleEditSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => { setIsEditing(false); setFormData(buildFormFromStudent(student)); }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 20l.5-4L16.5 3.5z"/></svg>
          Edit Profile
        </button>
      )
    }>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/admin/students')}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          ← Back to students
        </button>
      </div>
      <div className="space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900 text-3xl font-black text-white">{initials}</div>
              <div>
                <div className="text-sm uppercase tracking-[0.24em] text-gray-500">Student Profile</div>
                <h1 className="mt-2 text-3xl font-black text-slate-900">{studentName}</h1>
                <p className="mt-1 text-sm text-gray-500">ID: {student.studentId || '—'} · Grade {student.grade || '—'}{student.stream ? ` (${student.stream})` : ''}{student.section ? ` · ${student.section}` : ''}</p>
                {student.enrollmentDate && (
                  <p className="mt-1 text-sm text-gray-500">Enrollment: {formatDate(student.enrollmentDate)}</p>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-auto">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="text-xs uppercase tracking-[0.24em] text-gray-400">Financial</div>
                <div className="mt-3"><FinancialBadge status={financial} /></div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="text-xs uppercase tracking-[0.24em] text-gray-400">Account</div>
                <div className="mt-3"><AccountBadge status={accountStatus} /></div>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={handleEditSubmit} className="space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Student Details</h2>
                <p className="mt-1 text-sm text-gray-500">Update the student's personal and enrollment details here.</p>
              </div>
              {isEditing && (
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">Edit mode</span>
              )}
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Class</label>
                <select
                  value={formData.classId}
                  onChange={(e) => updateField('classId', e.target.value)}
                  disabled={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                >
                  <option value="">Keep existing grade</option>
                  {classes.map((klass) => (
                    <option key={klass.id || klass._id} value={klass.id || klass._id}>
                      {klass.name || klass.grade || klass.label}{klass.stream ? ` (${klass.stream})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Grade fallback</label>
                <input
                  value={formData.grade}
                  onChange={(e) => updateField('grade', e.target.value)}
                  readOnly={!isEditing || !!formData.classId}
                  placeholder={formData.classId ? 'Selected class dictates grade' : 'Enter grade if no class selected'}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Phone</label>
                <input
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Gender</label>
                <input
                  value={formData.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Address</label>
                <input
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Student ID & Documents</h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">National ID / Kebele ID</label>
                <input
                  value={formData.nationalId}
                  onChange={(e) => updateField('nationalId', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Student Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={!isEditing || uploadingPhoto}
                  onChange={(e) => handleFileUpload('studentPhotoUrl', e.target.files?.[0])}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700"
                />
              </div>
              {formData.studentPhotoUrl && (
                <div className="lg:col-span-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 text-sm font-semibold text-slate-700">Photo Preview</div>
                    <img src={formData.studentPhotoUrl} alt="Student" className="h-40 w-full rounded-3xl object-cover" />
                  </div>
                </div>
              )}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">National ID / Passport File</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  disabled={!isEditing || uploadingIdDocument}
                  onChange={(e) => handleFileUpload('nationalIdDocumentUrl', e.target.files?.[0])}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700"
                />
              </div>
              {formData.nationalIdDocumentUrl && (
                <div className="lg:col-span-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 text-sm font-semibold text-slate-700">Uploaded Document</div>
                    <a
                      href={formData.nationalIdDocumentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-sky-600 hover:text-sky-800"
                    >
                      View current uploaded ID document
                    </a>
                  </div>
                </div>
              )}
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Previous School</label>
                <input
                  value={formData.previousSchool}
                  onChange={(e) => updateField('previousSchool', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Emergency Contacts</label>
                <input
                  value={formData.emergencyContacts}
                  onChange={(e) => updateField('emergencyContacts', e.target.value)}
                  readOnly={!isEditing}
                  placeholder="e.g. John Doe – 0911 123 456"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Additional Registration Notes</label>
                <textarea
                  value={formData.familyNotes}
                  onChange={(e) => updateField('familyNotes', e.target.value)}
                  readOnly={!isEditing}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Family Background</h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Father's Name</label>
                <input
                  value={formData.fatherName}
                  onChange={(e) => updateField('fatherName', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Mother's Name</label>
                <input
                  value={formData.motherName}
                  onChange={(e) => updateField('motherName', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Guardian Name</label>
                <input
                  value={formData.familyGuardianName}
                  onChange={(e) => updateField('familyGuardianName', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Occupation</label>
                <input
                  value={formData.occupation}
                  onChange={(e) => updateField('occupation', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Additional Registration Notes</label>
                <textarea
                  value={formData.familyNotes}
                  onChange={(e) => updateField('familyNotes', e.target.value)}
                  readOnly={!isEditing}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Guardian Information</h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  value={formData.guardianFullName}
                  onChange={(e) => updateField('guardianFullName', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Relationship</label>
                <input
                  value={formData.guardianRelationship}
                  onChange={(e) => updateField('guardianRelationship', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  value={formData.guardianEmail}
                  onChange={(e) => updateField('guardianEmail', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Phone</label>
                <input
                  value={formData.guardianPhone}
                  onChange={(e) => updateField('guardianPhone', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Address</label>
                <input
                  value={formData.guardianAddress}
                  onChange={(e) => updateField('guardianAddress', e.target.value)}
                  readOnly={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                />
              </div>
            </div>
          </section>
        </form>
      </div>
    </AdminLayout>
  );
}
