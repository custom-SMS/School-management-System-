import { useState, useEffect } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';

export default function Bursar() {
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

  const months = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'];

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

  return (
    <div className="min-h-screen bg-transparent pb-10">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-4xl border border-white/50 bg-white/75 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-600">Finance</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Bursar (Fee Management)</h1>
          <p className="mt-2 text-sm text-slate-500">Record payments and monitor monthly defaulters.</p>
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
                <input type="number" min="0" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"/>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Target Month</label>
                <select value={month} onChange={e => setMonth(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10">
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                <input type="text" required value={desc} onChange={e => setDesc(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"/>
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
      </div>
    </div>
  );
}