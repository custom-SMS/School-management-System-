import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

const DEFAULT_COMPONENTS = [
  { name: 'Quiz', weight: 10 },
  { name: 'Assignment', weight: 20 },
  { name: 'Midterm', weight: 30 },
  { name: 'Final', weight: 40 },
];

// --- Shared static queries (cached globally) ----------------------------------

export function useActiveYearQuery() {
  return useQuery({
    queryKey: ['academicYears', 'active'],
    queryFn: async () => {
      const res = await api.get('/academic-years');
      const years: any[] = res.data || [];
      return years.find((y: any) => y.isActive) || years[0] || null;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useGradingStructureQuery() {
  return useQuery({
    queryKey: ['gradingStructure'],
    queryFn: async () => {
      try {
        const res = await api.get('/classroom/grading-structure');
        return res.data?.components?.length ? res.data.components : DEFAULT_COMPONENTS;
      } catch {
        return DEFAULT_COMPONENTS;
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useClassListQuery() {
  return useQuery({
    queryKey: ['classrooms', 'all'],
    queryFn: async () => {
      try {
        const res = await api.get('/classroom/classes');
        return res.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

// --- Teacher class summary (for active class label) ---------------------------

export function useTeacherClassSummaryQuery(classId: string | null) {
  return useQuery({
    queryKey: ['teacher', 'classSummary', classId],
    queryFn: async () => {
      const res = await api.get('/stats/teacher/me');
      return (res.data?.classSummaries || []).find((c: any) => c.classId === classId) || null;
    },
    enabled: !!classId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

// --- Per-class homeroom data (cached per classId + semesterId) -----------------

export function useHomeroomDataQuery(
  classId: string | null,
  activeYearId: string | null | undefined,
  semesterId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['homeroom', 'class', classId, activeYearId ?? null, semesterId ?? null],
    queryFn: async () => {
      if (!classId) throw new Error('No classId');
      const semParam = semesterId ? `?semesterId=${semesterId}` : '';

      // Fire all independent requests in parallel
      const [gradesRes, sectionsRes, rcRes] = await Promise.all([
        api.get(`/classroom/grades/submitted/${classId}${semParam}`),
        api.get(`/classroom/sections/${classId}`),
        activeYearId
          ? api.get(`/report-cards/class/${classId}/${activeYearId}${semParam}`).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);

      const gradesList: any[] = gradesRes.data || [];
      const sections: any[] = sectionsRes.data || [];
      const rcList: any[] = rcRes.data || [];

      // Fetch all sections in parallel instead of sequential for-loop
      const sectionStudentResults = await Promise.allSettled(
        sections.map((sec: any) =>
          api.get(`/classroom/sections/detail/${sec.id}/students`)
        )
      );

      const seen = new Set<string>();
      const allStudents: any[] = [];

      sectionStudentResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const payload = result.value.data || {};
          // Handle both /students endpoint shape ({ students: [...] }) and raw enrollments
          const studentList = Array.isArray(payload.students)
            ? payload.students.filter((s: any) => s.isAssignedToSection)
            : Array.isArray(payload.enrollments)
            ? payload.enrollments.map((e: any) => e.student).filter(Boolean)
            : [];

          studentList.forEach((s: any) => {
            if (s && !seen.has(s.id)) {
              seen.add(s.id);
              allStudents.push(s);
            }
          });
        }
      });

      // Include students from grades not found in sections
      gradesList.forEach((g: any) => {
        if (g.student && !seen.has(g.student.id)) {
          seen.add(g.student.id);
          allStudents.push(g.student);
        }
      });

      allStudents.sort((a: any, b: any) =>
        (a.user?.name || '').localeCompare(b.user?.name || '')
      );

      const map: Record<string, { student: any; grades: any[]; rc: any | null }> = {};
      allStudents.forEach((student: any) => {
        const sId = student.id || student._id;
        const rc = rcList.find((r: any) => r.studentId === sId) || null;
        map[sId] = { student, grades: [], rc };
      });
      gradesList.forEach((grade: any) => {
        const sid = grade.student?.id || grade.student?._id;
        if (sid && map[sid]) map[sid].grades.push(grade);
      });

      return {
        studentOrder: allStudents.map((s: any) => s.id || s._id),
        studentMap: map,
      };
    },
    enabled: !!classId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}

// --- Invalidate homeroom cache after a save -----------------------------------
export function useInvalidateHomeroomData() {
  const qc = useQueryClient();
  return (classId: string) => {
    qc.invalidateQueries({ queryKey: ['homeroom', 'class', classId] });
  };
}
