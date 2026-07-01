import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import CashierLayout from '../../components/CashierLayout';

const etb = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

const MONTHS = ['All Months', 'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'];
const GRADE_OPTIONS = ['All Grades', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [paymentsPagination, setPaymentsPagination] = useState({ page: 1, totalPages: 1, totalItems: 0, limit: 10 });
  const [outstanding, setOutstanding] = useState([]);
  const [outstandingPagination, setOutstandingPagination] = useState({ page: 1, totalPages: 1, totalItems: 0, limit: 10 });
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [loadingOutstanding, setLoadingOutstanding] = useState(true);
  const [payingId, setPayingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLimit, setLedgerLimit] = useState(10);
  const [outstandingSearch, setOutstandingSearch] = useState('');
  const [outstandingMonth, setOutstandingMonth] = useState('');
  const [outstandingGrade, setOutstandingGrade] = useState('');
  const [outstandingPage, setOutstandingPage] = useState(1);
  const [outstandingLimit, setOutstandingLimit] = useState(10);

  const fetchLedger = async (page = ledgerPage) => {
    setLoadingLedger(true);
    try {
      const res = await axios.get('/fees/payments', {
        params: {
          ...(filterStatus ? { status: filterStatus } : {}),
          ...(month ? { month } : {}),
          ...(search.trim() ? { q: search.trim() } : {}),
          page,
          limit: ledgerLimit,
        },
      });

      setPayments(res.data?.items || []);
      setPaymentsPagination(res.data?.pagination || { page: 1, totalPages: 1, totalItems: 0, limit: ledgerLimit });
    } catch {
      setPayments([]);
      setPaymentsPagination({ page: 1, totalPages: 1, totalItems: 0, limit: ledgerLimit });
    } finally {
      setLoadingLedger(false);
    }
  };

  const fetchOutstanding = async (page = outstandingPage) => {
    setLoadingOutstanding(true);
    try {
      const res = await axios.get('/fees/outstanding', {
        params: {
          ...(outstandingMonth ? { month: outstandingMonth } : {}),
          ...(outstandingGrade ? { grade: outstandingGrade } : {}),
          ...(outstandingSearch.trim() ? { q: outstandingSearch.trim() } : {}),
          page,
          limit: outstandingLimit,
        },
      });

      setOutstanding(res.data?.items || []);
      setOutstandingPagination(res.data?.pagination || { page: 1, totalPages: 1, totalItems: 0, limit: outstandingLimit });
    } catch {
      setOutstanding([]);
      setOutstandingPagination({ page: 1, totalPages: 1, totalItems: 0, limit: outstandingLimit });
    } finally {
      setLoadingOutstanding(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const pendingRes = await axios.get('/fees/pending-verifications');
      setPendingCount((pendingRes.data || []).length);
    } catch {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    fetchLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, month, ledgerPage, ledgerLimit]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLedgerPage(1);
      fetchLedger();
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    fetchOutstanding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outstandingSearch, outstandingMonth, outstandingGrade, outstandingPage, outstandingLimit]);

  useEffect(() => {
    fetchPendingCount();
  }, []);

  const totalOutstanding = useMemo(
    () => outstanding.reduce((sum, f) => sum + Number(f.amount || 0), 0),
    [outstanding],
  );

  const totalLedgerValue = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments],
  );

  const paidCount = useMemo(
    () => payments.filter((p) => p.status === 'Verified').length,
    [payments],
  );

  const pendingPayments = useMemo(
    () => payments.filter((p) => p.status === 'Pending').length,
    [payments],
  );

  const statusClass = (status) => {
    const map = {
      Pending: 'bg-amber-100 text-amber-700',
      Verified: 'bg-emerald-100 text-emerald-700',
      Rejected: 'bg-rose-100 text-rose-700',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  const recordCash = async (fee) => {
    setPayingId(fee.id);
    try {
      await axios.patch(`/fees/${fee.id}/pay`);
      toast.success(`Cash payment recorded for ${fee.student?.user?.name || 'student'}. Receipt issued.`);
      await Promise.all([fetchLedger(), fetchOutstanding(), fetchPendingCount()]);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to record payment.');
    } finally {
      setPayingId(null);
    }
  };

  const paginationButtons = (page, totalPages, onPrev, onNext) => (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <CashierLayout searchPlaceholder="Search student or invoice...">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Outstanding Invoices</p>
          <p className="mt-2 text-4xl font-black text-slate-900">{outstanding.length}</p>
          <p className="mt-2 text-xs font-medium text-slate-400">Awaiting collection</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Outstanding</p>
          <p className="mt-2 text-4xl font-black text-slate-900">ETB {etb(totalOutstanding)}</p>
          <p className="mt-2 text-xs font-medium text-slate-400">Across all unpaid invoices</p>
        </div>
        <Link to="/finance/verification" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bank Slips to Verify</p>
          <p className="mt-2 text-4xl font-black text-slate-900">{pendingCount}</p>
          <p className="mt-2 text-xs font-semibold text-slate-600">Go to verification →</p>
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ledger Value</p>
          <p className="mt-2 text-4xl font-black text-slate-900">ETB {etb(totalLedgerValue)}</p>
          <p className="mt-2 text-xs font-medium text-slate-400">All fetched payments</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Payments Ledger</h2>
            <p className="text-sm text-slate-500">Real payment records with verification status and receipt tracking.</p>
          </div>
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-155">
            <select
              value={filterStatus}
              onChange={(e) => {
                setLedgerPage(1);
                setFilterStatus(e.target.value);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Verified">Verified</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select
              value={month}
              onChange={(e) => {
                setLedgerPage(1);
                setMonth(e.target.value);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m === 'All Months' ? '' : m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => {
                setLedgerPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search student, reference, or bank"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verified Payments</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{paidCount}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pending Payments</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{pendingPayments}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Loaded Records</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{payments.length}</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <th className="rounded-l-lg px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 font-semibold">Bank</th>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="rounded-r-lg px-4 py-3 text-right font-semibold">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingLedger ? (
                <tr><td colSpan="7" className="py-10 text-center text-slate-400">Loading payment ledger…</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan="7" className="py-10 text-center text-slate-400">No payments found for the current filters.</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="text-slate-700">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{p.fee?.student?.user?.name || '—'}</div>
                      <div className="text-xs text-slate-400">{p.fee?.student?.studentId || '—'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{p.fee?.description || 'Tuition'}</div>
                      <div className="text-xs text-slate-400">{p.fee?.month || '—'}</div>
                    </td>
                    <td className="px-4 py-4">{p.bankName || '—'}</td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-600">{p.transactionReference || '—'}</td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900">ETB {etb(p.amount)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(p.status)}`}>{p.status}</span>
                        <span className="text-xs text-slate-400">
                          {p.verifiedBy?.name ? `By ${p.verifiedBy.name}` : 'Not yet verified'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {p.receipt?.receiptNumber ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          {p.receipt.receiptNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">No receipt</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {paginationButtons(
          paymentsPagination.page,
          paymentsPagination.totalPages,
          () => setLedgerPage((p) => Math.max(1, p - 1)),
          () => setLedgerPage((p) => Math.min(paymentsPagination.totalPages, p + 1)),
        )}
      </div>

      {/* Outstanding invoices — collect cash */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Collect Cash at Desk</h2>
            <p className="text-sm text-slate-500">Recording a cash payment marks the invoice paid and issues a receipt.</p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:min-w-190 xl:grid-cols-4">
            <select
              value={outstandingMonth}
              onChange={(e) => {
                setOutstandingPage(1);
                setOutstandingMonth(e.target.value);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m === 'All Months' ? '' : m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={outstandingGrade}
              onChange={(e) => {
                setOutstandingPage(1);
                setOutstandingGrade(e.target.value);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g === 'All Grades' ? '' : g}>
                  {g}
                </option>
              ))}
            </select>
            <input
              value={outstandingSearch}
              onChange={(e) => {
                setOutstandingPage(1);
                setOutstandingSearch(e.target.value);
              }}
              placeholder="Search student or invoice"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            />
            <select
              value={outstandingLimit}
              onChange={(e) => {
                setOutstandingLimit(Number(e.target.value));
                setOutstandingPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <th className="rounded-l-lg px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Grade</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Month</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="rounded-r-lg px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingOutstanding ? (
                <tr><td colSpan="6" className="py-10 text-center text-slate-400">Loading invoices…</td></tr>
              ) : outstanding.length === 0 ? (
                <tr><td colSpan="6" className="py-10 text-center font-semibold text-emerald-600">✅ No outstanding invoices.</td></tr>
              ) : (
                outstanding.map((f) => (
                  <tr key={f.id} className="text-slate-700">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500">
                          {(f.student?.user?.name || 'NA').split(' ').map((x) => x[0]).slice(0, 2).join('')}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900">{f.student?.user?.name || '—'}</div>
                          <div className="text-xs text-slate-400">{f.student?.studentId || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{f.student?.grade || '—'}</td>
                    <td className="px-4 py-4">{f.description || 'Tuition'}</td>
                    <td className="px-4 py-4">{f.month || '—'}</td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900">ETB {etb(f.amount)}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => recordCash(f)}
                        disabled={payingId === f.id}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        {payingId === f.id ? 'Recording…' : 'Record Cash Payment'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {paginationButtons(
          outstandingPagination.page,
          outstandingPagination.totalPages,
          () => setOutstandingPage((p) => Math.max(1, p - 1)),
          () => setOutstandingPage((p) => Math.min(outstandingPagination.totalPages, p + 1)),
        )}
        <p className="mt-4 text-xs text-slate-400">
          Showing {outstanding.length} outstanding invoice{outstanding.length === 1 ? '' : 's'} on this page and {payments.length} live payment record{payments.length === 1 ? '' : 's'} on this page
        </p>
      </div>
    </CashierLayout>
  );
}
