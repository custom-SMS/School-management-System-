import AdminLayout from '../../components/AdminLayout';
import GradesContent from '../../components/GradesContent';

export default function AdminGrades() {
  return (
    <AdminLayout pageTitle="Grade Management">
      <GradesContent canEdit={false} />
    </AdminLayout>
  );
}
