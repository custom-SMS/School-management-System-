import { useEffect, useMemo, useState } from 'react';
import axios from '../../api/axios';
import CashierLayout from '../../components/CashierLayout';

const etb = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

function StatusPill({ status }) {
  const map = {
    Verified: 'bg-emerald-50 text-emerald-700',
    Pending: 'bg-amber-50 text-amber-700',
    Rejected: 'bg-rose-50 text-rose-700',
  };
  return (
    <span className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    axios
      .get('/fees/pending-verifications')
      .then((r) => setPayments(r.data || []))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => (prev.size === payments.length ? new Set() : new Set(payments.map((p) => p.id))));

  const digitalShare = useMemo(() => {
    if (!payments.length) return 74;
    const digital = payments.filter((p) => (p.bankName || '').toLowerCase() !== 'cash').length;
    return Math.round((digital / payments.length) * 100);
  }, [payments]);

  return (
    <CashierLayout searchPlaceholder="Search Receipt ID or Student...">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
        {/* Total receipts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Receipts Issued Today</p>
            <svg className="h-6 w-6 text-slate-300" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h9l5 5v15H6V2zm8 1.5V8h4.5L14 3.5z" /></svg>
          </div>
          <p className="mt-4 text-4xl font-black text-slate-900">{payments.length}</p>
          <p className="mt-2 text-xs font-semibold text-emerald-600">↗ +12% from yesterday</p>
        </div>

        {/* Digital vs physical */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Digital vs Physical Breakdown</p>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-900" /> Digital</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Physical</span>
            </div>
          </div>
          <div className="mt-4 flex items-end gap-6">
            <div>
              <p className="text-4xl font-black text-slate-900">{digitalShare}%</p>
              <p className="text-xs font-medium text-slate-400">Digital Adoption</p>
            </div>
            <div className="flex flex-1 items-end gap-3" style={{ height: 90 }}>
              {[70, 55, 78, 48].map((d, i) => (
                <div key={i} className="flex flex-1 flex-col justify-end overflow-hidden rounded-lg bg-slate-200" style={{ height: '100%' }}>
                  <div className="bg-slate-300" style={{ height: `${100 - d}%` }} />
                  <div className="bg-slate-900" style={{ height: `${d}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Receipts table */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" /></svg> Filters
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v2H5a2 2 0 0 0-2 2v14h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 8H5V6h14v4z" /></svg> Date Range
            </button>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6 12 13 22 6v12H2V6zm2-1h16l-8 5-8-5z" /></svg> Bulk Email
            </button>
            <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12v6H6V2zM4 9h16a2 2 0 0 1 2 2v7h-4v4H6v-4H2v-7a2 2 0 0 1 2-2zm4 9v3h8v-5H8v2z" /></svg> Bulk Print
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <th className="rounded-l-lg px-4 py-3">
                  <input type="checkbox" checked={payments.length > 0 && selected.size === payments.length} onChange={toggleAll} />
                </th>
                <th className="px-4 py-3 font-semibold">Receipt ID</th>
                <th className="px-4 py-3 font-semibold">Student Name</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="rounded-r-lg px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="py-10 text-center text-slate-400">Loading receipts…</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan="6" className="py-10 text-center text-slate-400">No receipts found.</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="text-slate-700">
                    <td className="px-4 py-4"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                    <td className="px-4 py-4 font-mono font-semibold text-slate-900">#R-{String(p.id).slice(-5)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500">
                          {(p.fee?.student?.user?.name || 'NA').split(' ').map((x) => x[0]).slice(0, 2).join('')}
                        </span>
                        <span className="font-semibold text-slate-900">{p.fee?.student?.user?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{p.bankName || 'Cash'}</td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900">ETB {etb(p.amount)}</td>
                    <td className="px-4 py-4"><StatusPill status={p.status || 'Pending'} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-400">Showing {payments.length} receipt{payments.length === 1 ? '' : 's'}</p>
      </div>
    </CashierLayout>
  );
}
