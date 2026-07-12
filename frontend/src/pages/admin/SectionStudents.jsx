import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import AdminLayout from '../../components/AdminLayout';

const normalizeLabel = (value) => String(value || '').trim().toLowerCase();

export default function SectionStudents() {
  const navigate = useNavigate();
  const { sectionId } = useParams();

  const [section, setSection] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/classroom/sections/detail/${sectionId}/students`);
      const payload = res.data || {};
      const sectionData = payload.section || null;
      const studentList = Array.isArray(payload.students) ? payload.students : [];

      setSection(sectionData);
      setStudents(studentList);
      setSelectedIds(new Set(studentList.filter((student) => student.isAssignedToSection).map((student) => student.id || student._id)));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load section students.');
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    const term = normalizeLabel(searchTerm);
    if (!term) return students;

    return students.filter((student) => {
      const haystack = [
        student.user?.name,
        student.user?.email,
        student.studentId,
        student.grade
      ]
        .map(normalizeLabel)
        .join(' | ');

      return haystack.includes(term);
    });
  }, [students, searchTerm]);

  const toggleStudent = (studentId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const allVisibleSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selectedIds.has(student.id || student._id));

  const toggleSelectVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredStudents.forEach((student) => next.delete(student.id || student._id));
      } else {
        filteredStudents.forEach((student) => next.add(student.id || student._id));
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`/classroom/sections/detail/${sectionId}/students`, {
        studentIds: Array.from(selectedIds)
      });
      toast.success('Section students updated successfully.');
      await loadStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save section students.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout pageTitle="Section Students">
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => navigate('/admin/sections', { state: { classId: section?.classId || '' } })}
                className="mb-4 text-sm font-semibold text-gray-500 transition hover:text-gray-800"
              >
                ← Back to Sections
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {section ? `${section.className}${section.classStream ? ` (${section.classStream})` : ''}${section.name} Students` : 'Section Students'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Assign students to this section and save the selected list.
              </p>
              <p className="mt-2 text-sm font-medium text-gray-600">
                Homeroom Teacher: {section?.homeroomTeacher?.user?.name || 'Unassigned'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Students'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Eligible Students</h2>
              <p className="text-sm text-gray-500">
                Students are filtered to the same grade level as the selected section.
              </p>
            </div>

            <div className="w-full max-w-sm">
              <input
                type="text"
                placeholder="Search by student name, ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading students…</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No students found for this section.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectVisible}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Student</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Student ID</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Grade</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Current Section</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredStudents.map((student) => {
                    const studentKey = student.id || student._id;
                    const checked = selectedIds.has(studentKey);

                    return (
                      <tr key={studentKey} className="transition hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStudent(studentKey)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{student.user?.name || '—'}</div>
                          <div className="text-xs text-gray-500">{student.user?.email || 'No email'}</div>
                        </td>
                        <td className="px-6 py-4">{student.studentId || '—'}</td>
                        <td className="px-6 py-4">{student.grade || '—'}</td>
                        <td className="px-6 py-4">
                          {student.currentSectionName ? `${section?.className || ''}${student.currentSectionName}` : 'Unassigned'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}