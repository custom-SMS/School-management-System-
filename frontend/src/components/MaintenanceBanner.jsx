import { useMaintenance } from '../context/MaintenanceContext';

export default function MaintenanceBanner() {
  const { maintenanceBroadcast, loading } = useMaintenance();

  if (loading || !maintenanceBroadcast?.active || !maintenanceBroadcast?.message) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-semibold">
      <span className="flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        {maintenanceBroadcast.message}
      </span>
    </div>
  );
}
