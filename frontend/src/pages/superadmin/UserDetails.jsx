import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from '../../api/axios';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { toast } from 'react-toastify';

const ROLE_COLORS = {
  SuperAdmin: 'bg-indigo-100 text-indigo-800',
  Admin: 'bg-blue-100 text-blue-800',
  Teacher: 'bg-emerald-100 text-emerald-800',
  Cashier: 'bg-amber-100 text-amber-800',
  Student: 'bg-slate-100 text-slate-700',
  Parent: 'bg-violet-100 text-violet-800',
};

const formatDateTime = (value) => {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString();
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Not available';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not available';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

const DetailItem = ({ label, value, className = '' }) => (
  <div className={className}>
    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-semibold text-slate-900">{formatValue(value)}</p>
  </div>
);

const SectionCard = ({ title, description, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="mb-4">
      <h3 className="text-lg font-black tracking-tight text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
    {children}
  </section>
);

export default function UserDetails() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`/users/${id}`);
        setUser(res.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  if (loading) {
    return (
      <SuperAdminLayout pageTitle="User Details">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Loading user details...
        </div>
      </SuperAdminLayout>
    );
  }

  if (!user) {
    return (
      <SuperAdminLayout pageTitle="User Details">
        <div className="space-y-4">
          <Link
            to="/super-admin/users"
            className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            ← Back to User Management
          </Link>
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">
            User details could not be found.
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  const initials = user.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const studentProfile = user.studentProfile;
  const parentProfile = user.parentProfile;
  const teacherProfile = user.teacherProfile;

  const personalDetails = studentProfile?.personalDetails || {};
  const familyBackground = studentProfile?.familyBackground || {};

  return (
    <SuperAdminLayout pageTitle="User Details">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link
              to="/super-admin/users"
              className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800"
            >
              ← Back to User Management
            </Link>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
              {user.name}
            </h2>
            <p className="text-sm text-slate-500">
              Full account overview for this user.
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
              ROLE_COLORS[user.role] || 'bg-slate-100 text-slate-700'
            }`}
          >
            {user.role}
          </span>
        </div>

        <SectionCard title="Account Overview" description="Core account information visible to super admin.">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-lg font-black text-indigo-700">
              {initials}
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Name" value={user.name} />
              <DetailItem label="Email" value={user.email} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</p>
                <span
                  className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                    user.isActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      user.isActive ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  ></span>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <DetailItem label="System ID" value={user.systemId || 'Not assigned'} />
              <DetailItem label="Created" value={formatDateTime(user.createdAt)} />
              <DetailItem label="Last Updated" value={formatDateTime(user.updatedAt)} />
            </div>
          </div>
        </SectionCard>

        {parentProfile && (
          <>
            <SectionCard
              title="Parent Profile"
              description="Parent-specific contact details and linked students."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Parent ID" value={parentProfile.parentId} />
                <DetailItem label="Full Name" value={parentProfile.fullName} />
                <DetailItem label="Email" value={parentProfile.email || user.email} />
                <DetailItem label="Phone Number" value={parentProfile.phone} />
                <DetailItem label="Relationship" value={parentProfile.relationship} />
                <DetailItem label="Address" value={parentProfile.address} />
                <DetailItem label="Profile Created" value={formatDateTime(parentProfile.createdAt)} />
                <DetailItem label="Children Registered" value={parentProfile.children?.length || 0} />
              </div>
            </SectionCard>

            <SectionCard
              title="Registered Students"
              description="Students linked to this parent account."
            >
              {parentProfile.children?.length ? (
                <div className="space-y-4">
                  {parentProfile.children.map((child) => (
                    <div
                      key={child.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <DetailItem label="Student Name" value={child.user?.name} />
                        <DetailItem label="Student ID" value={child.studentId} />
                        <DetailItem label="Grade" value={child.grade} />
                        <DetailItem
                          label="Status"
                          value={child.user?.isActive ? 'Active' : 'Inactive'}
                        />
                        <DetailItem label="Student Email" value={child.user?.email} />
                        <DetailItem
                          label="Phone Number"
                          value={child.personalDetails?.phone}
                        />
                        <DetailItem
                          label="Gender"
                          value={child.personalDetails?.gender}
                        />
                        <DetailItem
                          label="Date of Birth"
                          value={child.personalDetails?.dateOfBirth}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No students are linked to this parent.</p>
              )}
            </SectionCard>
          </>
        )}

        {studentProfile && (
          <>
            <SectionCard
              title="Student Profile"
              description="Student academic and personal profile information."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Student ID" value={studentProfile.studentId} />
                <DetailItem label="Current Grade" value={studentProfile.grade} />
                <DetailItem label="Enrollment Date" value={formatDateTime(studentProfile.enrollmentDate)} />
                <DetailItem label="Phone Number" value={personalDetails.phone} />
                <DetailItem label="Gender" value={personalDetails.gender} />
                <DetailItem label="Date of Birth" value={personalDetails.dateOfBirth} />
                <DetailItem label="Address" value={personalDetails.address} />
                <DetailItem label="Admission Date" value={personalDetails.admissionDate} />
                <DetailItem label="Previous School" value={personalDetails.previousSchool} />
                <DetailItem label="Father Name" value={familyBackground.fatherName} />
                <DetailItem label="Mother Name" value={familyBackground.motherName} />
                <DetailItem label="Guardian Name" value={familyBackground.guardianName} />
                <DetailItem label="Family Occupation" value={familyBackground.occupation} />
                <DetailItem label="Additional Notes" value={familyBackground.notes} className="sm:col-span-2 lg:col-span-3" />
              </div>
            </SectionCard>

            <SectionCard
              title="Guardians"
              description="Parents or guardians linked to this student."
            >
              {studentProfile.guardians?.length ? (
                <div className="space-y-4">
                  {studentProfile.guardians.map((guardian) => (
                    <div
                      key={guardian.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <DetailItem label="Name" value={guardian.fullName} />
                        <DetailItem label="Parent ID" value={guardian.parentId} />
                        <DetailItem label="Relationship" value={guardian.relationship} />
                        <DetailItem label="Email" value={guardian.email} />
                        <DetailItem label="Phone Number" value={guardian.phone} />
                        <DetailItem label="Address" value={guardian.address} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No guardians linked to this student.</p>
              )}
            </SectionCard>

            <SectionCard
              title="Enrollment History"
              description="Academic year and section history for this student."
            >
              {studentProfile.enrollments?.length ? (
                <div className="space-y-4">
                  {studentProfile.enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <DetailItem label="Academic Year" value={enrollment.academicYear?.year} />
                        <DetailItem label="Grade" value={enrollment.grade} />
                        <DetailItem label="Status" value={enrollment.status} />
                        <DetailItem label="Recorded On" value={formatDateTime(enrollment.createdAt)} />
                        <DetailItem label="Section" value={enrollment.section?.name} />
                        <DetailItem label="Class" value={enrollment.section?.class?.name} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No enrollment history available.</p>
              )}
            </SectionCard>
          </>
        )}

        {teacherProfile && (
          <>
            <SectionCard
              title="Teacher Profile"
              description="Teacher employment and instructional information."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Teacher ID" value={teacherProfile.teacherId} />
                <DetailItem label="Subject" value={teacherProfile.subject} />
                <DetailItem label="Department" value={teacherProfile.department} />
                <DetailItem label="Qualification" value={teacherProfile.qualification} />
                <DetailItem label="Employment Status" value={teacherProfile.status} />
                <DetailItem label="Hire Date" value={formatDateTime(teacherProfile.hireDate)} />
                <DetailItem label="Classes Assigned" value={teacherProfile.classes?.length || 0} />
                <DetailItem label="Assignments" value={teacherProfile.assignments?.length || 0} />
              </div>
            </SectionCard>

            <SectionCard
              title="Teaching Classes"
              description="Classes directly assigned to this teacher."
            >
              {teacherProfile.classes?.length ? (
                <div className="space-y-4">
                  {teacherProfile.classes.map((classItem) => (
                    <div
                      key={classItem.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <DetailItem label="Class Name" value={classItem.name} />
                        <DetailItem label="Subject" value={classItem.subject} />
                        <DetailItem label="Schedule" value={classItem.schedule} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No classes assigned to this teacher.</p>
              )}
            </SectionCard>

            <SectionCard
              title="Teacher Assignments"
              description="Subject, class, and student assignments for this teacher."
            >
              {teacherProfile.assignments?.length ? (
                <div className="space-y-4">
                  {teacherProfile.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <DetailItem label="Assignment Type" value={assignment.assignmentType} />
                        <DetailItem label="Class" value={assignment.class?.name} />
                        <DetailItem label="Class Subject" value={assignment.class?.subject} />
                        <DetailItem label="Subject" value={assignment.subject?.name} />
                        <DetailItem label="Department" value={assignment.subject?.department} />
                        <DetailItem label="Students Assigned" value={assignment.students?.length || 0} />
                        <DetailItem label="Assigned On" value={formatDateTime(assignment.createdAt)} />
                        <DetailItem label="Notes" value={assignment.notes} className="md:col-span-2 lg:col-span-4" />
                      </div>

                      {assignment.students?.length ? (
                        <div className="mt-4 rounded-2xl bg-white p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Assigned Students
                          </p>
                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {assignment.students.map((student) => (
                              <div key={student.id} className="rounded-xl border border-slate-200 p-3">
                                <p className="text-sm font-semibold text-slate-900">{student.user?.name}</p>
                                <p className="mt-1 text-xs text-slate-500">ID: {formatValue(student.studentId)}</p>
                                <p className="mt-1 text-xs text-slate-500">Grade: {formatValue(student.grade)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No teacher assignments found.</p>
              )}
            </SectionCard>
          </>
        )}

        {!studentProfile && !parentProfile && !teacherProfile && (
          <SectionCard
            title="Role Information"
            description="This role currently has no linked student, parent, or teacher profile."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Role" value={user.role} />
              <DetailItem label="Email" value={user.email} />
              <DetailItem label="System ID" value={user.systemId} />
            </div>
          </SectionCard>
        )}
      </div>
    </SuperAdminLayout>
  );
}