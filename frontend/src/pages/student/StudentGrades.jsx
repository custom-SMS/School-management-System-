import StudentLayout from '../../components/StudentLayout';
import GradesContent from '../../components/GradesContent';

export default function StudentGrades() {
  return (
    <StudentLayout pageTitle="Grade Management">
      <GradesContent canEdit={false} />
    </StudentLayout>
  );
}
