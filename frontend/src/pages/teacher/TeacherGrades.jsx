import TeacherLayout from '../../components/TeacherLayout';
import GradesContent from '../../components/GradesContent';

export default function TeacherGrades() {
  return (
    <TeacherLayout pageTitle="Grade Management">
      <GradesContent canEdit={true} />
    </TeacherLayout>
  );
}
