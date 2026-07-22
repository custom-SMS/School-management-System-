import { useEffect, useState, useContext } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';

export default function StudentFees() {
  const { user } = useAuth();
  const isParent = user?.role === 'Parent';

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Payment form state
  const [payingFee, setPayingFee] = useState(null);
  const [bankName, setBankName] = useState('');
  const [txnRef, setTxnRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Receipt modal state
  const [viewingReceipt, setViewingReceipt] = useState(null);

  // Parents need to pick a child first.
  useEffect(() => {
    if (!isParent) return;
    axios.get('/stats/parent/me').then((res) => {
      const kids = (res.data?.children || []).map((c) => ({
        id: c.profile?._id,
        name: c.profile?.user?.name || c.profile?.studentId,
      }));
      setChildren(kids);
      if (kids.length > 0) setSelectedChildId(kids[0].id);
    }).catch((err) => console.error(err));
  }, [isParent]);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const url = isParent
        ? `/fees/my?childStudentId=${selectedChildId}`
        : '/fees/my';
      const res = await axios.get(url);
      setFees(res.data || []);
    } catch (err) {
      console.error(err);
      setFees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isParent && !selectedChildId) return;
    fetchFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isParent, selectedChildId]);

  const openPayment = (fee) => {
    setPayingFee(fee);
    setBankName('');
    setTxnRef('');
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!payingFee) return;
    setSubmitting(true);
    try {
      await axios.post('/fees/bank-pay', {
        feeId: payingFee._id,
        amount: payingFee.amount,
        transactionReference: txnRef.trim(),
        bankName: bankName.trim(),
      });
      toast.success('Payment submitted for verification. The cashier will confirm it shortly.');
      setPayingFee(null);
      fetchFees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReceipt = async (paymentId) => {
    try {
      const res = await axios.get(`/fees/receipts/${paymentId}`);
      setViewingReceipt(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load receipt.');
    }
  };

  const handleDownloadReceipt = (paymentId) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = axios.defaults.baseURL || '';
      const url = `${baseUrl}/fees/receipts/${paymentId}/pdf?token=${token}`;
      
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.setAttribute('download', `receipt-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Downloading receipt...');
    } catch (err) {
      toast.error(`Failed to initiate download: ${err.message}`);
    }
  };

  const statusBadge = (status) => {
    const map = {
      Paid: 'bg-emerald-100 text-emerald-700',
      'Pending Verification': 'bg-amber-100 text-amber-700',
      Rejected: 'bg-rose-100 text-rose-700',
      Unpaid: 'bg-slate-100 text-slate-600',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10';
  const totalOutstanding = fees.filter((f) => !f.paid && f.status !== 'Pending Verification').reduce((sum, f) => sum + Number(f.amount || 0), 0);

  return (
    <div className="min-h-screen bg-transparent pb-10">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-4xl border border-white/50 bg-white/75 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-600">Finance</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">My Fees</h1>
          <p className="mt-2 text-sm text-slate-500">Review your tuition invoices and submit bank payments for verification.</p>
        </div>

        {isParent && (
          <div className="mb-6 rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Select Child</label>
            <select className={`${inputClass} max-w-md`} value={selectedChildId} onChange={(e) => setSelectedChildId(e.target.value)}>
              {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              {children.length === 0 && <option value="">No linked children</option>}
            </select>
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/60 bg-white px-6 py-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Total Outstanding</div>
            <div className="mt-1 text-3xl font-black text-rose-600">ETB {totalOutstanding}</div>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white px-6 py-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Total Invoices</div>
            <div className="mt-1 text-3xl font-black text-slate-900">{fees.length}</div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Invoices</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-150 w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
                ) : fees.map((f) => (
                  <tr key={f._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{f.description}</td>
                    <td className="px-4 py-3 text-slate-600">{f.month}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">ETB {f.amount}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(f.status)}`}>{f.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      {f.paid && f.payments?.[0]?.id ? (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleViewReceipt(f.payments[0].id)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                            View Receipt
                          </button>
                          <button onClick={() => handleDownloadReceipt(f.payments[0].id)} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                            Download
                          </button>
                        </div>
                      ) : !f.paid && f.status !== 'Pending Verification' ? (
                        <button onClick={() => openPayment(f)} className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                          Pay via Bank
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && fees.length === 0 && (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No invoices yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment modal */}
      {payingFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Submit Bank Payment</h3>
            <p className="mt-1 text-sm text-slate-500">{payingFee.description} • {payingFee.month} • <span className="font-semibold text-slate-700">ETB {payingFee.amount}</span></p>
            <form onSubmit={handleSubmitPayment} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Bank Name</label>
                <input required className={inputClass} placeholder="e.g. Commercial Bank of Ethiopia" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Transaction Reference</label>
                <input required className={inputClass} placeholder="e.g. FT1234567890" value={txnRef} onChange={(e) => setTxnRef(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setPayingFee(null)} className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-2xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {submitting ? 'Submitting…' : 'Submit Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/60 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Payment Receipt</h3>
              <button onClick={() => setViewingReceipt(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Receipt Number:</span>
                <span className="text-sm font-semibold text-slate-900">{viewingReceipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Student:</span>
                <span className="text-sm font-semibold text-slate-900">{viewingReceipt.payment?.fee?.student?.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Amount:</span>
                <span className="text-sm font-semibold text-slate-900">ETB {viewingReceipt.payment?.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Payment Method:</span>
                <span className="text-sm font-semibold text-slate-900">{viewingReceipt.payment?.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Date:</span>
                <span className="text-sm font-semibold text-slate-900">{new Date(viewingReceipt.payment?.paymentDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Processed By:</span>
                <span className="text-sm font-semibold text-slate-900">{viewingReceipt.issuedBy?.name}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => handleDownloadReceipt(viewingReceipt.paymentId)} className="flex-1 rounded-2xl bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700">
                Download PDF
              </button>
              <button onClick={() => setViewingReceipt(null)} className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
