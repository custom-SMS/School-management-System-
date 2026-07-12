import { useEffect, useState } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import CashierLayout from '../../components/CashierLayout';

const etb = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

export default function Verification() {
  const [slips, setSlips] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [working, setWorking] = useState(false);

  const fetchSlips = async () => {
    try {
      const res = await axios.get('/fees/pending-verifications');
      const data = res.data || [];
      setSlips(data);
      setActiveId((cur) => cur || data[0]?.id || null);
    } catch {
      setSlips([]);
    }
  };

  useEffect(() => {
    fetchSlips();
  }, []);

  const active = slips.find((s) => s.id === activeId) || null;

  const decide = async (status) => {
    if (!active) return;
    setWorking(true);
    try {
      await axios.patch(`/fees/verify/${active.id}`, { status });
      toast.success(`Slip ${status === 'Verified' ? 'approved' : 'rejected'} for ${active.fee?.student?.user?.name || 'student'}.`);
      const remaining = slips.filter((s) => s.id !== active.id);
      setSlips(remaining);
      setActiveId(remaining[0]?.id || null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Verification failed.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <CashierLayout searchPlaceholder="Search by student ID or Slip No...">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        {/* Pending list */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">Pending Slips</h2>
            <span className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">{slips.length} NEW</span>
          </div>
          <div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
            {slips.map((s) => {
              const isActive = s.id === activeId;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition ${isActive ? 'border-l-4 border-slate-900 bg-slate-50' : 'border-l-4 border-transparent hover:bg-slate-50'}`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      SLIP # {s.bankName || 'BANK'}-{String(s.id).slice(-5)}
                    </div>
                    <div className="mt-1 truncate font-bold text-slate-900">{s.fee?.student?.user?.name || 'Student'}</div>
                    <div className="truncate text-xs text-slate-400">
                      ID: {s.fee?.student?.studentId || '—'} · {s.fee?.description || 'Tuition'}
                    </div>
                    <div className="mt-1 font-bold text-slate-900">ETB {etb(s.amount)}</div>
                  </div>
                  <svg className="h-5 w-5 shrink-0 text-slate-300" viewBox="0 0 24 24" fill="currentColor"><path d="m9 6 6 6-6 6" /></svg>
                </button>
              );
            })}
            {slips.length === 0 && (
              <p className="px-5 py-12 text-center text-sm text-slate-400">No pending slips in queue.</p>
            )}
          </div>
        </section>

        {/* Detail panel */}
        <section className="space-y-4">
          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <button
              disabled={!active || working}
              onClick={() => decide('Flagged')}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Flag for Review
            </button>
            <button
              disabled={!active || working}
              onClick={() => decide('Rejected')}
              className="rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
            >
              Reject
            </button>
            <button
              disabled={!active || working}
              onClick={() => decide('Verified')}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
              {working ? 'Processing…' : 'Approve & Next'}
            </button>
          </div>

          {active ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
              {/* Slip image + meta */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 overflow-hidden">
                    {active.receiptImageUrl ? (
                      <img src={active.receiptImageUrl} alt="Bank slip" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-sm text-slate-400">No bank slip provided</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase text-slate-400">Bank</div>
                    <div className="mt-1 text-sm font-bold text-slate-900">{active.bankName || '—'}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase text-slate-400">Slip Ref</div>
                    <div className="mt-1 truncate text-sm font-bold text-slate-900">{active.transactionReference || '—'}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase text-slate-400">Month</div>
                    <div className="mt-1 text-sm font-bold text-slate-900">{active.fee?.month || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Student + reconciliation */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z" /></svg>
                    </span>
                    <div>
                      <div className="text-lg font-bold text-slate-900">{active.fee?.student?.user?.name || 'Student'}</div>
                      <div className="text-sm text-slate-400">ID: {active.fee?.student?.studentId || '—'}</div>
                    </div>
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-400">Grade</dt>
                      <dd className="mt-1 font-semibold text-slate-900">{active.fee?.student?.grade || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-400">Description</dt>
                      <dd className="mt-1 font-semibold text-slate-900">{active.fee?.description || 'Tuition'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-slate-900 bg-slate-900 p-5 text-white shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 7h20v10H2V7zm2 2v6h16V9H4z" /></svg>
                    Financial Reconciliation
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Balance Due</div>
                      <div className="text-2xl font-black">ETB {etb(active.fee?.amount ?? active.amount)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Slip Amount</div>
                      <div className="text-2xl font-black">ETB {etb(active.amount)}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold">
                    <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
                    {Number(active.amount) === Number(active.fee?.amount ?? active.amount)
                      ? 'Amount matches current ledger requirement.'
                      : 'Amount differs from ledger — review carefully.'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400 shadow-sm">
              Select a slip from the queue to review.
            </div>
          )}
        </section>
      </div>
    </CashierLayout>
  );
}
