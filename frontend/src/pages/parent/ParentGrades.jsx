import ParentLayout from '../../components/ParentLayout';
import GradesContent from '../../components/GradesContent';

export default function ParentGrades() {
  return (
    <ParentLayout pageTitle="Grade Management">
      <GradesContent canEdit={false} />
    </ParentLayout>
  );
}
