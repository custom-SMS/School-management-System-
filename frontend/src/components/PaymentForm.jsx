import { useEffect, useMemo, useState } from 'react';

const etb = (n) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

// Common Ethiopian banks / transfer channels for the slip dropdown.
const BANKS = [
  'Commercial Bank of Ethiopia (CBE)',
  'Awash Bank',
  'Dashen Bank',
  'Bank of Abyssinia',
  'Wegagen Bank',
  'Hibret (United) Bank',
  'Nib International Bank',
  'Zemen Bank',
  'Cooperative Bank of Oromia',
  'Abay Bank',
  'CBE Birr',
  'Telebirr',
];

/**
 * Presentational bank-payment form shared by the student and parent payment pages.
 *
 * Props:
 *  - studentName, studentId: identity shown in the summary header
 *  - unpaidFees: array of unpaid fee records ({ _id, amount, description, month, dueDate })
 *  - initialFeeId: fee to pre-select (e.g. the one the user clicked "Pay" on)
 *  - submitting: disables the form while the request is in flight
 *  - onSubmit({ feeId, amount, transactionReference, bankName }): handles the POST
 *  - onCancel(): navigates back without submitting
 */
export default function PaymentForm({
  studentName,
  studentId,
  unpaidFees = [],
  initialFeeId,
  submitting = false,
  onSubmit,
  onCancel,
}) {
  const [feeId, setFeeId] = useState('');
  const [bankName, setBankName] = useState('');
  const [otherBank, setOtherBank] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState({});
  const [amountTouched, setAmountTouched] = useState(false);

  // unpaidFees can arrive after mount (parent data loads async), so pick a
  // sensible default once it's available and whenever the current pick falls away.
  useEffect(() => {
    if (!unpaidFees.length) return;
    const stillValid = unpaidFees.some((f) => f._id === feeId);
    if (stillValid) return;
    const preferred = unpaidFees.find((f) => f._id === initialFeeId);
    setFeeId(preferred?._id || unpaidFees[0]._id);
  }, [unpaidFees, initialFeeId, feeId]);

  const selectedFee = useMemo(
    () => unpaidFees.find((f) => f._id === feeId) || null,
    [unpaidFees, feeId],
  );

  // Keep the amount in sync with the selected fee until the user edits it.
  const effectiveAmount = amountTouched ? amount : selectedFee ? String(selectedFee.amount ?? '') : '';
  const resolvedBank = bankName === 'Other' ? otherBank.trim() : bankName;

  const validate = () => {
    const next = {};
    if (!feeId) next.feeId = 'Select a fee to pay.';
    if (!resolvedBank) next.bankName = 'Choose the bank you paid from.';
    if (!transactionReference.trim()) next.transactionReference = 'Enter the transaction / slip reference.';
    const amt = Number(effectiveAmount);
    if (!amt || amt <= 0) next.amount = 'Enter a valid amount greater than zero.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    onSubmit({
      feeId,
      amount: Number(effectiveAmount),
      transactionReference: transactionReference.trim(),
      bankName: resolvedBank,
    });
  };

  const fieldClass = (key) =>
    `w-full rounded-xl border px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900 ${
      errors[key] ? 'border-rose-300 bg-rose-50' : 'border-slate-300 bg-white'
    }`;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      {/* Summary header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Paying for</div>
        <div className="mt-1 text-xl font-black text-slate-900">{studentName || 'Student'}</div>
        <div className="text-sm text-slate-400">ID: {studentId || '—'}</div>
      </div>

      {unpaidFees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-400">
          There are no unpaid fees to pay.
        </div>
      ) : (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Fee picker */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Fee</label>
            <select
              value={feeId}
              onChange={(e) => {
                setFeeId(e.target.value);
                setAmountTouched(false);
              }}
              disabled={submitting}
              className={fieldClass('feeId')}
            >
              {unpaidFees.map((f) => (
                <option key={f._id} value={f._id}>
                  {(f.description || 'Tuition')}
                  {f.month ? ` · ${f.month}` : ''} — {etb(f.amount)} ETB
                </option>
              ))}
            </select>
            {selectedFee?.dueDate && (
              <p className="mt-1.5 text-xs text-slate-400">
                Due {new Date(selectedFee.dueDate).toLocaleDateString()}
              </p>
            )}
            {errors.feeId && <p className="mt-1.5 text-xs font-semibold text-rose-600">{errors.feeId}</p>}
          </div>

          {/* Bank */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Bank / Channel</label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              disabled={submitting}
              className={fieldClass('bankName')}
            >
              <option value="">Select a bank…</option>
              {BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="Other">Other…</option>
            </select>
            {bankName === 'Other' && (
              <input
                type="text"
                value={otherBank}
                onChange={(e) => setOtherBank(e.target.value)}
                disabled={submitting}
                placeholder="Enter bank name"
                className={`mt-2 ${fieldClass('bankName')}`}
              />
            )}
            {errors.bankName && <p className="mt-1.5 text-xs font-semibold text-rose-600">{errors.bankName}</p>}
          </div>

          {/* Transaction reference */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Transaction / Slip Reference</label>
            <input
              type="text"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              disabled={submitting}
              placeholder="e.g. FT22ABC123456"
              className={fieldClass('transactionReference')}
            />
            {errors.transactionReference && (
              <p className="mt-1.5 text-xs font-semibold text-rose-600">{errors.transactionReference}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Amount (ETB)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={effectiveAmount}
              onChange={(e) => {
                setAmountTouched(true);
                setAmount(e.target.value);
              }}
              disabled={submitting}
              className={fieldClass('amount')}
            />
            {errors.amount && <p className="mt-1.5 text-xs font-semibold text-rose-600">{errors.amount}</p>}
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 7h2v2h-2V7zm0 4h2v6h-2v-6zm1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
            </svg>
            Once submitted, this payment will be held as <span className="font-semibold">Pending</span> until the cashier
            verifies the slip.
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || unpaidFees.length === 0}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-40"
        >
          {submitting ? 'Submitting…' : 'Submit for Verification'}
        </button>
      </div>
    </form>
  );
}
