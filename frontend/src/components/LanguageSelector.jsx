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
  <svg
    className="w-5 h-3.5 rounded-[2px] border border-slate-200 shadow-xs object-cover flex-shrink-0"
    viewBox="0 0 600 400"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Green */}
    <rect width="600" height="133.333" fill="#078930" />

    {/* Yellow */}
    <rect y="133.333" width="600" height="133.333" fill="#FCDD09" />

    {/* Red */}
    <rect y="266.666" width="600" height="133.334" fill="#DA121A" />

    {/* Blue Disc */}
    <circle cx="300" cy="200" r="72" fill="#0F47AF" />

    {/* Pentagram */}
    <g
      fill="none"
      stroke="#FCDD09"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Outer Star */}
      <polygon points="
        300,136
        337.6,251.7
        239.2,180.3
        360.8,180.3
        262.4,251.7
      "/>

      {/* Connecting Lines */}
      <line x1="300" y1="136" x2="300" y2="200"/>
      <line x1="360.8" y1="180.3" x2="300" y2="200"/>
      <line x1="337.6" y1="251.7" x2="300" y2="200"/>
      <line x1="262.4" y1="251.7" x2="300" y2="200"/>
      <line x1="239.2" y1="180.3" x2="300" y2="200"/>
    </g>
  </svg>
);

const OromoFlag = () => (
  <svg
    className="w-5 h-3.5 rounded-[2px] border border-slate-200 shadow-xs flex-shrink-0"
    viewBox="0 0 600 400"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background */}
    <rect width="600" height="133.33" fill="#D50000" />
    <rect y="133.33" width="600" height="133.34" fill="#FFFFFF" />
    <rect y="266.67" width="600" height="133.33" fill="#000000" />

    {/* Tree */}
    <g transform="translate(300 205)">
      {/* Trunk */}
      <path
        d="M-18 120
           C-10 80 -8 40 -5 0
           L5 0
           C8 40 10 80 18 120
           Z"
        fill="#B7B37A"
        stroke="#111"
        strokeWidth="2"
      />

      {/* Canopy */}
      <path
        d="
          M-90 0
          C-105 -20 -95 -45 -75 -55
          C-65 -80 -35 -90 -10 -88
          C10 -100 45 -95 65 -75
          C90 -75 110 -55 108 -28
          C120 -5 108 18 88 28
          C70 45 40 42 20 35
          C5 45 -15 45 -35 35
          C-55 45 -82 38 -95 18
          C-112 10 -115 -10 -90 0
          Z"
        fill="#0A6B2D"
        stroke="#111"
        strokeWidth="3"
      />

      {/* Branches */}
      <path
        d="M0 0 C-15 -15 -30 -30 -45 -38"
        fill="none"
        stroke="#111"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M0 0 C15 -15 30 -30 45 -38"
        fill="none"
        stroke="#111"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M0 0 C0 -25 0 -50 0 -70"
        fill="none"
        stroke="#111"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Stylized canopy details */}
      <path
        d="M-60 -35 C-50 -20 -55 -5 -70 10"
        fill="none"
        stroke="#111"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M-20 -65 C-35 -45 -25 -20 -8 -5"
        fill="none"
        stroke="#111"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M35 -65 C20 -45 30 -20 48 -2"
        fill="none"
        stroke="#111"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M75 -25 C60 -5 62 10 80 25"
        fill="none"
        stroke="#111"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  </svg>
);


const LANGUAGES = [
  { code: 'en', label: 'English', FlagComponent: UKFlag },
  { code: 'am', label: 'አማርኛ', FlagComponent: EthiopiaFlag },
  { code: 'om', label: 'Afaan Oromoo', FlagComponent: OromoFlag },
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
        className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200 bg-white px-2 sm:px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
        title="Select Language"
      >
        <CurrentFlag />
        <span className="truncate max-w-[50px] min-[400px]:max-w-[70px] sm:max-w-[90px]">{currentLang.label}</span>
        <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
