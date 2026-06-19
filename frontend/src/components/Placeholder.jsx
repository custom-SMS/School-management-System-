import AdminLayout from './AdminLayout';

export default function Placeholder({ title }) {
  return (
    <AdminLayout pageTitle={title}>
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="mt-2 text-sm text-gray-500">This feature is currently under development.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
