import { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { toast } from 'react-toastify';

export default function SuperAdminSettings() {
  const [activeTab, setActiveTab] = useState('Platform Branding');
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [passwordComplexity, setPasswordComplexity] = useState('Institutional Standard (8+ chars)');
  const [twoFactor, setTwoFactor] = useState(true);
  const [gradeAlerts, setGradeAlerts] = useState(true);
  const [receiptSummaries, setReceiptSummaries] = useState(true);
  const [maintenanceBroadcasts, setMaintenanceBroadcasts] = useState(false);
  const [currency, setCurrency] = useState('ETB Ethiopian Birr');
  const [timezone, setTimezone] = useState('(GMT+03:00) East Africa Time - Addis Ababa');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY (Day-Month-Year)');
  const [calendarType, setCalendarType] = useState('Ethiopian Calendar (EC)');
  const [institutionNameEn, setInstitutionNameEn] = useState('National Academy of Addis Ababa');
  const [institutionNameAm, setInstitutionNameAm] = useState('ብሔራዊ የአዲስ አበባ አካዳሚ');
  const [brandColor, setBrandColor] = useState('#080845');
  const [headerTitle, setHeaderTitle] = useState('Institutional Excellence Dashboard');

  const handleSaveChangesAll = () => {
    toast.success('Governance settings saved successfully.');
  };

  const menuItems = [
    { id: 'Security & Access', label: 'Security & Access', icon: '🔒' },
    { id: 'Notifications', label: 'Notifications', icon: '🔔' },
    { id: 'Localization', label: 'Localization', icon: '🌐' },
    { id: 'Platform Branding', label: 'Platform Branding', icon: '🎨' },
    { id: 'Critical Operations', label: 'Critical Operations', icon: '⚠️', danger: true },
  ];

  return (
    <AdminLayout
      pageTitle="System Settings"
      pageSubtitle="Global platform configuration, organization-wide rules, and governance controls."
      headerAction={
        <button
          onClick={handleSaveChangesAll}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save Changes
        </button>
      }
    >
      <div className="mx-auto max-w-[1200px] space-y-2">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">System Settings</p>
          <p className="mt-1 text-sm text-slate-500">
            Configure institutional defaults, security policies, branding, and organization-wide system standards.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[250px_1fr]">
          <div className="space-y-1 rounded-2xl border border-slate-200/65 bg-gray-50 p-2.5">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  activeTab === item.id
                    ? item.danger
                      ? 'border-l-4 border-rose-600 bg-rose-50 text-rose-700'
                      : 'border-l-4 border-slate-900 bg-white font-bold text-slate-900 shadow-sm'
                    : 'border-l-4 border-transparent text-slate-600 hover:bg-white/50 hover:text-slate-900'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {activeTab === 'Security & Access' && (
              <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <span className="text-xl">🔒</span>
                  <h3 className="text-lg font-bold text-slate-900">Security & Access Control</h3>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Session Timeout (Minutes)</label>
                    <input
                      type="number"
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                    />
                    <p className="text-xs text-slate-400">Auto-logout for inactive governance sessions.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Minimum Password Complexity</label>
                    <select
                      value={passwordComplexity}
                      onChange={(e) => setPasswordComplexity(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                    >
                      <option>Institutional Standard (8+ chars)</option>
                      <option>High Complexity (12+ chars, symbols)</option>
                      <option>Basic (6+ chars)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-150 bg-slate-50 p-5">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">Two-Factor Authentication (2FA)</h4>
                    <p className="text-xs text-slate-500">Mandatory for governance users and sensitive system access.</p>
                  </div>
                  <button
                    onClick={() => setTwoFactor(!twoFactor)}
                    className={`h-6 w-12 rounded-full p-1 transition-colors duration-200 focus:outline-none ${twoFactor ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <div className={`h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${twoFactor ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'Notifications' && (
              <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <span className="text-xl">🔔</span>
                  <h3 className="text-lg font-bold text-slate-900">Governance Notifications</h3>
                </div>

                <div className="space-y-4">
                  <label className="flex cursor-pointer items-start gap-3.5 rounded-xl p-3.5 transition hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={gradeAlerts}
                      onChange={(e) => setGradeAlerts(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
                    />
                    <div>
                      <span className="block text-sm font-bold text-slate-900">Academic Governance Alerts</span>
                      <span className="mt-0.5 block text-xs text-slate-500">Notify leadership when sensitive academic changes are detected.</span>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3.5 rounded-xl p-3.5 transition hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={receiptSummaries}
                      onChange={(e) => setReceiptSummaries(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
                    />
                    <div>
                      <span className="block text-sm font-bold text-slate-900">Financial Oversight Summaries</span>
                      <span className="mt-0.5 block text-xs text-slate-500">Send system-level revenue and compliance summary notifications.</span>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3.5 rounded-xl p-3.5 transition hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={maintenanceBroadcasts}
                      onChange={(e) => setMaintenanceBroadcasts(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
                    />
                    <div>
                      <span className="block text-sm font-bold text-slate-900">System Maintenance Broadcasts</span>
                      <span className="mt-0.5 block text-xs text-slate-500">Allow global security and downtime announcements across the platform.</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'Localization' && (
              <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <span className="text-xl">🌐</span>
                  <h3 className="text-lg font-bold text-slate-900">Localization & Regional Standards</h3>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Default Currency</label>
                    <input
                      type="text"
                      value={currency}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 font-medium text-slate-600 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">System Timezone</label>
                    <input
                      type="text"
                      value={timezone}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 font-medium text-slate-600 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Date Format</label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                    >
                      <option>DD/MM/YYYY (Day-Month-Year)</option>
                      <option>MM/DD/YYYY (Month-Day-Year)</option>
                      <option>YYYY-MM-DD (ISO Format)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Academic Calendar Type</label>
                    <select
                      value={calendarType}
                      onChange={(e) => setCalendarType(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                    >
                      <option>Ethiopian Calendar (EC)</option>
                      <option>Gregorian Calendar (GC)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Platform Branding' && (
              <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <span className="text-xl">🎨</span>
                  <h3 className="text-lg font-bold text-slate-900">Platform Branding</h3>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Institution Logo</label>
                    <div className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center transition hover:bg-slate-50">
                      <svg className="mb-2.5 h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                      </svg>
                      <span className="text-sm font-bold text-slate-900">Click to upload logo</span>
                      <span className="mt-1 text-xs text-slate-500">SVG or PNG recommended (Max 2MB)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Current Preview</label>
                    <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-slate-200/60 bg-slate-100 p-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl shadow-md" style={{ backgroundColor: brandColor }}>
                        <span className="text-xs font-black text-white">LOGO</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Institution Name (English)</label>
                    <input
                      type="text"
                      value={institutionNameEn}
                      onChange={(e) => setInstitutionNameEn(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Institution Name (Amharic)</label>
                    <input
                      type="text"
                      value={institutionNameAm}
                      onChange={(e) => setInstitutionNameAm(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Primary Brand Color</label>
                    <div className="flex gap-2.5">
                      <div className="h-12 w-12 rounded-xl border border-slate-200 shadow-inner" style={{ backgroundColor: brandColor }} />
                      <input
                        type="text"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">System Header Title</label>
                    <input
                      type="text"
                      value={headerTitle}
                      onChange={(e) => setHeaderTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Critical Operations' && (
              <div className="space-y-6 rounded-2xl border border-rose-200 bg-rose-500/[0.03] p-6">
                <div className="flex items-center gap-3 border-b border-rose-150 pb-4">
                  <span className="text-xl">⚠️</span>
                  <h3 className="text-lg font-bold text-rose-900">Critical Operations</h3>
                </div>

                <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-rose-250 bg-white p-5 sm:flex-row sm:items-center">
                  <div className="max-w-md space-y-1">
                    <h4 className="text-sm font-bold text-rose-900">Factory System Reset</h4>
                    <p className="text-xs leading-relaxed text-slate-600">
                      Wipe governance configurations and return to platform baseline. This is a simulated control surface for system-wide emergency operations.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you absolutely sure you want to initiate a factory system reset? This action cannot be undone.')) {
                        toast.error('Reset simulation completed. All system governance caches purged.');
                      }
                    }}
                    className="w-full shrink-0 rounded-xl bg-rose-600 px-5 py-3 text-xs font-bold text-white transition active:scale-[0.99] hover:bg-rose-700 sm:w-auto"
                  >
                    Initiate System Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}