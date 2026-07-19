import SuperAdminLayout from '../../components/SuperAdminLayout';
import GradesContent from '../../components/GradesContent';
import { useAcademicYear } from '../../context/AcademicYearContext';

export default function SuperAdminGrades() {
  const { isViewingHistory, selectedYear, activeYear } = useAcademicYear();

  return (
    <SuperAdminLayout pageTitle="Grade Management">
      {/* Academic year context banner */}
      {isViewingHistory && selectedYear && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <span className="text-amber-600 font-bold">📅 Viewing historical grades for {selectedYear.year}</span>
          <span className="text-amber-500 text-xs">— data is read-only for this year</span>
        </div>
      )}
      {!isViewingHistory && activeYear && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />
          <span className="text-emerald-700 font-semibold">Active Year: {activeYear.year}</span>
        </div>
      )}
      <GradesContent canEdit={!isViewingHistory} />
    </SuperAdminLayout>
  );
}
