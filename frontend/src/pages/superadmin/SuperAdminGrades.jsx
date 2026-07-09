import SuperAdminLayout from '../../components/SuperAdminLayout';
import GradesContent from '../../components/GradesContent';

export default function SuperAdminGrades() {
  return (
    <SuperAdminLayout pageTitle="Grade Management">
      <GradesContent canEdit={true} />
    </SuperAdminLayout>
  );
}
