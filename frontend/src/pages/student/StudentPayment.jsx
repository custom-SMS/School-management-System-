import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from '../../api/axios';
import StudentLayout from '../../components/StudentLayout';
import PaymentForm from '../../components/PaymentForm';

export default function StudentPayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialFeeId = location.state?.feeId;

  const [fees, setFees] = useState([]);
  const [profile, setProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios.get('/fees/my').then((r) => setFees(r.data || [])).catch(() => setFees([]));
    axios.get('/stats/student/me').then((r) => setProfile(r.data)).catch(() => {});
  }, []);

  const unpaidFees = fees.filter((f) => !f.paid && f.status !== 'Pending Verification');

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      await axios.post('/fees/bank-pay', payload);
      toast.success('Payment submitted for verification.');
      navigate('/student/finance');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentLayout searchPlaceholder="Search transactions...">
      <div className="mb-6">
        <button
          onClick={() => navigate('/student/finance')}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15 6l-6 6 6 6 1.4-1.4L11.8 12l4.6-4.6z" /></svg>
          Back to Fee Status
        </button>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Make a Payment</h1>
        <p className="text-sm text-slate-500">Enter your bank transfer details for cashier verification.</p>
      </div>

      <PaymentForm
        studentName={profile?.profile?.user?.name || 'Student'}
        studentId={profile?.studentId}
        unpaidFees={unpaidFees}
        initialFeeId={initialFeeId}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/student/finance')}
      />
    </StudentLayout>
  );
}
