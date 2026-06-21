import { useEffect, useState } from 'react';
import axios from '../api/axios';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { toast } from 'react-toastify';

export default function Settings() {
  // --- Existing Logic/States ---
  const [weights, setWeights] = useState({ quizWeight: 10, assignmentWeight: 20, midtermWeight: 30, finalWeight: 40 });
  const [savingWeights, setSavingWeights] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [unlockingId, setUnlockingId] = useState('');

  // --- Image 2 Mock States (for premium interactive UI) ---
  const [activeTab, setActiveTab] = useState('Platform Branding'); // Default active tab in screenshot or we can show all / scroll
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
  const [logoPreview, setLogoPreview] = useState(null);

  const fetchWeights = async () => {
    try {
      const res = await axios.get('/classroom/grading-structure');
      if (res.data) {
        setWeights({
          quizWeight: res.data.quizWeight,
          assignmentWeight: res.data.assignmentWeight,
          midtermWeight: res.data.midtermWeight,
          finalWeight: res.data.finalWeight,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await axios.get('/classroom/attendance');
      setSessions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/settings');
      const s = res.data || {};
      if (s.security) {
        setSessionTimeout(String(s.security.sessionTimeout ?? '30'));
        setPasswordComplexity(s.security.passwordComplexity ?? passwordComplexity);
        setTwoFactor(Boolean(s.security.twoFactor));
      }
      if (s.notifications) {
        setGradeAlerts(Boolean(s.notifications.gradeAlerts));
        setReceiptSummaries(Boolean(s.notifications.receiptSummaries));
        setMaintenanceBroadcasts(Boolean(s.notifications.maintenanceBroadcasts));
      }
      if (s.localization) {
        setCurrency(s.localization.currency ?? currency);
        setTimezone(s.localization.timezone ?? timezone);
        setDateFormat(s.localization.dateFormat ?? dateFormat);
        setCalendarType(s.localization.calendarType ?? calendarType);
      }
      if (s.branding) {
        setInstitutionNameEn(s.branding.institutionNameEn ?? institutionNameEn);
        setInstitutionNameAm(s.branding.institutionNameAm ?? institutionNameAm);
        setBrandColor(s.branding.brandColor ?? brandColor);
        setHeaderTitle(s.branding.headerTitle ?? headerTitle);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWeights();
    fetchSessions();
    fetchSettings();
  }, []);

  const total = Number(weights.quizWeight) + Number(weights.assignmentWeight) + Number(weights.midtermWeight) + Number(weights.finalWeight);

  const handleWeightChange = (field, value) => {
    setWeights((w) => ({ ...w, [field]: value === '' ? '' : Number(value) }));
  };

  const handleSaveWeights = async (e) => {
    if (e) e.preventDefault();
    if (total !== 100) {
      toast.error(`Weights must sum to 100%. Current total: ${total}%.`);
      return;
    }
    setSavingWeights(true);
    try {
      await axios.post('/classroom/grading-structure', {
        quizWeight: Number(weights.quizWeight),
        assignmentWeight: Number(weights.assignmentWeight),
        midtermWeight: Number(weights.midtermWeight),
        finalWeight: Number(weights.finalWeight),
      });
      toast.success('Grading structure updated successfully.');
      fetchWeights();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update grading structure.');
    } finally {
      setSavingWeights(false);
    }
  };

  const handleUnlock = async (id) => {
    setUnlockingId(id);
    try {
      await axios.patch(`/classroom/attendance/${id}/unlock`);
      toast.success('Attendance session unlocked.');
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlock session.');
    } finally {
      setUnlockingId('');
    }
  };

  const handleSaveChangesAll = async () => {
    setSavingAll(true);
    try {
      await axios.put('/settings', {
        security: {
          sessionTimeout,
          passwordComplexity,
          twoFactor,
        },
        notifications: {
          gradeAlerts,
          receiptSummaries,
          maintenanceBroadcasts,
        },
        localization: {
          currency,
          timezone,
          dateFormat,
          calendarType,
        },
        branding: {
          institutionNameEn,
          institutionNameAm,
          brandColor,
          headerTitle,
        },
      });
      toast.success('Settings saved successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSavingAll(false);
    }
  };

  const menuItems = [
    { id: 'Security & Access', label: 'Security & Access', icon: '🔒' },
    { id: 'Notifications', label: 'Notifications', icon: '🔔' },
    { id: 'Localization', label: 'Localization', icon: '🌐' },
    { id: 'Platform Branding', label: 'Platform Branding', icon: '🎨' },
    { id: 'Grading & Attendance', label: 'Grading & Attendance', icon: '📊' }, // Injected to keep existing functional features
    { id: 'Critical Operations', label: 'Critical Operations', icon: '⚠️', danger: true },
  ];

  return (
    <SuperAdminLayout 
      pageTitle="System Settings" 
      headerAction={
        <button
          onClick={handleSaveChangesAll}
          disabled={savingAll}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 transition disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          {savingAll ? 'Saving…' : 'Save Changes'}
        </button>
      }
    >
      <div className="max-w-[1200px] mx-auto space-y-2">
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Settings</p>
          <p className="text-sm text-slate-500 mt-1">Configure institutional defaults, security protocols, and platform branding.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8 items-start">
          
          {/* Tab Navigation Menu */}
          <div className="space-y-1 bg-gray-50 p-2.5 rounded-2xl border border-slate-200/65">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  activeTab === item.id
                    ? item.danger 
                      ? 'bg-rose-50 text-rose-700 border-l-4 border-rose-600' 
                      : 'bg-white text-slate-900 shadow-sm border-l-4 border-slate-900 font-bold'
                    : 'text-slate-600 border-l-4 border-transparent hover:bg-white/50 hover:text-slate-900'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Form details based on Active Tab */}
          <div className="space-y-6">

            {/* TAB: Security & Access */}
            {activeTab === 'Security & Access' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <span className="text-xl">🔒</span>
                  <h3 className="text-lg font-bold text-slate-900">Security & Access Control</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Session Timeout (Minutes)</label>
                    <input 
                      type="number" 
                      value={sessionTimeout} 
                      onChange={(e) => setSessionTimeout(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                    />
                    <p className="text-xs text-slate-400">Auto-logout for inactive administrative sessions.</p>
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

                <div className="bg-slate-50 rounded-2xl p-5 flex items-center justify-between border border-slate-150">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">Two-Factor Authentication (2FA)</h4>
                    <p className="text-xs text-slate-500">Mandatory for all users with 'Admin' or 'Finance' roles.</p>
                  </div>
                  <button 
                    onClick={() => setTwoFactor(!twoFactor)} 
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${twoFactor ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${twoFactor ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB: Notifications */}
            {activeTab === 'Notifications' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <span className="text-xl">🔔</span>
                  <h3 className="text-lg font-bold text-slate-900">Institutional Notifications</h3>
                </div>
                <div className="space-y-4">
                  <label className="flex items-start gap-3.5 p-3.5 rounded-xl hover:bg-slate-50 transition cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={gradeAlerts} 
                      onChange={(e) => setGradeAlerts(e.target.checked)}
                      className="mt-1 w-4 h-4 text-slate-950 border-slate-300 rounded focus:ring-slate-950" 
                    />
                    <div>
                      <span className="block text-sm font-bold text-slate-900">Grade Submission Alerts</span>
                      <span className="block text-xs text-slate-500 mt-0.5">Notify department heads when grades are submitted or modified.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3.5 p-3.5 rounded-xl hover:bg-slate-50 transition cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={receiptSummaries} 
                      onChange={(e) => setReceiptSummaries(e.target.checked)}
                      className="mt-1 w-4 h-4 text-slate-950 border-slate-300 rounded focus:ring-slate-950" 
                    />
                    <div>
                      <span className="block text-sm font-bold text-slate-900">Financial Receipt Summaries</span>
                      <span className="block text-xs text-slate-500 mt-0.5">Daily automated PDF reports for the treasury office.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3.5 p-3.5 rounded-xl hover:bg-slate-50 transition cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={maintenanceBroadcasts} 
                      onChange={(e) => setMaintenanceBroadcasts(e.target.checked)}
                      className="mt-1 w-4 h-4 text-slate-950 border-slate-300 rounded focus:ring-slate-950" 
                    />
                    <div>
                      <span className="block text-sm font-bold text-slate-900">System Maintenance Broadcasts</span>
                      <span className="block text-xs text-slate-500 mt-0.5">Allow global dashboard banners for planned downtime notifications.</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* TAB: Localization */}
            {activeTab === 'Localization' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <span className="text-xl">🌐</span>
                  <h3 className="text-lg font-bold text-slate-900">Localization & Regional Standards</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Default Currency</label>
                    <input 
                      type="text" 
                      value={currency} 
                      disabled
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-slate-600 outline-none cursor-not-allowed font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">System Timezone</label>
                    <input 
                      type="text" 
                      value={timezone} 
                      disabled
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-slate-600 outline-none cursor-not-allowed font-medium"
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

            {/* TAB: Platform Branding */}
            {activeTab === 'Platform Branding' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <span className="text-xl">🎨</span>
                  <h3 className="text-lg font-bold text-slate-900">Platform Branding</h3>
                </div>
                
                {/* Logo & Preview Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Institution Logo</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-slate-50 transition cursor-pointer text-center">
                      <svg className="w-8 h-8 text-slate-400 mb-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                      </svg>
                      <span className="text-sm font-bold text-slate-900">Click to upload logo</span>
                      <span className="text-xs text-slate-500 mt-1">SVG or PNG recommended (Max 2MB)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Current Preview</label>
                    <div className="bg-slate-100 rounded-2xl p-4 flex items-center justify-center min-h-[140px] border border-slate-200/60">
                      <div className="w-16 h-16 bg-[#080845] rounded-xl flex items-center justify-center shadow-md">
                        <span className="text-white text-xs font-black">LOGO</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Text fields */}
                <div className="grid md:grid-cols-2 gap-6">
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
                      <div className="w-12 h-12 rounded-xl border border-slate-200 shadow-inner" style={{ backgroundColor: brandColor }} />
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

            {/* TAB: Grading & Attendance (Preserved functionalities) */}
            {activeTab === 'Grading & Attendance' && (
              <div className="space-y-6">
                
                {/* Grading Structure */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                    <span className="text-xl">📊</span>
                    <h3 className="text-lg font-bold text-slate-900">Grading Structure</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-6">Each component is scored out of 100 and combined using these weights. They must sum to 100%.</p>
                  
                  <form onSubmit={handleSaveWeights} className="grid sm:grid-cols-2 gap-5">
                    {[
                      { key: 'quizWeight', label: 'Quiz Weight (%)' },
                      { key: 'assignmentWeight', label: 'Assignment Weight (%)' },
                      { key: 'midtermWeight', label: 'Midterm Weight (%)' },
                      { key: 'finalWeight', label: 'Final Weight (%)' },
                    ].map((f) => (
                      <div key={f.key} className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">{f.label}</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          required 
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white" 
                          value={weights[f.key]} 
                          onChange={(e) => handleWeightChange(f.key, e.target.value)} 
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-2 flex items-center justify-between p-4 rounded-xl mt-2 bg-slate-50 border border-slate-150">
                      <div className={`text-sm font-semibold ${total === 100 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        Total: {total}% {total === 100 ? '✓' : '(must equal 100%)'}
                      </div>
                      <button 
                        type="submit" 
                        disabled={savingWeights || total !== 100} 
                        className="bg-slate-900 text-white hover:bg-slate-800 px-5 py-2.5 rounded-xl font-bold text-xs transition disabled:opacity-50"
                      >
                        {savingWeights ? 'Saving…' : 'Save Weights Only'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Attendance Locks */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                    <span className="text-xl">🔒</span>
                    <h3 className="text-lg font-bold text-slate-900">Attendance Locks</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">Sessions older than 7 days are locked. Unlock to allow teachers to amend them.</p>
                  
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                          <th className="px-4 py-3.5">Class</th>
                          <th className="px-4 py-3.5">Date</th>
                          <th className="px-4 py-3.5">Records</th>
                          <th className="px-4 py-3.5">Status</th>
                          <th className="px-4 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 bg-white">
                        {sessions.map((s) => (
                          <tr key={s._id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3.5 font-bold text-slate-800">{s.className}</td>
                            <td className="px-4 py-3.5 text-slate-600">
                              {new Date(s.date).toLocaleDateString()}{' '}
                              <span className="text-xs text-slate-400">({s.ageDays}d ago)</span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 font-medium">{s.recordCount}</td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${s.locked ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                {s.locked ? 'Locked' : 'Editable'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                disabled={!s.locked || unlockingId === s._id}
                                onClick={() => handleUnlock(s._id)}
                                className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition"
                              >
                                {unlockingId === s._id ? 'Unlocking…' : 'Unlock'}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {sessions.length === 0 && (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-slate-500 font-medium">
                              No attendance sessions recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* TAB: Critical Operations */}
            {activeTab === 'Critical Operations' && (
              <div className="bg-rose-500/[0.03] rounded-2xl border border-rose-200 p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-rose-150 pb-4">
                  <span className="text-xl">⚠️</span>
                  <h3 className="text-lg font-bold text-rose-900">Critical Operations</h3>
                </div>
                
                <div className="bg-white rounded-2xl border border-rose-250 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="space-y-1 max-w-md">
                    <h4 className="text-sm font-bold text-rose-900">Factory System Reset</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Wipe all administrative configurations and return to baseline. Student data remains intact, but all custom Institutional settings will be lost forever.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      if (window.confirm('Are you absolutely sure you want to initiate a factory system reset? This action cannot be undone.')) {
                        toast.error('Reset simulation completed. All system caches purged.');
                      }
                    }}
                    className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-xl font-bold text-xs transition active:scale-[0.99] shrink-0"
                  >
                    Initiate System Reset
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </SuperAdminLayout>
  );
}
