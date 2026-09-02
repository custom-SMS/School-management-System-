import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';

export default function MobileAppIntro() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const { branding, logoUrl } = useSettings();

  useEffect(() => {
    // Check if shown in this session
    const hasShown = sessionStorage.getItem('app_intro_shown');
    if (hasShown) {
      setVisible(false);
      return;
    }

    // Start fade out after 1.8 seconds
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem('app_intro_shown', 'true');
      }, 500); // 500ms fade transition
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const schoolName = branding?.institutionNameEn || 'School Management System';
  const tagline = branding?.motto || 'Empowering Excellence Through Innovation';

  return (
    <div
      onClick={() => {
        setFading(true);
        setTimeout(() => {
          setVisible(false);
          sessionStorage.setItem('app_intro_shown', 'true');
        }, 300);
      }}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between p-8 bg-[#203e4f] text-white transition-opacity duration-500 cursor-pointer select-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 w-72 h-72 bg-[#3b6b82]/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 w-60 h-60 bg-[#172d3a]/60 rounded-full blur-2xl pointer-events-none" />

      {/* Top spacer */}
      <div className="w-full flex justify-end">
        <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">
          Tap to skip
        </span>
      </div>

      {/* Central Brand & Universal Academic Crest */}
      <div className="flex flex-col items-center text-center space-y-6 max-w-xs relative z-10">
        {/* Universal Academic Icon / School Logo */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-amber-400/30 to-[#3b6b82]/40 rounded-3xl blur-md animate-pulse" />
          <div className="relative w-24 h-24 rounded-3xl bg-[#172d3a] border border-white/20 p-4 shadow-2xl flex items-center justify-center transform transition-transform duration-700 hover:scale-105">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={schoolName}
                className="w-full h-full object-contain filter drop-shadow-md rounded-2xl"
              />
            ) : (
              <img
                src="/favicon.svg?v=sms"
                alt="Academic Crest"
                className="w-full h-full object-contain filter drop-shadow-md"
              />
            )}
          </div>
        </div>

        {/* Dynamic School Name & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
            {schoolName}
          </h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9bbcc9]">
            Academic & Finance Portal
          </p>
        </div>

        {/* Motto / Tagline */}
        <p className="text-xs text-slate-300 italic max-w-[250px] leading-relaxed pt-2">
          "{tagline}"
        </p>
      </div>

      {/* Bottom Loading Indicator */}
      <div className="w-full max-w-[180px] flex flex-col items-center space-y-3 relative z-10 pb-4">
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#3b6b82] via-amber-400 to-[#3b6b82] rounded-full animate-[progress_1.8s_ease-in-out_infinite]" />
        </div>
        <span className="text-[10px] text-slate-400 tracking-wider">
          Secured with SSL Encryption
        </span>
      </div>

      {/* Embedded CSS for custom progress animation */}
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
