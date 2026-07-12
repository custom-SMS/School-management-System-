import { useEffect, useMemo, useState, useRef } from 'react';
import axios from '../api/axios';

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
 *  - onSubmit({ feeId, amount, transactionReference, bankName, receiptImageUrl }): handles the POST
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

  // Receipt image upload state
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [receiptImageUrl, setReceiptImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

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

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Only JPG, PNG or WEBP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB.');
      return;
    }

    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    setUploadError('');
    setReceiptImageUrl('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReceiptImageUrl(res.data.url);
    } catch {
      setUploadError('Failed to upload receipt. Please try again.');
      setReceiptFile(null);
      setReceiptPreview(null);
    } finally {
      setUploading(false);
    }
  };

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
    if (submitting || uploading) return;
    if (!validate()) return;
    onSubmit({
      feeId,
      amount: Number(effectiveAmount),
      transactionReference: transactionReference.trim(),
      bankName: resolvedBank,
      receiptImageUrl: receiptImageUrl || undefined,
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

          {/* Receipt image upload */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">
              Upload Receipt / Payment Slip
              <span className="ml-1.5 text-xs font-normal text-slate-400">(optional — JPG, PNG, WEBP · max 5MB)</span>
            </label>

            <div
              onClick={() => !submitting && !uploading && fileInputRef.current?.click()}
              className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition
                ${receiptPreview ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-white'}
                ${(submitting || uploading) ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {receiptPreview ? (
                <>
                  <img src={receiptPreview} alt="Receipt preview" className="max-h-48 rounded-lg object-contain shadow" />
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                    </div>
                  )}
                  {receiptImageUrl && !uploading && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      ✓ Uploaded successfully
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setReceiptFile(null); setReceiptPreview(null); setReceiptImageUrl(''); setUploadError(''); }}
                    className="mt-1 text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <svg className="h-8 w-8 text-slate-300" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 9h-4v4h-4v-4H6l6-6 6 6z" />
                  </svg>
                  <p className="text-sm font-semibold text-slate-500">Click to upload receipt image</p>
                  <p className="text-xs text-slate-400">A photo or screenshot of your bank transfer slip</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={submitting || uploading}
            />
            {uploadError && <p className="mt-1.5 text-xs font-semibold text-rose-600">{uploadError}</p>}
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
          disabled={submitting || uploading}
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || uploading || unpaidFees.length === 0}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-40"
        >
          {uploading ? 'Uploading…' : submitting ? 'Submitting…' : 'Submit for Verification'}
        </button>
      </div>
    </form>
  );
}

