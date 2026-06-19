import { useState } from 'react';
import SuperAdminLayout from '../components/SuperAdminLayout';

export default function Permissions() {
  const [permissions, setPermissions] = useState([
    { id: 1, name: 'student_registration', description: 'Register and manage students', roles: ['SuperAdmin', 'Admin'] },
    { id: 2, name: 'teacher_management', description: 'Manage teacher accounts and assignments', roles: ['SuperAdmin', 'Admin'] },
    { id: 3, name: 'grade_management', description: 'View and edit student grades', roles: ['SuperAdmin', 'Admin', 'Teacher'] },
    { id: 4, name: 'attendance_management', description: 'Manage student attendance', roles: ['SuperAdmin', 'Admin', 'Teacher'] },
    { id: 5, name: 'finance_management', description: 'Manage fees and payments', roles: ['SuperAdmin', 'Admin', 'Cashier'] },
    { id: 6, name: 'report_generation', description: 'Generate reports and analytics', roles: ['SuperAdmin', 'Admin'] },
    { id: 7, name: 'system_settings', description: 'Configure system settings', roles: ['SuperAdmin'] },
    { id: 8, name: 'user_management', description: 'Manage user accounts', roles: ['SuperAdmin'] },
  ]);

  return (
    <SuperAdminLayout pageTitle="Permission Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Permission Management</h2>
            <p className="text-sm text-gray-500">Configure system permissions and role access</p>
          </div>
          <button className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Permission
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4">Permission Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Assigned Roles</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {permissions.map((permission) => (
                  <tr key={permission.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-900">{permission.name}</td>
                    <td className="px-6 py-4 text-gray-600">{permission.description}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {permission.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm font-semibold text-gray-600 hover:text-gray-900">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
