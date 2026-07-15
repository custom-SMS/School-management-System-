import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { ROLES, ROLE_META, PERMISSION_CATALOG } from '../constants/accessControl';

export default function Roles() {
  const navigate = useNavigate();
  const [userCounts, setUserCounts] = useState({});
  const [permCounts, setPermCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, permsRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/auth/permissions'),
      ]);

      // Tally users per role.
      const counts = {};
      ROLES.forEach((r) => { counts[r] = 0; });
      (usersRes.data || []).forEach((u) => {
        if (counts[u.role] !== undefined) counts[u.role] += 1;
      });
      setUserCounts(counts);

      // Tally granted permissions per role.
      const perms = {};
      ROLES.forEach((r) => { perms[r] = 0; });
      (permsRes.data || []).forEach((p) => {
        if (perms[p.role] !== undefined) perms[p.role] += 1;
      });
      setPermCounts(perms);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <SuperAdminLayout pageTitle="Role Management">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Role Management</h2>
            <p className="text-sm text-slate-500">
              Roles are fixed by the system. Configure what each role can do from Permission Management.
            </p>
          </div>
          <button
            onClick={() => navigate('/super-admin/permissions')}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Manage Permissions
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-500">Loading roles…</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((role) => {
              const meta = ROLE_META[role] || {};
              const isSuper = role === 'SuperAdmin';
              const grantedLabel = isSuper
                ? `All ${PERMISSION_CATALOG.length}`
                : `${permCounts[role] ?? 0} of ${PERMISSION_CATALOG.length}`;
              return (
                <div key={role} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                  <div className="mb-4 flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.accent || 'bg-slate-600'} text-sm font-black text-white`}>
                      {role.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-slate-900">{meta.label || role}</h3>
                      <p className="text-sm text-slate-500">{meta.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                    <div className="text-slate-500">
                      <span className="font-black text-slate-900">{userCounts[role] ?? 0}</span> users
                    </div>
                    <div className="text-slate-500">
                      <span className="font-black text-slate-900">{grantedLabel}</span> permissions
                    </div>
                  </div>
                  {!isSuper && (
                    <button
                      onClick={() => navigate('/super-admin/permissions')}
                      className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Configure Permissions
                    </button>
                  )}
                  {isSuper && (
                    <div className="mt-4 rounded-lg bg-violet-50 px-3 py-2 text-center text-xs font-bold text-violet-700">
                      Unrestricted — bypasses all checks
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
