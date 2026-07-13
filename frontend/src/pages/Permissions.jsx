import { useState, useEffect, useMemo } from 'react';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import SuperAdminLayout from '../components/SuperAdminLayout';
import {
  ROLES,
  EDITABLE_ROLES,
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
  DEFAULT_PERMISSIONS,
} from '../constants/accessControl';

export default function Permissions() {
  const [grants, setGrants] = useState({});
  const [initial, setInitial] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/auth/permissions');

      // Build a set of which roles actually have any saved row in the DB
      const rolesWithSavedData = new Set((res.data || []).map((p) => p.role));

      const map = {};
      EDITABLE_ROLES.forEach((r) => {
        if (rolesWithSavedData.has(r)) {
          // Role has been explicitly saved before — use exactly what the DB has
          map[r] = new Set();
        } else {
          // Role has never been saved — seed with defaults so the UI shows them pre-ticked
          map[r] = new Set(DEFAULT_PERMISSIONS[r] || []);
        }
      });
      (res.data || []).forEach((p) => {
        if (map[p.role]) map[p.role].add(p.permission);
      });
      setGrants(map);
      setInitial(serialize(map));

      // Auto-save defaults for any role that had no DB rows, so the backend also
      // reflects these defaults without requiring the admin to manually click Save.
      const rolesNeedingDefaultSave = EDITABLE_ROLES.filter(
        (r) => !rolesWithSavedData.has(r) && (DEFAULT_PERMISSIONS[r] || []).length > 0
      );
      if (rolesNeedingDefaultSave.length > 0) {
        await Promise.all(
          rolesNeedingDefaultSave.map((role) =>
            axios.post('/auth/permissions', { role, permissions: [...map[role]] })
          )
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPermissions(); }, []);

  const serialize = (map) => {
    const out = {};
    Object.keys(map).forEach((r) => { out[r] = [...map[r]].sort().join(','); });
    return out;
  };

  const dirtyRoles = useMemo(() => {
    const current = serialize(grants);
    return EDITABLE_ROLES.filter((r) => current[r] !== initial[r]);
  }, [grants, initial]);

  const isDirty = dirtyRoles.length > 0;

  const toggle = (role, permKey) => {
    if (!EDITABLE_ROLES.includes(role)) return;
    setGrants((prev) => {
      const next = { ...prev, [role]: new Set(prev[role]) };
      if (next[role].has(permKey)) next[role].delete(permKey);
      else next[role].add(permKey);
      return next;
    });
  };

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      // The backend replaces the full permission set per role, so only POST changed roles.
      await Promise.all(
        dirtyRoles.map((role) =>
          axios.post('/auth/permissions', { role, permissions: [...grants[role]] })
        )
      );
      toast.success(`Permissions updated for ${dirtyRoles.join(', ')}.`);
      setInitial(serialize(grants));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    // Rebuild sets from the last-saved snapshot.
    const map = {};
    EDITABLE_ROLES.forEach((r) => {
      map[r] = new Set(initial[r] ? initial[r].split(',').filter(Boolean) : []);
    });
    setGrants(map);
  };

  const isChecked = (role, permKey) => {
    if (role === 'SuperAdmin') return true;
    return grants[role]?.has(permKey) || false;
  };

  return (
    <SuperAdminLayout
      pageTitle="Permission Management"
      headerAction={
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={handleReset}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            {saving ? 'Saving…' : isDirty ? `Save Changes (${dirtyRoles.length})` : 'Saved'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Permission Management</h2>
            <p className="text-sm text-slate-500">
              Grant or revoke capabilities per role. SuperAdmin always has full access.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-500">Loading permissions…</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Permission</th>
                    {ROLES.map((role) => (
                      <th key={role} className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                        {role}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PERMISSION_CATEGORIES.map((category) => {
                    const perms = PERMISSION_CATALOG.filter((p) => p.category === category);
                    if (perms.length === 0) return null;
                    return (
                      <FragmentRows
                        key={category}
                        category={category}
                        perms={perms}
                        roleCount={ROLES.length}
                        isChecked={isChecked}
                        toggle={toggle}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

function FragmentRows({ category, perms, roleCount, isChecked, toggle }) {
  return (
    <>
      <tr className="bg-slate-50/60">
        <td colSpan={roleCount + 1} className="px-6 py-2 text-xs font-black uppercase tracking-wider text-slate-400">
          {category}
        </td>
      </tr>
      {perms.map((perm) => (
        <tr key={perm.key} className="transition hover:bg-slate-50">
          <td className="px-6 py-4">
            <div className="font-bold text-slate-900">{perm.label}</div>
            <div className="text-xs text-slate-500">{perm.description}</div>
          </td>
          {ROLES.map((role) => {
            const checked = isChecked(role, perm.key);
            const locked = role === 'SuperAdmin';
            return (
              <td key={role} className="px-4 py-4 text-center">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={locked}
                  onChange={() => toggle(role, perm.key)}
                  className={`h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 ${locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
