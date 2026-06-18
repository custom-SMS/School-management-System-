import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import ParentLayout from '../../components/ParentLayout';
import PaymentForm from '../../components/PaymentForm';
import { useParentChildren } from '../../hooks/useParentChildren';

export default function ParentPayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialFeeId = location.state?.feeId;

  const { children, childId, setChildId, selectedChild, loading } = useParentChildren();
  const [submitting, setSubmitting] = useState(false);

  const fees = selectedChild?.fees || [];
  const unpaidFees = fees.filter((f) => !f.paid);
  const name = selectedChild?.profile?.user?.name || 'Child';
  const selectedChildId = selectedChild?.profile?._id || selectedChild?.profile?.id;

  const handleSubmit = async (payload) => {
    if (!selectedChild) {
      toast.info('Select a child first.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post('/fees/bank-pay', { ...payload, childStudentId: selectedChildId });
      toast.success('Payment submitted for verification.');
      navigate('/parent/finance');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ParentLayout kids={children} childId={childId} onSelectChild={setChildId}>
      <div className="mb-6">
        <button
          onClick={() => navigate('/parent/finance')}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15 6l-6 6 6 6 1.4-1.4L11.8 12l4.6-4.6z" /></svg>
          Back to Fee Statement
        </button>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Make a Payment</h1>
        <p className="text-sm text-slate-500">Enter the bank transfer details for cashier verification.</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">Loading…</div>
      ) : !selectedChild ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">No children are linked to this account.</div>
      ) : (
        <PaymentForm
          studentName={name}
          studentId={selectedChild?.profile?.studentId}
          unpaidFees={unpaidFees}
          initialFeeId={initialFeeId}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/parent/finance')}
        />
      )}
    </ParentLayout>
  );
}
