import { useEffect, useMemo, useState } from 'react';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import AdminLayout from '../components/AdminLayout';
import { showConfirmDialog } from '../utils/sweetAlert';
import { useAuth } from '../hooks/useAuth';

export default function Academics() {
  const { isSuper, isSchoolAdmin, activeBranchId } = useAuth();
  const canSelectBranch = isSuper || isSchoolAdmin;

  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [filterBranchId, setFilterBranchId] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  // Subject form
  const [subjectName, setSubjectName] = useState('');
  const [subjectDept, setSubjectDept] = useState('');
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [editingSubjectId, setEditingSubjectId] = useState(null);

  // Class form
  const [classGrade, setClassGrade] = useState('');
  const [classStream, setClassStream] = useState('');
  const [classSection, setClassSection] = useState('');
  const [classTeacherId, setClassTeacherId] = useState('');

  // Derived class name from grade + stream + section
  const derivedClassName = (() => {
    if (!classGrade) return '';
    const gradeLabel = `Grade ${classGrade}`;
    const streamLabel = (classGrade === '11' || classGrade === '12') && classStream ? ` ${classStream}` : '';
    const sectionLabel = classSection ? ` ${classSection}` : '';
    return `${gradeLabel}${streamLabel}${sectionLabel}`;
  })();

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('subject');

  // Subject list search & pagination
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [subjectCurrentPage, setSubjectCurrentPage] = useState(1);
  const [subjectPageSize, setSubjectPageSize] = useState(6);

  // Grade-assigned subjects filtering & pagination
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('All');
  const [gradeSubjectPage, setGradeSubjectPage] = useState(1);
  const [gradeSubjectPageSize, setGradeSubjectPageSize] = useState(6);

  const displayedSubjects = useMemo(() => {
    if (!filterBranchId) return subjects;
    return subjects.filter((s) => s.branchId === filterBranchId || s.branchId === null);
  }, [subjects, filterBranchId]);

  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const res = await axios.get('/subjects');
      const data = Array.isArray(res.data) ? res.data : (res.data?.subjects || []);
      setSubjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const res = await axios.get('/classroom/classes?lean=true');
      setClasses(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const res = await axios.get('/teachers');
      setTeachers(res.data.teachers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get('/branches/branches');
      const branchList = Array.isArray(res.data) ? res.data : (res.data?.branches || []);
      setBranches(branchList);
      if (!canSelectBranch && activeBranchId) {
        setSelectedBranchId(activeBranchId);
      } else if (branchList.length > 0 && !selectedBranchId) {
        setSelectedBranchId(branchList[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchClasses();
    fetchTeachers();
    fetchBranches();
  }, []);

  const gradeOptions = useMemo(() => {
    const extracted = classes
      .map((cls) => {
        const gradeMatch = cls.name?.match(/\d+/);
        if (gradeMatch) {
          const num = gradeMatch[0];
          return cls.stream ? `Grade ${num} (${cls.stream})` : `Grade ${num}`;
        }
        return cls.name || null;
      })
      .filter(Boolean);

    return [...new Set(extracted)].sort((a, b) => {
      const aNum = Number(a.match(/\d+/)?.[0] || 0);
      const bNum = Number(b.match(/\d+/)?.[0] || 0);
      if (aNum !== bNum) return aNum - bNum;
      return a.localeCompare(b);
    });
  }, [classes]);

  const handleGradeToggle = (grade) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((item) => item !== grade) : [...prev, grade]
    );
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      if (editingSubjectId) {
        await axios.put(`/subjects/${editingSubjectId}`, {
          name: subjectName,
          department: subjectDept || undefined,
          gradesOffered: selectedGrades,
          branchId: selectedBranchId || undefined
        });
        toast.success(`Subject "${subjectName}" updated.`);
      } else {
        await axios.post('/subjects', {
          name: subjectName,
          department: subjectDept || undefined,
          gradesOffered: selectedGrades,
          branchId: selectedBranchId || undefined
        });
        toast.success(`Subject "${subjectName}" created.`);
      }
      setSubjectName('');
      setSubjectDept('');
      setSelectedGrades([]);
      setEditingSubjectId(null);
      fetchSubjects();
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save subject.');
    }
  };

  const handleDeleteSubject = async (id, name) => {
    const result = await showConfirmDialog({
  title: 'Delete Subject',
  text: `Are you sure you want to delete "${name}"?`,
  icon: 'warning',
  confirmButtonText: 'Yes, delete',
  cancelButtonText: 'Cancel'
});

if (!result) return;
    try {
      await axios.delete(`/subjects/${id}`);
      toast.success('Subject deleted.');
      fetchSubjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete subject.');
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!classGrade) {
      toast.error('Please select a grade.');
      return;
    }
    if ((classGrade === '11' || classGrade === '12') && !classStream) {
      toast.error('Please select a stream (Natural or Social) for Grade 11/12.');
      return;
    }
    const finalName = derivedClassName;
    try {
      await axios.post('/classroom/classes', {
        name: finalName,
        grade: Number(classGrade),
        stream: classStream || undefined,
        section: classSection || undefined,
        teacherId: classTeacherId || undefined
      });
      toast.success(`Class "${finalName}" created.`);
      setClassGrade('');
      setClassStream('');
      setClassSection('');
      setClassTeacherId('');
      fetchClasses();
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create class.');
    }
  };

  const groupedByGrade = classes.reduce((acc, cls) => {
    const gradeMatch = cls.name.match(/\d+/);
    const grade = gradeMatch ? `Grade ${gradeMatch[0]}` : cls.name;
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(cls);
    return acc;
  }, {});

  const mandatoryCount = displayedSubjects.filter((s) => !s.isElective).length;
  const electiveCount = displayedSubjects.filter((s) => s.isElective).length;

  // Filter subjects for All Subjects tab
  const filteredSubjects = useMemo(() => {
    if (!subjectSearchQuery.trim()) return displayedSubjects;
    const query = subjectSearchQuery.toLowerCase().trim();
    return displayedSubjects.filter(
      (s) =>
        s.name?.toLowerCase().includes(query) ||
        s.department?.toLowerCase().includes(query) ||
        s.gradesOffered?.some((g) => g.toLowerCase().includes(query)) ||
        s.branch?.name?.toLowerCase().includes(query)
    );
  }, [displayedSubjects, subjectSearchQuery]);

  const totalSubjectPages = Math.ceil(filteredSubjects.length / subjectPageSize) || 1;
  const safeSubjectPage = Math.min(subjectCurrentPage, totalSubjectPages);
  const subjectStartIndex = (safeSubjectPage - 1) * subjectPageSize;
  const subjectEndIndex = Math.min(subjectStartIndex + subjectPageSize, filteredSubjects.length);
  const paginatedSubjects = useMemo(() => {
    return filteredSubjects.slice(subjectStartIndex, subjectEndIndex);
  }, [filteredSubjects, subjectStartIndex, subjectEndIndex]);

  // Group subjects by grade
  const subjectsByGrade = useMemo(() => {
    return displayedSubjects.reduce((acc, subject) => {
      (subject.gradesOffered || []).forEach((grade) => {
        if (!acc[grade]) acc[grade] = [];
        acc[grade].push(subject);
      });
      return acc;
    }, {});
  }, [displayedSubjects]);

  const allGradeKeys = useMemo(() => {
    return Object.keys(subjectsByGrade).sort((a, b) => {
      const aNum = Number(a.match(/\d+/)?.[0] || 0);
      const bNum = Number(b.match(/\d+/)?.[0] || 0);
      if (aNum !== bNum) return aNum - bNum;
      return a.localeCompare(b);
    });
  }, [subjectsByGrade]);

  const filteredSubjectsByGrade = useMemo(() => {
    const entries = Object.entries(subjectsByGrade);
    if (selectedGradeFilter !== 'All') {
      return entries.filter(([grade]) => grade === selectedGradeFilter);
    }
    return entries;
  }, [subjectsByGrade, selectedGradeFilter]);

  const totalGradeEntries = filteredSubjectsByGrade.length;
  const totalGradePages = Math.ceil(totalGradeEntries / gradeSubjectPageSize) || 1;
  const safeGradePage = Math.min(gradeSubjectPage, totalGradePages);
  const gradeStartIndex = (safeGradePage - 1) * gradeSubjectPageSize;
  const gradeEndIndex = Math.min(gradeStartIndex + gradeSubjectPageSize, totalGradeEntries);
  const paginatedGradeEntries = useMemo(() => {
    return filteredSubjectsByGrade
      .sort((a, b) => {
        const aNum = Number(a[0].match(/\d+/)?.[0] || 0);
        const bNum = Number(b[0].match(/\d+/)?.[0] || 0);
        return aNum - bNum;
      })
      .slice(gradeStartIndex, gradeEndIndex);
  }, [filteredSubjectsByGrade, gradeStartIndex, gradeEndIndex]);

  // Subjects without grades assigned
  const unassignedSubjects = displayedSubjects.filter((s) => !s.gradesOffered || s.gradesOffered.length === 0);

  const openModal = (mode) => {
    setModalMode(mode);
    setEditingSubjectId(null);
    setSubjectName('');
    setSubjectDept('');
    setSelectedGrades([]);
    if (!canSelectBranch && activeBranchId) {
      setSelectedBranchId(activeBranchId);
    } else if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
    setShowModal(true);
  };

  const openEditSubjectModal = (subject) => {
    setEditingSubjectId(subject.id);
    setSubjectName(subject.name);
    setSubjectDept(subject.department || '');
    setSelectedGrades(subject.gradesOffered || []);
    if (subject.branchId) {
      setSelectedBranchId(subject.branchId);
    } else if (!canSelectBranch && activeBranchId) {
      setSelectedBranchId(activeBranchId);
    }
    setModalMode('subject');
    setShowModal(true);
  };

  return (
    <AdminLayout
      pageTitle="System Management"
      headerAction={
        <button
          onClick={() => openModal('subject')}
          className="flex items-center gap-1.5 shrink-0 rounded-lg bg-black px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-white transition hover:bg-gray-800"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14m-7-7h14" />
          </svg>
          <span className="hidden sm:inline">Add Subject</span>
        </button>
      }
    >
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === 'subject' ? (editingSubjectId ? 'Edit Subject' : 'Add New Subject') : 'Add New Class'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-xl text-gray-400 hover:text-gray-700">
                ✕
              </button>
            </div>


            {modalMode === 'subject' && (
              <form onSubmit={handleCreateSubject} className="space-y-4">
                {canSelectBranch && branches.length > 1 && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Target Branch</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Subject Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Department (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Science"
                      value={subjectDept}
                      onChange={(e) => setSubjectDept(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Grades</label>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-300 p-3">
                      {loadingClasses ? (
                        <div className="text-sm text-gray-500">Loading grades...</div>
                      ) : gradeOptions.length > 0 ? (
                        <div className="space-y-2">
                          {gradeOptions.map((grade) => (
                            <label key={grade} className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={selectedGrades.includes(grade)}
                                onChange={() => handleGradeToggle(grade)}
                                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                              />
                              <span>{grade}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No grades available from current classes.</div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Select one or more grades that learn this subject.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedGrades.map((grade) => (
                    <span
                      key={grade}
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
                    >
                      {grade}
                    </span>
                  ))}
                </div>

                <div className="mt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900"
                  >
                    Create Subject
                  </button>
                </div>
              </form>
            )}

            {modalMode === 'class' && (
              <form onSubmit={handleCreateClass} className="space-y-4">

                {/* Grade selector */}
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Grade <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={classGrade}
                    onChange={(e) => { setClassGrade(e.target.value); setClassStream(''); }}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
                  >
                    <option value="">Select grade…</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                      <option key={g} value={String(g)}>Grade {g}</option>
                    ))}
                  </select>
                </div>

                {/* Stream — only for Grade 11 and 12 */}
                {(classGrade === '11' || classGrade === '12') && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Stream <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Natural', 'Social'].map((stream) => (
                        <button
                          key={stream}
                          type="button"
                          onClick={() => setClassStream(stream)}
                          className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                            classStream === stream
                              ? 'border-black bg-black text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {stream === 'Natural' ? '🔬' : '📚'} {stream}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Select the academic stream for this class.</p>
                  </div>
                )}

                {/* Optional section label */}
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Section <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    placeholder="e.g. A, B, C"
                    value={classSection}
                    onChange={(e) => setClassSection(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
                  />
                </div>

                {/* Preview of generated class name */}
                {derivedClassName && (
                  <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Class name preview: </span>
                    <span className="text-sm font-bold text-gray-900">{derivedClassName}</span>
                  </div>
                )}

                {/* Homeroom teacher */}
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Homeroom Teacher (optional)</label>
                  <select
                    value={classTeacherId}
                    onChange={(e) => setClassTeacherId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-black focus:outline-none"
                  >
                    <option value="">None</option>
                    {teachers.map((t) => (
                      <option key={t._id || t.id} value={t._id || t.id}>
                        {t.user?.name || t.teacherId}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900"
                  >
                    Create Class
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Subject Management</h2>
        <p className="max-w-2xl text-sm text-gray-500">
          Configure and maintain the branch's curriculum. Manage subject assignments and grade-level distributions.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4">
        {[
          { label: 'Total Subjects', value: displayedSubjects.length, color: 'text-gray-900' },
          { label: 'Mandatory', value: mandatoryCount, color: 'text-green-600' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{card.label}</div>
            <div className={`text-4xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* All Subjects List */}
      <div className="mb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 rounded-full bg-black"></div>
            <h3 className="text-xl font-bold text-gray-900">All Subjects</h3>
            <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-bold text-gray-600">
              {filteredSubjects.length} {filteredSubjects.length === 1 ? 'Subject' : 'Subjects'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <input
                type="text"
                placeholder="Search subject or dept…"
                value={subjectSearchQuery}
                onChange={(e) => {
                  setSubjectSearchQuery(e.target.value);
                  setSubjectCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                🔍
              </span>
              {subjectSearchQuery && (
                <button
                  onClick={() => {
                    setSubjectSearchQuery('');
                    setSubjectCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <span>Show:</span>
              <select
                value={subjectPageSize}
                onChange={(e) => {
                  setSubjectPageSize(Number(e.target.value));
                  setSubjectCurrentPage(1);
                }}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-black"
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>

            {canSelectBranch && branches.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-500">Filter Branch:</label>
                <select
                  value={filterBranchId}
                  onChange={(e) => {
                    setFilterBranchId(e.target.value);
                    setSubjectCurrentPage(1);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold focus:border-black focus:outline-none bg-white"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {paginatedSubjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
            {subjectSearchQuery ? `No subjects found matching "${subjectSearchQuery}".` : 'No subjects available.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedSubjects.map((s) => (
              <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{s.name}</span>
                      {s.branch ? (
                        <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700">
                          {s.branch.name}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-500">
                          Global
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{s.department || 'General'}</div>
                    {s.gradesOffered && s.gradesOffered.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.gradesOffered.map((grade) => (
                          <span key={grade} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                            {grade}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={() => openEditSubjectModal(s)} className="text-gray-400 hover:text-blue-600 transition">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button onClick={() => handleDeleteSubject(s.id, s.name)} className="text-gray-400 hover:text-red-600 transition">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Bar for All Subjects */}
        {filteredSubjects.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs font-medium text-gray-500">
            <div>
              Showing <span className="font-bold text-gray-900">{subjectStartIndex + 1}</span> to{' '}
              <span className="font-bold text-gray-900">{subjectEndIndex}</span> of{' '}
              <span className="font-bold text-gray-900">{filteredSubjects.length}</span> subjects
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSubjectCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={safeSubjectPage === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 font-semibold transition"
              >
                Previous
              </button>

              <span className="px-2 font-bold text-gray-800">
                Page {safeSubjectPage} of {totalSubjectPages}
              </span>

              <button
                onClick={() => setSubjectCurrentPage((p) => Math.min(p + 1, totalSubjectPages))}
                disabled={safeSubjectPage === totalSubjectPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 font-semibold transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assigned Subjects by Grade */}
      {Object.keys(subjectsByGrade).length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 rounded-full bg-black"></div>
              <h3 className="text-xl font-bold text-gray-900">Assigned Subjects by Grade</h3>
            </div>

            {/* Grade Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-gray-500">Filter Grade:</label>
              <select
                value={selectedGradeFilter}
                onChange={(e) => {
                  setSelectedGradeFilter(e.target.value);
                  setGradeSubjectPage(1);
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold focus:border-black focus:outline-none bg-white"
              >
                <option value="All">All Grades</option>
                {allGradeKeys.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>

              {/* Page Size Selector for Grade-Assigned Subjects */}
              <div className="flex items-center gap-1 text-xs font-medium text-gray-500 ml-2">
                <span>Show:</span>
                <select
                  value={gradeSubjectPageSize}
                  onChange={(e) => {
                    setGradeSubjectPageSize(Number(e.target.value));
                    setGradeSubjectPage(1);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-black"
                >
                  <option value={3}>3 Grades</option>
                  <option value={6}>6 Grades</option>
                  <option value={12}>12 Grades</option>
                </select>
              </div>
            </div>
          </div>

          {paginatedGradeEntries.map(([grade, gradeSubjects]) => (
            <div key={grade} className="mb-6 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-5 w-1 rounded-full bg-blue-600"></div>
                <h4 className="text-lg font-bold text-gray-900">{grade}</h4>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                  {gradeSubjects.length} {gradeSubjects.length === 1 ? 'Subject' : 'Subjects'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {gradeSubjects.map((s) => (
                  <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <div className="font-bold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.department || 'General'}</div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button onClick={() => openEditSubjectModal(s)} className="text-gray-400 hover:text-blue-600 transition">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button onClick={() => handleDeleteSubject(s.id, s.name)} className="text-gray-400 hover:text-red-600 transition">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Pagination Bar for Assigned Subjects by Grade */}
          {totalGradeEntries > 0 && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs font-medium text-gray-500">
              <div>
                Showing <span className="font-bold text-gray-900">{gradeStartIndex + 1}</span> to{' '}
                <span className="font-bold text-gray-900">{gradeEndIndex}</span> of{' '}
                <span className="font-bold text-gray-900">{totalGradeEntries}</span> grade sections
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setGradeSubjectPage((p) => Math.max(p - 1, 1))}
                  disabled={safeGradePage === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 font-semibold transition"
                >
                  Previous
                </button>

                <span className="px-2 font-bold text-gray-800">
                  Page {safeGradePage} of {totalGradePages}
                </span>

                <button
                  onClick={() => setGradeSubjectPage((p) => Math.min(p + 1, totalGradePages))}
                  disabled={safeGradePage === totalGradePages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 font-semibold transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {Object.entries(groupedByGrade).length > 0 && (
        Object.entries(groupedByGrade).map(([grade, classItems]) => (
          <div key={grade} className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-6 w-1 rounded-full bg-black"></div>
              <h3 className="text-xl font-bold text-gray-900">{grade}</h3>
              <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-bold text-gray-600">
                {classItems.length} Classes
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {classItems.map((cls) => (
                <div key={cls.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="font-bold text-gray-900">{cls.name}</div>
                      <div className="text-xs text-gray-500">{cls.subject}</div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Dept</div>
                      <div className="mt-1 text-lg font-bold text-gray-900">{cls.subject}</div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button className="text-gray-400 hover:text-gray-700">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button className="text-gray-400 hover:text-red-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {!loadingSubjects && !loadingClasses && subjects.length === 0 && Object.entries(groupedByGrade).length === 0 && (
        <div className="mb-8 rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center">
          <p className="text-gray-500">No subjects or classes configured yet.</p>
          <button
            onClick={() => openModal('subject')}
            className="mt-4 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900"
          >
            Add First Subject
          </button>
        </div>
      )}

      {(loadingSubjects || loadingClasses) && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white py-12 text-center">
          <p className="text-gray-500">Loading subjects and classes...</p>
        </div>
      )}

      <div className="relative overflow-hidden rounded-xl bg-black p-8 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&amp;fit=crop&amp;q=80')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
        <div className="relative z-10">
          <h3 className="mb-2 text-2xl font-bold">Expanding the Curriculum?</h3>
          <p className="mb-6 max-w-md text-sm text-gray-400">
            Our system supports modular subject integration for the upcoming academic year. Add elective streams easily.
          </p>
          <button
            onClick={() => openModal('subject')}
            className="rounded-lg bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-gray-100"
          >
            Start Batch Upload
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}