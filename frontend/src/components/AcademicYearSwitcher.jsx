import { useState, useRef, useEffect } from 'react';
import { useAcademicYear } from '../context/AcademicYearContext';

export default function AcademicYearSwitcher() {
  const {
    activeYear,
    years = [],
    switchYear,
    setViewYear,
    resetViewYear,
    canSwitchYear,
    loading,
    viewYear,
    isViewingHistory,
    selectedYear,
  } = useAcademicYear();

  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!canSwitchYear || loading || !activeYear) return null;

  const handleView = (year) => {
    setViewYear(year);
    setOpen(false);
  };

  const handleActivate = async (yearId) => {
    setSwitching(yearId);
    const result = await switchYear(yearId);
    setSwitching(null);
    if (result?.ok) setOpen(false);
  };

  const currentLabel = selectedYear?.year || activeYear?.year || 'Select Year';

  return (
    <div className="relative inline-flex items-center gap-2" ref={menuRef}>
      {/* Historical view badge */}
      {isViewingHistory && (
        <button
          type="button"
          onClick={resetViewYear}
          title="Click to return to current active year"
          className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 transition hover:bg-amber-500/30"
        >
          <span>🕐</span>
          <span>Historical View</span>
        </button>
      )}

      {/* Main trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-xs transition ${
          isViewingHistory
            ? 'border-amber-400/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
            : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
        }`}
      >
        <svg className="h-3.5 w-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{currentLabel}</span>
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-700 bg-slate-900 p-2 text-slate-100 shadow-2xl">
          <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            Academic Years
          </div>

          <div className="max-h-60 overflow-y-auto py-1 space-y-1">
            {years.map((year) => {
              const isActive = year.id === activeYear?.id;
              const isViewing = year.id === viewYear?.id;

              return (
                <div
                  key={year.id}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition ${
                    isViewing
                      ? 'bg-amber-500/15 border border-amber-500/30'
                      : isActive
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`font-semibold ${isActive || isViewing ? 'text-white' : 'text-slate-300'}`}>
                      {year.year}
                    </span>
                    {isActive && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    )}
                    {isViewing && !isActive && (
                      <span className="rounded-full bg-amber-400 text-slate-950 px-2 py-0.5 text-[9px] font-extrabold">
                        Viewing
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isViewing && (
                      <button
                        type="button"
                        onClick={() => handleView(year)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                        title="View this year's data without changing global active year"
                      >
                        View
                      </button>
                    )}
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => handleActivate(year.id)}
                        disabled={switching === year.id}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50"
                        title="Set as global active year"
                      >
                        {switching === year.id ? '…' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isViewingHistory && (
            <div className="border-t border-slate-800 pt-1 mt-1">
              <button
                type="button"
                onClick={() => {
                  resetViewYear();
                  setOpen(false);
                }}
                className="w-full text-left rounded-xl px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition"
              >
                ↩ Return to current active year ({activeYear?.year})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
