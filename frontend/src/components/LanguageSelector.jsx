import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

const UKFlag = () => (
  <svg className="w-5 h-3.5 rounded-[2px] shadow-xs object-cover flex-shrink-0 border border-slate-200" viewBox="0 0 60 30">
    <clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
    <clipPath id="t"><path d="M30,15 L60,0 v30 z M30,15 L0,30 v-30 z M30,15 L0,0 h60 z M30,15 L60,30 h-60 z"/></clipPath>
    <g clipPath="url(#s)">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);

const EthiopiaFlag = () => (
  <svg className="w-5 h-3.5 rounded-[2px] shadow-xs object-cover flex-shrink-0 border border-slate-200" viewBox="0 0 600 400">
    <rect width="600" height="133.3" fill="#009A44"/>
    <rect y="133.3" width="600" height="133.3" fill="#FED100"/>
    <rect y="266.6" width="600" height="134" fill="#E4002B"/>
    <circle cx="300" cy="200" r="70" fill="#0033A0"/>
    <polygon points="300,142 316,190 367,190 325,220 341,268 300,238 259,268 275,220 233,190 284,190" fill="none" stroke="#FED100" strokeWidth="7" />
    <line x1="300" y1="142" x2="300" y2="200" stroke="#FED100" strokeWidth="4"/>
    <line x1="367" y1="190" x2="300" y2="200" stroke="#FED100" strokeWidth="4"/>
    <line x1="341" y1="268" x2="300" y2="200" stroke="#FED100" strokeWidth="4"/>
    <line x1="259" y1="268" x2="300" y2="200" stroke="#FED100" strokeWidth="4"/>
    <line x1="233" y1="190" x2="300" y2="200" stroke="#FED100" strokeWidth="4"/>
  </svg>
);

const LANGUAGES = [
  { code: 'en', label: 'English', FlagComponent: UKFlag },
  { code: 'am', label: 'አማርኛ', FlagComponent: EthiopiaFlag },
  { code: 'om', label: 'Afaan Oromoo', FlagComponent: EthiopiaFlag },
];

export default function LanguageSelector({ className = '' }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const CurrentFlag = currentLang.FlagComponent;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
        title="Select Language"
      >
        <CurrentFlag />
        <span className="truncate max-w-[90px]">{currentLang.label}</span>
        <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Language / ቋንቋ
          </div>
          <div className="py-1">
            {LANGUAGES.map((item) => {
              const ItemFlag = item.FlagComponent;
              const isSelected = lang === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setLang(item.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ItemFlag />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
