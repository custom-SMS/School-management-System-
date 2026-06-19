import { useState } from 'react';
import SuperAdminLayout from '../components/SuperAdminLayout';

export default function Roles() {
  const [roles, setRoles] = useState([
    { id: 1, name: 'SuperAdmin', description: 'Full system access', userCount: 3 },
    { id: 2, name: 'Admin', description: 'School administration access', userCount: 12 },
    { id: 3, name: 'Teacher', description: 'Classroom and grade management', userCount: 45 },
    { id: 4, name: 'Student', description: 'Student portal access', userCount: 1284 },
    { id: 5, name: 'Parent', description: 'Parent portal access', userCount: 856 },
    { id: 6, name: 'Cashier', description: 'Finance and payment management', userCount: 5 },
  ]);

  return (
    <SuperAdminLayout pageTitle="Role Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Role Management</h2>
            <p className="text-sm text-gray-500">Manage user roles and permissions</p>
          </div>
          <button className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Role
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div key={role.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{role.name}</h3>
                  <p className="text-sm text-gray-500">{role.description}</p>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="text-sm text-gray-500">
                  <span className="font-bold text-gray-900">{role.userCount}</span> users
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100">
                    Edit
                  </button>
                  <button className="rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
