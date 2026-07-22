import { useEffect, useState } from 'react';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import AdminLayout from '../components/AdminLayout';

const AVATAR_COLORS = ['bg-gray-700', 'bg-blue-600', 'bg-teal-600', 'bg-green-700', 'bg-orange-600'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function Assignments() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [unassignedSections, setUnassignedSections] = useState([]);
  const [unassignedClassSubjects, setUnassignedClassSubjects] = useState([]);
  const [statusTab, setStatusTab] = useState('assigned');
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [teacherId, setTeacherId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [assignmentType, setAssignmentType] = useState('SubjectTeacher');
  const [submitting, setSubmitting] = useState(false);

  const fetchAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await axios.get('/assignments');
      setAssignments(res.data || []);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const loadOptions = async () => {
    try {
      const res = await axios.get('/assignments/options');
      setTeachers(res.data.teachers || []);
      setSubjects(res.data.subjects || []);
      setSections(res.data.sections || []);
      setUnassignedSections(res.data.unassignedSections || []);
      setUnassignedClassSubjects(res.data.unassignedClassSubjects || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load assignment options');
    }
  };

  useEffect(() => {
    loadOptions();
    fetchAssignments();
  }, []);

  const handleQuickAssignHomeroom = (sec) => {
    setSectionId(sec._id || sec.id || '');
    setAssignmentType('HomeRoomTeacher');
    setSubjectId('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info(`Selected ${sec.class?.name || ''} ${sec.name || ''} for Homeroom assignment. Choose a teacher above.`);
  };

  const handleQuickAssignSubject = (cs) => {
    setSubjectId(cs.subject?.id || cs.subjectId || '');
    setAssignmentType('SubjectTeacher');
    const matchingSection = sections.find((s) => s.class?.id === cs.classId || s.className === cs.class?.name);
    if (matchingSection) {
      setSectionId(matchingSection._id || matchingSection.id || '');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info(`Selected ${cs.class?.name || ''} - ${cs.subject?.name || ''}. Choose a teacher above.`);
  };

  const handleDeleteAssignment = async (id, teacherName) => {
    if (!window.confirm(`Are you sure you want to remove this assignment for ${teacherName || 'this teacher'}?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await axios.delete(`/assignments/${id}`);
      toast.success('Assignment removed successfully.');
      fetchAssignments();
      loadOptions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete assignment.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { teacherId, subjectId: assignmentType === 'HomeRoomTeacher' ? null : subjectId, sectionId, assignmentType };
      await axios.post('/assignments', payload);
      toast.success('Teacher assigned successfully.');
      fetchAssignments();
      loadOptions();
      setTeacherId('');
      setSubjectId('');
      setSectionId('');
      setAssignmentType('SubjectTeacher');
    } catch (error) {
      // Handle homeroom override confirmation (409 Conflict)
      if (error.response?.status === 409 && error.response?.data?.requiresConfirmation) {
        const { previousTeacher, newTeacher } = error.response.data;
        const confirmed = window.confirm(
          `⚠️ Caution — Homeroom Teacher Override\n\n` +
          `You are about to replace the current homeroom teacher (${previousTeacher}) ` +
          `with ${newTeacher}.\n\n` +
          `This action will remove the existing homeroom assignment. ` +
          `Are you sure you want to proceed?`
        );
        if (confirmed) {
          try {
            const payload = { teacherId, subjectId: assignmentType === 'HomeRoomTeacher' ? null : subjectId, sectionId, assignmentType, confirmOverride: true };
            await axios.post('/assignments', payload);
            toast.success('Homeroom teacher replaced successfully.');
            fetchAssignments();
            setTeacherId('');
            setSubjectId('');
            setSectionId('');
            setAssignmentType('SubjectTeacher');
          } catch (retryError) {
            toast.error(retryError.response?.data?.message || 'Failed to save teacher assignment');
          }
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to save teacher assignment');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTeacher = teachers.find((t) => t._id === teacherId);
  const selectedSubject = subjects.find((s) => s.id === subjectId || s._id === subjectId);
  const selectedSection = sections.find((s) => s.id === sectionId || s._id === sectionId);

  return (
    <AdminLayout pageTitle="System Management">
      {/* Page Title */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Teacher Assignment</h2>
        <p className="text-sm text-gray-500">Assign each teacher to their classes. Student access follows the class roster automatically.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Assignment Form */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-lg font-bold text-gray-900">Create Assignment</h3>

          <div className="space-y-5">
            {/* Teacher Select */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Select Teacher</label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-black"
              >
                <option value="">Choose a teacher…</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>{t.user?.name} ({t.teacherId}) — {t.subject || 'General'}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Assignment Type</label>
              <select
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-black"
              >
                <option value="SubjectTeacher">Subject Teacher</option>
                <option value="HomeRoomTeacher">Home Room Teacher</option>
              </select>
            </div>

            {assignmentType === 'SubjectTeacher' && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Select Subject</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-black"
                >
                  <option value="">Choose a subject…</option>
                  {subjects.map((subject) => (
                    <option key={subject.id || subject._id} value={subject.id || subject._id}>{subject.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Select Section</label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-black"
              >
                <option value="">Choose a section…</option>
                {sections.map((section) => (
                  <option key={section._id} value={section._id}>{section.label || `${section.className} ${section.name}`}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting || !teacherId || !sectionId || (assignmentType === 'SubjectTeacher' && !subjectId)}
              className="w-full rounded-lg bg-black py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save Assignment'}
            </button>
          </div>
        </form>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Selected Teacher Card */}
          {selectedTeacher ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Selected Teacher</h3>
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${avatarColor(selectedTeacher.user?.name)}`}>
                  {(selectedTeacher.user?.name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{selectedTeacher.user?.name}</div>
                  <div className="text-sm text-gray-500">{selectedTeacher.subject || 'General'}</div>
                  <div className="mt-1 text-xs font-semibold text-gray-400">{selectedTeacher.teacherId}</div>
                </div>
              </div>
              {selectedTeacher.user?.email && (
                <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  📧 {selectedTeacher.user.email}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
              <p className="text-sm text-gray-500">Select a teacher to see their profile here.</p>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Assignment Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm font-semibold text-gray-700">Selected Subject</span>
                <span className={`text-2xl font-bold ${subjectId ? 'text-gray-900' : 'text-gray-400'}`}>{selectedSubject?.name || '-'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm font-semibold text-gray-700">Selected Section</span>
                <span className={`text-2xl font-bold ${sectionId ? 'text-gray-900' : 'text-gray-400'}`}>{selectedSection?.label || '-'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-black p-6 text-white">
            <h3 className="mb-2 font-bold">Assignment Details</h3>
            <p className="text-sm text-gray-300">This page allows you to create or delete teacher assignments.</p>
          </div>
        </div>
      </div>

      {/* Existing Assignments Section */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Class & Subject Coverage Status</h3>
            <p className="text-sm text-gray-500">Monitor active teacher assignments and identify unassigned homerooms or subjects.</p>
          </div>
          <button
            onClick={() => { fetchAssignments(); loadOptions(); }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Refresh Data
          </button>
        </div>

        {/* Status Summary Cards & Tabs */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={() => { setStatusTab('assigned'); setCurrentPage(1); }}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${statusTab === 'assigned' ? 'border-black bg-gray-900 text-white shadow-md' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Assigned Records</div>
              <div className="text-2xl font-black">{assignments.length}</div>
            </div>
            <div className="text-2xl">✅</div>
          </button>

          <button
            onClick={() => { setStatusTab('unassigned_homerooms'); setCurrentPage(1); }}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${statusTab === 'unassigned_homerooms' ? 'border-amber-600 bg-amber-500 text-white shadow-md' : 'border-amber-200 bg-amber-50/50 text-amber-900 hover:border-amber-300'}`}
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Unassigned Homerooms</div>
              <div className="text-2xl font-black">{unassignedSections.length}</div>
            </div>
            <div className="text-2xl">⚠️</div>
          </button>

          <button
            onClick={() => { setStatusTab('unassigned_subjects'); setCurrentPage(1); }}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${statusTab === 'unassigned_subjects' ? 'border-rose-600 bg-rose-500 text-white shadow-md' : 'border-rose-200 bg-rose-50/50 text-rose-900 hover:border-rose-300'}`}
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Unassigned Subjects</div>
              <div className="text-2xl font-black">{unassignedClassSubjects.length}</div>
            </div>
            <div className="text-2xl">🚨</div>
          </button>
        </div>

        {/* ASSIGNED TAB CONTENT */}
        {statusTab === 'assigned' && (
          <>
            {/* Search and Filters Bar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
              <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search teacher, class, or subject…"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    🔍
                  </span>
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-black"
                >
                  <option value="all">All Assignment Types</option>
                  <option value="SubjectTeacher">Subject Teacher</option>
                  <option value="HomeRoomTeacher">Homeroom Teacher</option>
                </select>

                {(searchQuery || typeFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('all');
                      setCurrentPage(1);
                    }}
                    className="text-xs font-bold text-gray-500 hover:text-gray-900 transition"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                <span>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 outline-none"
                >
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                </select>
              </div>
            </div>

            {loadingAssignments ? (
              <div className="py-12 text-center text-sm font-medium text-gray-400">Loading active assignments…</div>
            ) : (() => {
              const filteredAssignments = assignments.filter((asgn) => {
                const teacherName = (asgn.teacher?.user?.name || asgn.teacher?.teacherId || '').toLowerCase();
                const className = (asgn.class?.name || '').toLowerCase();
                const sectionName = (asgn.section?.name || '').toLowerCase();
                const subjectName = (asgn.subject?.name || '').toLowerCase();
                const query = searchQuery.toLowerCase().trim();

                const matchesSearch =
                  !query ||
                  teacherName.includes(query) ||
                  className.includes(query) ||
                  sectionName.includes(query) ||
                  subjectName.includes(query);

                const matchesType =
                  typeFilter === 'all' || asgn.assignmentType === typeFilter;

                return matchesSearch && matchesType;
              });

              if (filteredAssignments.length === 0) {
                return (
                  <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
                    {searchQuery || typeFilter !== 'all' ? 'No assignments match your search filter.' : 'No active assignments found.'}
                  </div>
                );
              }

              const totalPages = Math.ceil(filteredAssignments.length / pageSize) || 1;
              const safePage = Math.min(currentPage, totalPages);
              const startIndex = (safePage - 1) * pageSize;
              const endIndex = Math.min(startIndex + pageSize, filteredAssignments.length);
              const paginatedAssignments = filteredAssignments.slice(startIndex, endIndex);

              return (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                          <th className="px-4 py-3 font-semibold">Teacher</th>
                          <th className="px-4 py-3 font-semibold">Type</th>
                          <th className="px-4 py-3 font-semibold">Class / Section</th>
                          <th className="px-4 py-3 font-semibold">Subject</th>
                          <th className="px-4 py-3 text-right font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginatedAssignments.map((asgn) => {
                          const teacherName = asgn.teacher?.user?.name || asgn.teacher?.teacherId || 'Unknown Teacher';
                          const isHomeroom = asgn.assignmentType === 'HomeRoomTeacher';
                          const className = asgn.class?.name || '—';
                          const sectionName = asgn.section?.name || '';
                          const subjectName = isHomeroom ? 'All Subjects (Homeroom)' : (asgn.subject?.name || '—');

                          return (
                            <tr key={asgn._id || asgn.id} className="hover:bg-gray-50/80 transition">
                              <td className="px-4 py-3.5 font-bold text-gray-900">
                                {teacherName}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${isHomeroom ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {isHomeroom ? 'Homeroom Teacher' : 'Subject Teacher'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-medium text-gray-700">
                                {className} {sectionName ? `(${sectionName})` : ''}
                              </td>
                              <td className="px-4 py-3.5 text-gray-600">
                                {subjectName}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <button
                                  onClick={() => handleDeleteAssignment(asgn._id || asgn.id, teacherName)}
                                  disabled={deletingId === (asgn._id || asgn.id)}
                                  className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition disabled:opacity-50"
                                >
                                  {deletingId === (asgn._id || asgn.id) ? 'Removing…' : 'Remove'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Bar */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs font-medium text-gray-500">
                    <div>
                      Showing <span className="font-bold text-gray-900">{startIndex + 1}</span> to{' '}
                      <span className="font-bold text-gray-900">{endIndex}</span> of{' '}
                      <span className="font-bold text-gray-900">{filteredAssignments.length}</span> assignments
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={safePage === 1}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 font-semibold transition"
                      >
                        Previous
                      </button>

                      <span className="px-2 font-bold text-gray-800">
                        Page {safePage} of {totalPages}
                      </span>

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={safePage === totalPages}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 font-semibold transition"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </>
        )}

        {/* UNASSIGNED HOMEROOMS TAB */}
        {statusTab === 'unassigned_homerooms' && (
          <div>
            <div className="mb-4 rounded-lg bg-amber-50 p-4 border border-amber-200 text-sm text-amber-900">
              <span className="font-bold">⚠️ Notice:</span> The following sections do not currently have a Homeroom Teacher assigned.
            </div>

            {unassignedSections.length === 0 ? (
              <div className="rounded-lg border border-dashed border-green-200 bg-green-50/50 py-12 text-center text-sm font-semibold text-green-700">
                🎉 Great news! All class sections have a Homeroom Teacher assigned.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-amber-50/50 text-xs uppercase tracking-wider text-amber-900">
                      <th className="px-4 py-3 font-semibold">Class Name</th>
                      <th className="px-4 py-3 font-semibold">Section</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {unassignedSections.map((sec) => (
                      <tr key={sec._id || sec.id} className="hover:bg-amber-50/30 transition">
                        <td className="px-4 py-3.5 font-bold text-gray-900">
                          {sec.class?.name || '—'} {sec.class?.stream ? `(${sec.class.stream})` : ''}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-gray-700">
                          {sec.name || 'Default Section'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                            Unassigned Homeroom
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleQuickAssignHomeroom(sec)}
                            className="rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white transition hover:bg-gray-800"
                          >
                            Assign Teacher
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* UNASSIGNED SUBJECTS TAB */}
        {statusTab === 'unassigned_subjects' && (
          <div>
            <div className="mb-4 rounded-lg bg-rose-50 p-4 border border-rose-200 text-sm text-rose-900">
              <span className="font-bold">🚨 Notice:</span> The following class subjects do not currently have a Subject Teacher assigned.
            </div>

            {unassignedClassSubjects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-green-200 bg-green-50/50 py-12 text-center text-sm font-semibold text-green-700">
                🎉 Great news! All class subjects have a Subject Teacher assigned.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-rose-50/50 text-xs uppercase tracking-wider text-rose-900">
                      <th className="px-4 py-3 font-semibold">Class Name</th>
                      <th className="px-4 py-3 font-semibold">Subject</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {unassignedClassSubjects.map((cs) => (
                      <tr key={cs.id || `${cs.classId}_${cs.subjectId}`} className="hover:bg-rose-50/30 transition">
                        <td className="px-4 py-3.5 font-bold text-gray-900">
                          {cs.class?.name || '—'} {cs.class?.stream ? `(${cs.class.stream})` : ''}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-gray-700">
                          {cs.subject?.name || '—'} {cs.subject?.code ? `(${cs.subject.code})` : ''}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                            Unassigned Subject
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleQuickAssignSubject(cs)}
                            className="rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white transition hover:bg-gray-800"
                          >
                            Assign Teacher
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
