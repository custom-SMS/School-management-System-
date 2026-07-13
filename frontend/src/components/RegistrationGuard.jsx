/**
 * RegistrationGuard
 *
 * Wraps the Student Registration route. Checks whether the active academic
 * year has its registration window open. If closed (or no active year exists),
 * shows a clear blocked screen instead of the wizard.
 *
 * SuperAdmin always bypasses this guard (they can register anytime).
 * Edit-mode (/students/:id/edit) does NOT use this guard — editing an
 * existing student record is always permitted.
 */
import { useEffect, useState, useContext } from 'react';
import axios from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function RegistrationGuard({ children }) {
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState('loading'); // 'loading' | 'open' | 'closed' | 'no_year'

  useEffect(() => {
    const check = async () => {
      try {
        const res = await axios.get('/academic-years');
        const years = res.data || [];
        const active = years.find((y) => y.isActive);
        if (!active) {
          setStatus('no_year');
        } else if (active.registrationOpen) {
          setStatus('open');
        } else {
          setStatus('closed');
        }
      } catch {
        // If we can't verify, default to open so registration isn't accidentally blocked
        setStatus('open');
      }
    };
    check();
  }, []);

  // SuperAdmin bypasses the period check
  if (user?.role === 'SuperAdmin') return children;

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500 font-medium">
        Checking registration period…
      </div>
    );
  }

  if (status === 'open') return children;

  // Registration is closed — show a clear blocked screen
  const isNoYear = status === 'no_year';
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-amber-100 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 border border-amber-100 text-amber-500">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Registration Closed</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {isNoYear
            ? 'No active academic year is set. A SuperAdmin must activate an academic year before registration can open.'
            : 'Student registration is currently closed. The registration window for the active academic year has not been opened yet, or it has already ended.'}
        </p>
        <p className="mt-3 text-xs text-slate-400">
          Contact a SuperAdmin to open or extend the registration period.
        </p>
      </div>
    </div>
  );
}
