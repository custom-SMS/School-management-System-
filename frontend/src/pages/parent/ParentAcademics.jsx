import ParentLayout from '../../components/ParentLayout';
import { useParentChildren } from '../../hooks/useParentChildren';

const letter = (t) => (t >= 90 ? 'A' : t >= 80 ? 'B' : t >= 70 ? 'C' : t >= 60 ? 'D' : 'F');

export default function ParentAcademics() {
  const { children, childId, setChildId, selectedChild, loading, error } = useParentChildren();
  const grades = selectedChild?.grades || [];
  const avg = grades.length ? (grades.reduce((s, g) => s + Number(g.percentage || 0), 0) / grades.length).toFixed(1) : '0.0';
  const name = selectedChild?.profile?.user?.name || 'Child';

  return (
    <ParentLayout kids={children} childId={childId} onSelectChild={setChildId}>
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Academic Performance</h1>
        <p className="text-sm text-slate-500">{name} · {selectedChild?.profile?.grade || ''}{selectedChild?.profile?.stream ? ` (${selectedChild.profile.stream})` : ''} · ID {selectedChild?.profile?.studentId || ''}</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">Loading…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 py-10 text-center">
          <p className="font-semibold text-rose-700">Could not load academic data.</p>
          <p className="mt-1 text-sm text-rose-500">The server may be unavailable. Please refresh the page or try again later.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Average Score</div>
              <div className="mt-1 text-3xl font-black text-slate-900">{avg}%</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Subjects Graded</div>
              <div className="mt-1 text-3xl font-black text-slate-900">{grades.length}</div>
            </div>
            <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-300">Overall Standing</div>
              <div className="mt-1 text-3xl font-black">{letter(Number(avg))}</div>
            </div>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Subject Performance</h2>
            <div className="space-y-4">
              {grades.map((g) => {
                const p = Number(g.percentage || 0);
                return (
                  <div key={g._id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700">{g.subject}</span>
                      <span className="font-bold text-slate-900">{p.toFixed(0)}% · {letter(p)}</span>
                    </div>
                    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${p < 70 ? 'bg-rose-500' : 'bg-slate-900'}`} style={{ width: `${p}%` }} />
                    </div>
                  </div>
                );
              })}
              {grades.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No grades published yet.</p>}
            </div>
          </section>
        </>
      )}
    </ParentLayout>
  );
}
