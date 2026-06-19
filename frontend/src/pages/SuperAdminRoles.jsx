import { useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { toast } from 'react-toastify';

const roleCatalog = [
  {
    name: 'SuperAdmin',
    ownership: 'Governance',
    accessLevel: 'Global oversight',
    capabilities: ['Platform governance', 'Admin account lifecycle', 'Audit visibility', 'Global settings'],
    restrictions: ['No student registration', 'No fee verification', 'No attendance entry', 'No grade entry'],
  },
  {
    name: 'Admin',
    ownership: 'School operations',
    accessLevel: 'Operational management',
    capabilities: ['Manage students', 'Manage teachers', 'Manage academics', 'Control registration lifecycle'],
    restrictions: ['No normal fee verification', 'No Super Admin governance controls'],
  },
  {
    name: 'Registrar',
    ownership: 'Admissions and registration',
    accessLevel: 'Registration execution',
    capabilities: ['Create admissions', 'Manage applications', 'Approve registration payment when period is open'],
    restrictions: ['No finance verification', 'No academic management', 'Disabled when registration period is closed'],
  },
  {
    name: 'Cashier',
    ownership: 'Finance',
    accessLevel: 'Payment operations',
    capabilities: ['Verify payments', 'Generate fees', 'Track defaulters', 'Manage finance queue'],
    restrictions: ['No admissions approval', 'No attendance or grading', 'No academic administration'],
  },
  {
    name: 'Teacher',
    ownership: 'Academic delivery',
    accessLevel: 'Classroom execution',
    capabilities: ['Attendance', 'Grades', 'Assignments', 'Timetable access'],
    restrictions: ['No admin operations', 'No finance verification', 'No governance controls'],
  },
  {
    name: 'Student',
    ownership: 'Self-service',
    accessLevel: 'Personal records',
    capabilities: ['View attendance', 'View grades', 'View timetable', 'View report cards'],
    restrictions: ['No administrative actions', 'No academic record editing'],
  },
  {
    name: 'Parent',
    ownership: 'Guardian portal',
    accessLevel: 'Child monitoring',
    capabilities: ['View child attendance', 'View child grades', 'View timetable', 'View notifications'],
    restrictions: ['No student record editing', 'No operational management'],
  },
];

const initialPermissions = [
  { domain: 'Admin Account Lifecycle', owner: 'SuperAdmin', access: 'Full Control', note: 'Create, suspend, activate, and reset Admin accounts only.' },
  { domain: 'Role Capability Matrix', owner: 'SuperAdmin', access: 'Full Control', note: 'Governance definition of what each role can do.' },
  { domain: 'Student Management', owner: 'Admin', access: 'Operational Control', note: 'Create, edit, view, and archive student records.' },
  { domain: 'Teacher Management', owner: 'Admin', access: 'Operational Control', note: 'Create, edit, assign subjects, and manage status.' },
  { domain: 'Registration Period Control', owner: 'Admin', access: 'Operational Control', note: 'Open and close registration periods and manage Registrar accounts.' },
  { domain: 'Admissions Workflow', owner: 'Registrar', access: 'Execution Only', note: 'Actual student application and admission processing.' },
  { domain: 'Registration Payment Approval', owner: 'Registrar', access: 'Conditional', note: 'Allowed only for registration-related payments while registration period is open.' },
  { domain: 'Normal Fee Verification', owner: 'Cashier', access: 'Exclusive Control', note: 'Cashier is the only role for standard finance verification.' },
  { domain: 'Attendance Entry', owner: 'Teacher', access: 'Execution Only', note: 'Teachers own attendance capture for assigned classes.' },
  { domain: 'Grade Entry', owner: 'Teacher', access: 'Execution Only', note: 'Teachers own classroom grading responsibilities.' },
];

export default function SuperAdminRoles() {
  const [permissions, setPermissions] = useState(initialPermissions);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPermissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return permissions;

    return permissions.filter((item) =>
      [item.domain, item.owner, item.access, item.note].join(' ').toLowerCase().includes(q)
    );
  }, [permissions, searchQuery]);

  const handleReviewMatrix = () => {
    toast.success('Role capability matrix reviewed successfully.');
  };

  const handleRefreshAccessModel = () => {
    setPermissions([...initialPermissions]);
    toast.success('Governance access model refreshed.');
  };

  return (
    <AdminLayout
      pageTitle="Roles & Permissions"
      pageSubtitle="Governance control over role boundaries, ownership rules, and system-wide access policies."
      searchPlaceholder="Search roles, permissions, or ownership..."
      headerAction={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRefreshAccessModel}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Refresh Access Model
          </button>
          <button
            type="button"
            onClick={handleReviewMatrix}
            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Review Capability Matrix
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Role Types', value: roleCatalog.length, tone: 'bg-slate-900 text-white' },
            { label: 'Governance Policies', value: permissions.length, tone: 'bg-violet-50 text-violet-700' },
            { label: 'Restricted Operational Areas', value: '6', tone: 'bg-amber-50 text-amber-700' },
            { label: 'Finance Verification Owner', value: 'Cashier', tone: 'bg-emerald-50 text-emerald-700' },
          ].map((card) => (
            <div key={card.label} className={`rounded-3xl border border-slate-200 p-5 shadow-sm ${card.tone}`}>
              <div className="text-xs font-bold uppercase tracking-[0.22em] opacity-80">{card.label}</div>
              <div className="mt-4 text-3xl font-black tracking-tight">{card.value}</div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-black tracking-tight text-slate-900">Role Ownership Model</h2>
              <p className="mt-1 text-sm text-slate-500">
                Each role owns a defined business responsibility. Super Admin supervises access boundaries but does not execute school operations.
              </p>
            </div>

            <div className="space-y-4">
              {roleCatalog.map((role) => (
                <article key={role.name} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-slate-900">{role.name}</h3>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {role.ownership}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-500">{role.accessLevel}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Capabilities</h4>
                      <ul className="mt-3 space-y-2 text-sm text-slate-700">
                        {role.capabilities.map((capability) => (
                          <li key={capability} className="flex gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                            <span>{capability}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Restrictions</h4>
                      <ul className="mt-3 space-y-2 text-sm text-slate-700">
                        {role.restrictions.map((restriction) => (
                          <li key={restriction} className="flex gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-rose-500" />
                            <span>{restriction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">Access Control Matrix</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Read-only governance review of module ownership and role capabilities.
                </p>
              </div>

              <div className="w-full max-w-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter permissions..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {filteredPermissions.map((item) => (
                <div key={item.domain} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{item.domain}</h3>
                      <p className="mt-1 text-sm text-slate-600">{item.note}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        Owner: {item.owner}
                      </span>
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                        {item.access}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {filteredPermissions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm font-medium text-slate-500">
                  No permissions match the current search.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}