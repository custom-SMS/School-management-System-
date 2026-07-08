import { useState, useEffect, useContext } from 'react';
import { showConfirmDialog } from '../utils/sweetAlert';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { ETHIOPIAN_MONTHS } from '../constants/school';

export default function Bursar() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' or 'verifications'

  const [students, setStudents] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [gradeFees, setGradeFees] = useState([]);
  const [classes, setClasses] = useState([]);
  const [paidStudents, setPaidStudents] = useState([]);
  const [paidClassId, setPaidClassId] = useState('');
  const [paidMonth, setPaidMonth] = useState('Meskerem');
  const [paidLoading, setPaidLoading] = useState(false);
  const [paidSummary, setPaidSummary] = useState(null);

  const [selectedStudent, setSelectedStudent] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState('Meskerem');
  const [desc, setDesc] = useState('Monthly Tuition');
  const [targetMonth, setTargetMonth] = useState('Meskerem');

  // Verification Queue States
  const [pendingPayments, setPendingPayments] = useState([]);
  const [verifyingId, setVerifyingId] = useState('');
  const [receiptData, setReceiptData] = useState(null);

  // Invoice generation
  const [generateMonth, setGenerateMonth] = useState('Meskerem');
  const [generating, setGenerating] = useState(false);

  const months = ETHIOPIAN_MONTHS;

  // Load students immediately for the dropdown
  useEffect(() => {
    axios.get('/students').then(res => setStudents(res.data)).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    axios.get('/students/grade-fee').then(res => setGradeFees(res.data || [])).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await axios.get('/assignments');
        const availableClasses = Array.from(
          new Map(
            (res.data || [])
              .map((assignment) => assignment.class)
              .filter(Boolean)
              .map((klass) => [klass._id, klass]),
          ).values(),
        );
        setClasses(availableClasses);
        if (availableClasses.length > 0) {
          setPaidClassId((current) => current || availableClasses[0]._id);
        }
      } catch (error) {
        console.error('Failed to fetch classes', error);
      }
    };

    fetchClasses();
  }, []);

  // Fetch defaulters automatically whenever the target month changes
  useEffect(() => {
    axios.get(`/fees/defaulters/${targetMonth}`)
      .then(res => setDefaulters(res.data))
      .catch(err => console.error(err));
  }, [targetMonth]);

  // Fetch pending payments for Cashier Ledger
  const fetchPendingPayments = async () => {
    try {
      const res = await axios.get('/fees/pending-verifications');
      setPendingPayments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch pending payments', err);
    }
  };

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  useEffect(() => {
    const fetchPaidStudents = async () => {
      if (!paidClassId || !paidMonth) return;

      setPaidLoading(true);
      try {
        const res = await axios.get(`/fees/paid/${paidMonth}/${paidClassId}`);
        setPaidStudents(res.data.paidStudents || []);
        setPaidSummary(res.data);
      } catch (error) {
        console.error('Failed to fetch paid students', error);
        setPaidStudents([]);
        setPaidSummary(null);
      } finally {
        setPaidLoading(false);
      }
    };

    fetchPaidStudents();
  }, [paidClassId, paidMonth]);

  const normalizeClassLabel = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const extractClassNumber = (value) => String(value || '').match(/\d+/)?.[0] || '';

  const resolveStudentFeeAmount = (student) => {
    if (!student) return '';

    const studentGrade = normalizeClassLabel(student.grade);
    const studentClassNumber = extractClassNumber(student.grade);

    const matchedFee = gradeFees.find((fee) => {
      const feeGrade = normalizeClassLabel(fee.grade);
      const feeClassNumber = extractClassNumber(fee.grade);

      return (
        feeGrade === studentGrade ||
        (feeClassNumber && feeClassNumber === studentClassNumber) ||
        feeGrade === normalizeClassLabel(`grade ${studentClassNumber}`) ||
        feeGrade === normalizeClassLabel(`class ${studentClassNumber}`)
      );
    });

    return matchedFee ? String(matchedFee.amount) : '';
  };

  const handleTestAutofill = () => {
    const firstStudent = students[0];
    const firstClass = classes[0];
    const defaultMonth = months[0];
    const resolvedAmount = firstStudent ? resolveStudentFeeAmount(firstStudent) : '';

    if (firstStudent) {
      setSelectedStudent(firstStudent._id);
    }

    if (firstClass) {
      setPaidClassId(firstClass._id);
    }

    setMonth(defaultMonth);
    setPaidMonth(defaultMonth);
    setTargetMonth(defaultMonth);
    setDesc('Monthly Tuition');
    setAmount(resolvedAmount || (gradeFees[0]?.amount ? String(gradeFees[0].amount) : '500'));
  };

  useEffect(() => {
    const selected = students.find((student) => student._id === selectedStudent);

    if (!selected) {
      if (!selectedStudent) setAmount('');
      return;
    }

    const resolvedAmount = resolveStudentFeeAmount(selected);
    setAmount(resolvedAmount);
  }, [selectedStudent, students, gradeFees]);

  const handleGenerateInvoices = async () => {
    const { isConfirmed } = await showConfirmDialog({
      title: 'Generate invoices?',
      text: `Generate unpaid tuition invoices for ${generateMonth} for all students? Students without an existing invoice for this month will be billed based on their grade fee.`,
      confirmButtonText: 'Generate',
    });
    if (!isConfirmed) return;
    setGenerating(true);
    try {
      const res = await axios.post('/fees/generate', { month: generateMonth });
      toast.success(res.data?.message || 'Invoices generated.');
      if (generateMonth === targetMonth) {
        axios.get(`/fees/defaulters/${targetMonth}`).then((r) => setDefaulters(r.data)).catch(() => { });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate invoices.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        studentId: selectedStudent,
        amount: Number(amount),
        description: desc,
        month,
        dueDate: new Date().toISOString()
      };

      await axios.post('/fees', payload);
      toast.success(`Payment of ETB ${amount} for ${month} recorded successfully!`);

      // Clear form
      setAmount(''); setDesc('Monthly Tuition');

      // Auto-refresh defaulters list in case the newly paid student was previously on it
      if (month === targetMonth) {
        axios.get(`/fees/defaulters/${targetMonth}`).then(res => setDefaulters(res.data));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error recording payment.');
    }
  };

  const handleVerifyPayment = async (paymentId, status) => {
    setVerifyingId(paymentId);
    try {
      const res = await axios.patch(`/fees/verify/${paymentId}`, { status });
      toast.success(`Payment transaction has been ${status.toLowerCase()}!`);
      fetchPendingPayments();

      if (status === 'Verified') {
        // Retrieve generated receipt info
        const receiptRes = await axios.get(`/fees/receipts/${paymentId}`);
        setReceiptData(receiptRes.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed.');
    } finally {
      setVerifyingId('');
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-10">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-4xl border border-white/50 bg-white/75 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">Finance</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Bursar (Fee Management)</h1>
          <p className="mt-2 text-sm text-slate-500">Record payments and verify transaction references.</p>
        </div>

        {/* Tab Selector */}
        <div className="mb-8 flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition duration-200 ${activeTab === 'payments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-950'}`}
          >
            Direct Payments & Defaulters
          </button>
          <button
            onClick={() => {
              setActiveTab('verifications');
              fetchPendingPayments();
            }}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition duration-200 ${activeTab === 'verifications' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-950'}`}
          >
            Bank Verifications Queue ({pendingPayments.length})
          </button>
        </div>

        {activeTab === 'payments' ? (
          <>
            <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50/60 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Invoicing</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Generate Monthly Invoices</h2>
                  <p className="mt-1 text-sm text-slate-500">Creates unpaid tuition invoices so students/parents can pay online and appear in the defaulters list.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <select value={generateMonth} onChange={(e) => setGenerateMonth(e.target.value)} className="rounded-2xl border border-amber-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10">
                    {months.map((m) => <option key={`gen-${m}`} value={m}>{m}</option>)}
                  </select>
                  <button onClick={handleGenerateInvoices} disabled={generating} className="rounded-2xl bg-amber-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 disabled:opacity-50">
                    {generating ? 'Generating…' : 'Generate Invoices'}
                  </button>
                </div>
              </div>
            </div>
            <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
              <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                <div className="mb-6 border-b border-slate-200 pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Payments</p>
                      <h2 className="mt-2 text-2xl font-bold text-slate-900">Record Payment</h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestAutofill}
                      className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Auto Fill Test Data
                    </button>
                  </div>
                </div>
                <form className="space-y-4" onSubmit={handleRecordPayment}>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Select Student</label>
                    <select required value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10">
                      <option value="">-- Choose Student --</option>
                      {students.map(s => (
                        <option key={s._id} value={s._id}>{s.user?.name} ({s.studentId}) - {s.grade}</option>
                      ))}
                    </select>
                    {selectedStudent && amount && (
                      <p className="mt-2 text-sm text-slate-500">Auto-filled from the selected student’s class fee.</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Amount (ETB)</label>
                    <input type="number" min="0" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Target Month</label>
                    <select value={month} onChange={e => setMonth(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10">
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                    <input type="text" required value={desc} onChange={e => setDesc(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" />
                  </div>

                  <button type="submit" className="w-full rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5">
                    Confirm Payment
                  </button>
                </form>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                  <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Paid records</p>
                      <h2 className="mt-2 text-2xl font-bold text-slate-900">Paid Students by Class</h2>
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                        <label className="text-sm font-semibold text-slate-600">Class:</label>
                        <select value={paidClassId} onChange={(e) => setPaidClassId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 sm:w-auto">
                          <option value="">Select class</option>
                          {classes.map((klass) => (
                            <option key={klass._id} value={klass._id}>
                              {klass.name}{klass.subject ? ` - ${klass.subject}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                        <label className="text-sm font-semibold text-slate-600">Month:</label>
                        <select value={paidMonth} onChange={(e) => setPaidMonth(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 sm:w-auto">
                          {months.map((m) => <option key={`paid-${m}`} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {paidSummary && (
                    <div className="mb-4 flex flex-wrap gap-3 text-sm">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                        {paidSummary.paidCount}/{paidSummary.totalStudents} paid
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                        {paidSummary.classInfo?.name}{paidSummary.classInfo?.subject ? ` • ${paidSummary.classInfo.subject}` : ''}
                      </span>
                    </div>
                  )}

                  <div className="space-y-3 sm:hidden">
                    {paidLoading ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-500">Loading paid students…</div>
                    ) : paidStudents.length > 0 ? (
                      paidStudents.map((std) => (
                        <div key={std._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Student ID</div>
                              <div className="mt-1 font-semibold text-emerald-700">{std.studentId}</div>
                            </div>
                            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                              Paid
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 text-sm text-slate-700">
                            <div><span className="font-semibold text-slate-900">Name:</span> {std.user?.name}</div>
                            <div><span className="font-semibold text-slate-900">Grade:</span> {std.grade}</div>
                            <div><span className="font-semibold text-slate-900">Amount:</span> ETB {std.amount}</div>
                            <div><span className="font-semibold text-slate-900">Paid On:</span> {std.paymentDate ? new Date(std.paymentDate).toLocaleDateString() : '—'}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-500">No paid students found for this class and month.</div>
                    )}
                  </div>

                  <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 sm:block">
                    <table className="min-w-190 w-full border-collapse text-left text-sm sm:text-base">
                      <thead>
                        <tr className="bg-emerald-50 text-xs uppercase tracking-[0.18em] text-emerald-700">
                          <th className="px-4 py-4">Student ID</th>
                          <th className="px-4 py-4">Name</th>
                          <th className="px-4 py-4">Grade</th>
                          <th className="px-4 py-4">Amount</th>
                          <th className="px-4 py-4">Paid On</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {paidLoading ? (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-slate-500">Loading paid students…</td>
                          </tr>
                        ) : paidStudents.map((std) => (
                          <tr key={std._id} className="transition hover:bg-slate-50">
                            <td className="px-4 py-4 font-semibold text-emerald-700">{std.studentId}</td>
                            <td className="px-4 py-4 text-slate-700">{std.user?.name}</td>
                            <td className="px-4 py-4 text-slate-600">{std.grade}</td>
                            <td className="px-4 py-4 font-semibold text-slate-900">ETB {std.amount}</td>
                            <td className="px-4 py-4 text-slate-600">
                              {std.paymentDate ? new Date(std.paymentDate).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                        {!paidLoading && paidStudents.length === 0 && (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                              No paid students found for this class and month.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                  <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-600">Outstanding</p>
                      <h2 className="mt-2 text-2xl font-bold text-slate-900">Defaulters List</h2>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <label className="text-sm font-semibold text-slate-600">Filter by Month:</label>
                      <select value={targetMonth} onChange={e => setTargetMonth(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-rose-50 px-4 py-2 text-sm outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-500/10 sm:w-auto">
                        {months.map(m => <option key={`def-${m}`} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 sm:hidden">
                    {defaulters.length > 0 ? (
                      defaulters.map((std) => (
                        <div key={std._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Student ID</div>
                              <div className="mt-1 font-semibold text-rose-700">{std.studentId}</div>
                            </div>
                            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
                              Unpaid
                            </span>
                          </div>
                          <div className="mt-4 grid gap-3 text-sm text-slate-700">
                            <div><span className="font-semibold text-slate-900">Name:</span> {std.user?.name}</div>
                            <div><span className="font-semibold text-slate-900">Status:</span> UNPAID for {targetMonth}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center font-semibold text-emerald-700">✅ All registered students have paid for {targetMonth}.</div>
                    )}
                  </div>

                  <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 sm:block">
                    <table className="min-w-150 w-full border-collapse text-left text-sm sm:text-base">
                      <thead>
                        <tr className="bg-rose-50 text-xs uppercase tracking-[0.18em] text-rose-700">
                          <th className="px-4 py-4">Student ID</th>
                          <th className="px-4 py-4">Name</th>
                          <th className="px-4 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {defaulters.map(std => (
                          <tr key={std._id} className="transition hover:bg-slate-50">
                            <td className="px-4 py-4 font-semibold text-rose-700">{std.studentId}</td>
                            <td className="px-4 py-4 text-slate-700">{std.user?.name}</td>
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
                                UNPAID for {targetMonth}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {defaulters.length === 0 && (
                          <tr>
                            <td colSpan="3" className="px-4 py-8 text-center font-semibold text-emerald-700">
                              ✅ All registered students have paid for {targetMonth}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Bank Verifications (Cashier Ledger)</h2>
              <p className="text-slate-500 text-sm mb-6">Verify transaction references submitted online by students/parents to approve registrations and generate receipts.</p>

              {receiptData && (
                <div className="mb-8 rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 max-w-lg mx-auto relative overflow-hidden shadow-md print:border-none print:shadow-none print:bg-white print:p-0">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full translate-x-8 -translate-y-8 print:hidden" />
                  <div className="border-b border-dashed border-emerald-300 pb-4 mb-4 text-center">
                    <h3 className="text-xl font-bold text-emerald-800 uppercase tracking-wide">Official Receipt</h3>
                    <p className="text-sm font-semibold text-slate-500 mt-1">Receipt No: {receiptData.receiptNumber}</p>
                  </div>
                  <div className="space-y-3 text-sm text-slate-700">
                    <div className="flex justify-between"><span className="font-semibold">Student Name:</span> <span>{receiptData.payment?.fee?.student?.user?.name}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Amount Paid:</span> <span className="font-black text-emerald-700">ETB {receiptData.payment?.amount}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Bank Name:</span> <span>{receiptData.payment?.bankName}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Transaction Ref:</span> <span>{receiptData.payment?.transactionReference}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Description:</span> <span>{receiptData.payment?.fee?.description} ({receiptData.payment?.fee?.month})</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Issued By:</span> <span>{receiptData.issuedBy?.name}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Date Issued:</span> <span>{new Date(receiptData.createdAt).toLocaleString()}</span></div>
                  </div>
                  <div className="mt-6 flex justify-center gap-3 print:hidden">
                    <button
                      onClick={() => window.print()}
                      className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 shadow-md"
                    >
                      Print Receipt
                    </button>
                    <button
                      onClick={() => setReceiptData(null)}
                      className="rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-190 w-full border-collapse text-left text-sm sm:text-base">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-4 py-4">Student</th>
                      <th className="px-4 py-4">Bank</th>
                      <th className="px-4 py-4">Transaction Ref</th>
                      <th className="px-4 py-4">Amount</th>
                      <th className="px-4 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pendingPayments.map((p) => (
                      <tr key={p.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {p.fee?.student?.user?.name} <span className="text-xs text-slate-400 font-normal">({p.fee?.student?.studentId})</span>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{p.bankName}</td>
                        <td className="px-4 py-4 font-mono text-slate-600">{p.transactionReference}</td>
                        <td className="px-4 py-4 font-bold text-slate-900">ETB {p.amount}</td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              disabled={verifyingId === p.id}
                              onClick={() => handleVerifyPayment(p.id, 'Verified')}
                              className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Verify
                            </button>
                            <button
                              disabled={verifyingId === p.id}
                              onClick={() => handleVerifyPayment(p.id, 'Rejected')}
                              className="rounded-full bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pendingPayments.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                          No pending bank payment verifications in queue.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
