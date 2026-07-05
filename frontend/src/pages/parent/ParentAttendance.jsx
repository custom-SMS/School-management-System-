import ParentLayout from '../../components/ParentLayout';
import { useParentChildren } from '../../hooks/useParentChildren';

export default function ParentAttendance() {
  const { children, childId, setChildId, selectedChild, loading, error } = useParentChildren();
  const attendance = selectedChild?.attendance || [];
  const present = attendance.filter((a) => a.status === 'Present').length;
  const absent = attendance.filter((a) => a.status === 'Absent').length;
  const late = attendance.filter((a) => a.status === 'Late').length;
  const rate = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
  const name = selectedChild?.profile?.user?.name || 'Child';

  return (
    <ParentLayout kids={children} childId={childId} onSelectChild={setChildId}>
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Attendance Record</h1>
        <p className="text-sm text-slate-500">{name} · last {attendance.length} sessions</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">Loading…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 py-10 text-center">
          <p className="font-semibold text-rose-700">Could not load attendance data.</p>
          <p className="mt-1 text-sm text-rose-500">The server may be unavailable. Please refresh the page or try again later.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Attendance Rate</div>
              <div className="mt-1 text-3xl font-black text-slate-900">{rate}%</div>
            </div>
            <div className="rounded-2xl border-l-4 border-emerald-500 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Present</div>
              <div className="mt-1 text-3xl font-black text-emerald-600">{present}</div>
            </div>
            <div className="rounded-2xl border-l-4 border-rose-500 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Absent</div>
              <div className="mt-1 text-3xl font-black text-rose-600">{absent}</div>
            </div>
            <div className="rounded-2xl border-l-4 border-amber-500 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">Late</div>
              <div className="mt-1 text-3xl font-black text-amber-600">{late}</div>
            </div>
          </div>

          {rate < 90 && attendance.length > 0 && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <svg className="h-6 w-6 shrink-0 text-rose-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 1 21h22L12 2zm0 6 6.5 11h-13L12 8zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z" /></svg>
              <div>
                <div className="font-bold text-rose-700">Attendance below 90%</div>
                <p className="text-sm text-rose-600">{name}'s attendance is under the institutional threshold. Please review recent absences below.</p>
              </div>
            </div>
          )}

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Session History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-3 pr-4 font-semibold">Date</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.map((a, i) => {
                    const tone = a.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : a.status === 'Late' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700';
                    return (
                      <tr key={i} className="text-slate-700">
                        <td className="py-3 pr-4">{new Date(a.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        <td className="py-3 pr-4"><span className={`rounded-md px-2.5 py-1 text-xs font-bold ${tone}`}>{a.status}</span></td>
                      </tr>
                    );
                  })}
                  {attendance.length === 0 && <tr><td colSpan="2" className="py-8 text-center text-slate-400">No attendance records yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </ParentLayout>
  );
}
