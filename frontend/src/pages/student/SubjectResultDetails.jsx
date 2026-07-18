import { useCallback, useEffect, useState, useContext, useMemo } from 'react';

import { useParams, Link } from 'react-router-dom';

import axios from '../../api/axios';

import StudentLayout from '../../components/StudentLayout';

import { toast } from 'react-toastify';

import { AuthContext } from '../../context/AuthContext';



const passMark = 50;



export default function SubjectResultDetails() {

  const { subjectKey } = useParams();

  const { user } = useContext(AuthContext);

  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [gradingConfig, setGradingConfig] = useState({ components: [
    { name: 'Quiz', weight: 10 }, { name: 'Assignment', weight: 20 },
    { name: 'Midterm', weight: 30 }, { name: 'Final', weight: 40 },
  ] });

  const dynamicComponents = useMemo(() =>
    gradingConfig.components.map(c => ({ field: c.name, label: c.name, weight: c.weight })),
    [gradingConfig]
  );

  const [studentClasses, setStudentClasses] = useState([]);



  // Fetch grading structure to get correct max values

  useEffect(() => {

    axios.get('/classroom/grading-structure').then((r) => { if (r.data?.components) setGradingConfig({ components: r.data.components }); }).catch(() => {});

  }, []);



  // Fetch student's classes to get classId for each subject

  useEffect(() => {

    if (!user?._id) return;

    // Use the stats endpoint which already includes student classes data

    axios.get('/stats/student/me')

      .then((r) => {

        const student = r.data?.profile;

        // Extract classes from the profile or grades

        const classes = [];

        const grades = r.data?.grades || [];

        grades.forEach((g) => {

          if (g.classRef && !classes.find(c => c._id === g.classRef._id)) {

            classes.push({

              _id: g.classRef._id,

              name: g.classRef.name,

              subject: g.subject,

              courseCode: g.subjectRef?.code,

            });

          }

        });

        setStudentClasses(classes);

      })

      .catch(() => {});

  }, [user?._id]);



  const load = useCallback(() => {

    if (!subjectKey) return;

    setRefreshing(true);

    setError(false);



    // Find the class that matches the subjectKey

    const [classId, ...subjectParts] = subjectKey.split('-');

    const subject = subjectParts.join('-');

    const matchingClass = studentClasses.find((c) => 

      (c.subject === subject || c._id === classId || c.name === subject)

    );

    

    if (matchingClass) {

      // Fetch from classroom grades endpoint for real-time data

      axios.get(`/classroom/grades/${matchingClass._id}/${encodeURIComponent(matchingClass.subject)}`)

        .then((r) => {

          // Find the current student's grades from the class data

          const studentGrade = (r.data || []).find((g) => 

            (g.student?._id || g.student) === user.studentId || 

            (g.student?.user?._id || g.student?.user?.id) === user._id

          );

          

          if (studentGrade) {

            // Transform classroom grades data to match expected format

            const components = dynamicComponents;

            

            const assessments = components.map((c) => {

              const value = studentGrade.marks?.[c.field];

              const max = c.weight;

              return {

                id: c.field,

                name: c.label,

                score: value,

                max: max,

                percentage: max > 0 ? (Number(value) / max) * 100 : Number(value) || 0,

                date: new Date().toISOString(),

              };

            });

            

            // Calculate total using weighted average (same logic as teacher's Gradebook)

            const totalMarks = components.reduce((sum, c) => {

              const raw = Number(studentGrade.marks?.[c.field]) || 0;

              const weight = Number(c.weight);

              if (weight === 0) return sum;

              const contribution = raw > weight ? (raw / 100) * weight : raw;

              return sum + contribution;

            }, 0);

            const percentage = totalMarks;

            

            setData({

              subject: {

                name: matchingClass.subject,

                courseCode: matchingClass.courseCode,

                className: matchingClass.name,

              },

              assessments,

              summary: {

                totalMarks,

                percentage,

                maxTotal: 100,

                assessmentsCount: assessments.length,

                updatedAt: new Date().toISOString(),

              }

            });

            setLoading(false);

            if (refreshing) toast.success('Grades refreshed successfully');

          } else {

            // Student not found in class grades, fallback to stats

            throw new Error('Student not found in class grades');

          }

        })

        .catch(() => {

          // Fallback to stats endpoint if classroom grades fails

          axios.get('/stats/student/me')

            .then((r) => {

              const grades = r.data?.grades || [];

              const subjectGrades = grades.filter((g) => {

                const decoded = decodeURIComponent(subjectKey);

                const id = String(g.subjectId || g.subject || g.subjectRef?.id || g._id || g.id || '');

                const name = String(g.subject || g.subjectRef?.name || '');

                return id === decoded || name === decoded;

              });

              

              if (subjectGrades.length > 0) {

                const primary = subjectGrades[0];

                const components = dynamicComponents;

                

                const assessments = components.map((c) => {

                  const value = primary.marks?.[c.field];

                  const max = c.weight;

                  return {

                    id: c.field,

                    name: c.label,

                    score: value,

                    max: max,

                    percentage: max > 0 ? (Number(value) / max) * 100 : Number(value) || 0,

                    date: primary.updatedAt || primary.createdAt,

                  };

                });

                

                // Calculate total using weighted average (same logic as teacher's Gradebook)

                const totalMarks = components.reduce((sum, c) => {

                  const raw = Number(primary.marks?.[c.field]) || 0;

                  const weight = Number(c.weight);

                  if (weight === 0) return sum;

                  const contribution = raw > weight ? (raw / 100) * weight : raw;

                  return sum + contribution;

                }, 0);

                const percentage = totalMarks;

                

                setData({

                  subject: {

                    name: primary.subject || primary.subjectRef?.name,

                    courseCode: primary.subjectRef?.code,

                    className: primary.class?.name,

                  },

                  assessments,

                  summary: {

                    totalMarks,

                    percentage,

                    maxTotal: 100,

                    assessmentsCount: assessments.length,

                    updatedAt: primary.updatedAt,

                  }

                });

              } else {

                setData({ subject: { name: subject }, assessments: [], summary: {} });

              }

              setLoading(false);

            })

            .catch(() => {

              setError(true);

              setLoading(false);

              toast.error('Failed to load grades');

            });

        })

        .finally(() => setRefreshing(false));

    } else {

      // Fallback to stats endpoint if no matching class found

      axios.get('/stats/student/me')

        .then((r) => {

          const grades = r.data?.grades || [];

          const subjectGrades = grades.filter((g) => {

            const decoded = decodeURIComponent(subjectKey);

            const id = String(g.subjectId || g.subject || g.subjectRef?.id || g._id || g.id || '');

            const name = String(g.subject || g.subjectRef?.name || '');

            return id === decoded || name === decoded;

          });

          

          if (subjectGrades.length > 0) {

            const primary = subjectGrades[0];

             const components = dynamicComponents;

            

            const assessments = components.map((c) => {

              const value = primary.marks?.[c.field];

              const max = c.weight;

              return {

                id: c.field,

                name: c.label,

                score: value,

                max: max,

                percentage: max > 0 ? (Number(value) / max) * 100 : Number(value) || 0,

                date: primary.updatedAt || primary.createdAt,

              };

            });

            

            // Calculate total using weighted average (same logic as teacher's Gradebook)

            const totalMarks = components.reduce((sum, c) => {

              const raw = Number(primary.marks?.[c.field]) || 0;

              const weight = Number(c.weight);

              if (weight === 0) return sum;

              const contribution = raw > weight ? (raw / 100) * weight : raw;

              return sum + contribution;

            }, 0);

            const percentage = totalMarks;

            

            setData({

              subject: {

                name: primary.subject || primary.subjectRef?.name,

                courseCode: primary.subjectRef?.code,

                className: primary.class?.name,

              },

              assessments,

              summary: {

                totalMarks,

                percentage,

                maxTotal: 100,

                assessmentsCount: assessments.length,

                updatedAt: primary.updatedAt,

              }

            });

          } else {

            setData({ subject: { name: subject }, assessments: [], summary: {} });

          }

          setLoading(false);

        })

        .catch(() => {

          setError(true);

          setLoading(false);

          toast.error('Failed to load grades');

        })

        .finally(() => setRefreshing(false));

    }

  }, [subjectKey, studentClasses, gradingConfig, user?.studentId, user?._id, refreshing]);



  useEffect(() => {

    load();

  }, [load]);



  // Re-fetch when the tab regains focus so teacher updates appear

  useEffect(() => {

    const onFocus = () => load();

    window.addEventListener('focus', onFocus);

    return () => window.removeEventListener('focus', onFocus);

  }, [load]);



  const subject = data?.subject || {};

  const assessments = data?.assessments || [];

  const summary = data?.summary || {};

  const totalMarks = summary.totalMarks;

  const percentage = summary.percentage ?? summary.bestPercentage;

  const passStatus = percentage != null ? (percentage >= passMark ? 'Pass' : 'Fail') : '—';



  return (

    <StudentLayout searchPlaceholder="Search records...">

      <div className="mb-6 flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900">

            {subject.name || decodeURIComponent(subjectKey || 'Subject')}

          </h1>

          <p className="text-sm text-slate-500">

            Course Code: {subject.courseCode || '—'}

            {subject.className ? ` · ${subject.className}` : ''}

          </p>

        </div>

        <div className="flex items-center gap-3">

          <button

            onClick={() => setRefreshing(true)}

            disabled={refreshing}

            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"

          >

            <svg className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" /></svg>

            {refreshing ? 'Refreshing…' : 'Refresh'}

          </button>

          <Link to="/student/academics" className="text-sm font-semibold text-slate-500 hover:text-slate-900">

            Back to Subjects

          </Link>

        </div>

      </div>



      {loading ? (

        <div className="mt-6 flex flex-col items-center py-20 text-slate-400">

          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />

          Loading subject results…

        </div>

      ) : error ? (

        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">

          <p className="text-lg font-bold text-rose-700">Could not load subject results</p>

          <button onClick={load} className="mt-4 rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-rose-700">

            Retry

          </button>

        </div>

      ) : (

        <div className="space-y-6">

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">Assessment Results</h2>

            <div className="mt-4 overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead>

                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">

                    <th className="py-3 pr-4 font-semibold">Assessment</th>

                    <th className="py-3 pr-4 font-semibold">Score</th>

                    <th className="py-3 pr-4 font-semibold">Max</th>

                    <th className="py-3 pr-4 font-semibold">Percentage</th>

                    <th className="py-3 pr-4 font-semibold">Date</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {assessments.length ? (

                    assessments.map((r) => (

                      <tr key={r.id} className="text-slate-700">

                        <td className="py-3 pr-4 font-semibold">{r.name}</td>

                        <td className="py-3 pr-4">{r.score != null ? r.score : ''}</td>

                        <td className="py-3 pr-4">{r.max != null ? r.max : ''}</td>

                        <td className="py-3 pr-4">

                          {r.percentage != null ? Number(r.percentage).toFixed(2) + '%' : ''}

                        </td>

                        <td className="py-3 pr-4 text-xs text-slate-400">

                          {r.date || r.recordedAt ? new Date(r.date || r.recordedAt).toLocaleDateString() : ''}

                        </td>

                      </tr>

                    ))

                  ) : (

                    <tr>

                      <td colSpan="5" className="py-8 text-center text-sm text-slate-400">

                        No detailed results published for this subject yet.

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </section>



          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">Summary</h2>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">

              <div className="rounded-2xl bg-slate-50 p-4 text-sm">

                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Total Marks</div>

                <div className="mt-2 text-lg font-bold text-slate-900">

                  {totalMarks != null ? (

                    <>

                      {Number(totalMarks).toFixed(2)}

                      {summary.maxTotal != null ? ` / ${summary.maxTotal}` : ''}

                    </>

                  ) : (

                    '—'

                  )}

                </div>

              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm">

                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Overall Percentage</div>

                <div className="mt-2 text-lg font-bold text-slate-900">

                  {percentage != null ? Number(percentage).toFixed(2) + '%' : '—'}

                </div>

              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm">

                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Assessments</div>

                <div className="mt-2 text-lg font-bold text-slate-900">{summary.assessmentsCount ?? 0}</div>

              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm">

                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Pass Status</div>

                <div className="mt-2 text-lg font-bold text-slate-900">{passStatus}</div>

              </div>

            </div>

            {summary.updatedAt && (

              <p className="mt-4 text-xs text-slate-400">

                Last updated: {new Date(summary.updatedAt).toLocaleString()}

              </p>

            )}

          </section>

        </div>

      )}

    </StudentLayout>

  );

}

