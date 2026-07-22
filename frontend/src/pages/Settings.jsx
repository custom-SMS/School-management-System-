import { useEffect, useState } from 'react';
import axios from '../api/axios';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';

export default function Settings() {
  const queryClient = useQueryClient();
  // --- Existing Logic/States ---
  const [savingAll, setSavingAll] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [unlockingId, setUnlockingId] = useState('');

  // --- Dynamic Grading Structure ---
  const [gradingComponents, setGradingComponents] = useState([
    { name: 'Quiz', weight: 10 },
    { name: 'Assignment', weight: 20 },
    { name: 'Midterm', weight: 30 },
    { name: 'Final', weight: 40 },
  ]);
  const [passMark, setPassMark] = useState(50);
  const [savingWeights, setSavingWeights] = useState(false);
  // Inline add/edit state
  const [newCompName, setNewCompName] = useState('');
  const [newCompWeight, setNewCompWeight] = useState('');
  const [editingCompIdx, setEditingCompIdx] = useState(null);
  const [editingCompName, setEditingCompName] = useState('');
  const [editingCompWeight, setEditingCompWeight] = useState('');

  const totalWeight = gradingComponents.reduce((s, c) => s + Number(c.weight || 0), 0);
  const weightValid = Math.abs(totalWeight - 100) < 0.001;

  // --- Image 2 Mock States (for premium interactive UI) ---
  const [activeTab, setActiveTab] = useState('Platform Branding'); // Default active tab in screenshot or we can show all / scroll
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [passwordComplexity, setPasswordComplexity] = useState('Institutional Standard (8+ chars)');
  const [twoFactor, setTwoFactor] = useState(true);
  
  const [gradeAlerts, setGradeAlerts] = useState(true);
  const [receiptSummaries, setReceiptSummaries] = useState(true);
  const [maintenanceBroadcasts, setMaintenanceBroadcasts] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  
  const [currency, setCurrency] = useState('ETB Ethiopian Birr');
  const [timezone, setTimezone] = useState('(GMT+03:00) East Africa Time - Addis Ababa');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY (Day-Month-Year)');
  const [calendarType, setCalendarType] = useState('Ethiopian Calendar (EC)');

  const [institutionNameEn, setInstitutionNameEn] = useState('National Academy of Addis Ababa');
  const [institutionNameAm, setInstitutionNameAm] = useState('ብሔራዊ የአዲስ አበባ አካዳሚ');
  const [brandColor, setBrandColor] = useState('#080845');
  const [headerTitle, setHeaderTitle] = useState('Institutional Excellence Dashboard');
  const [logo, setLogo] = useState(''); // stored URL from upload provider
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
  const logoUrl = logo ? (/^https?:\/\//i.test(logo) ? logo : `${apiOrigin}${logo}`) : null;

  const fetchWeights = async () => {
    try {
      const res = await axios.get('/classroom/grading-structure');
      if (res.data?.components && Array.isArray(res.data.components)) {
        setGradingComponents(res.data.components);
        setPassMark(res.data.passMark ?? 50);
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
        setMaintenanceMessage(s.notifications.maintenanceMessage || '');
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
        setLogo(s.branding.logo ?? '');
      }
      if (s.grading) {
        setPassMark(s.grading.passMark ?? 50);
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

  // ── Grading component CRUD ───────────────────────────────────────────────
  const handleAddComponent = () => {
    const name = newCompName.trim();
    const weight = Number(newCompWeight);
    if (!name) { toast.error('Component name is required.'); return; }
    if (isNaN(weight) || weight < 0 || weight > 100) { toast.error('Weight must be 0–100.'); return; }
    if (gradingComponents.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error('A component with that name already exists.'); return;
    }
    setGradingComponents(prev => [...prev, { name, weight }]);
    setNewCompName(''); setNewCompWeight('');
  };

  const handleDeleteComponent = (idx) => {
    setGradingComponents(prev => prev.filter((_, i) => i !== idx));
  };

  const handleStartEdit = (idx) => {
    setEditingCompIdx(idx);
    setEditingCompName(gradingComponents[idx].name);
    setEditingCompWeight(String(gradingComponents[idx].weight));
  };

  const handleSaveEdit = (idx) => {
    const name = editingCompName.trim();
    const weight = Number(editingCompWeight);
    if (!name) { toast.error('Name is required.'); return; }
    if (isNaN(weight) || weight < 0 || weight > 100) { toast.error('Weight must be 0–100.'); return; }
    setGradingComponents(prev => prev.map((c, i) => i === idx ? { name, weight } : c));
    setEditingCompIdx(null);
  };

  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    setGradingComponents(prev => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  const handleMoveDown = (idx) => {
    setGradingComponents(prev => {
      if (idx === prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  const handleSaveWeights = async (e) => {
    if (e) e.preventDefault();
    if (!weightValid) {
      toast.error(`Weights must sum to 100%. Current total: ${totalWeight.toFixed(1)}%.`);
      return;
    }
    setSavingWeights(true);
    try {
      await axios.post('/classroom/grading-structure', {
        components: gradingComponents.map(c => ({ name: c.name, weight: Number(c.weight) })),
        passMark: Number(passMark),
      });
      toast.success('Grading structure saved.');
      fetchWeights();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save grading structure.');
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

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be 2MB or smaller.');
      return;
    }
    setUploadingLogo(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await axios.post('/uploads', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setLogo(res.data.url);
      toast.success('Logo uploaded. Remember to save changes.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Logo upload failed.');
    } finally {
      setUploadingLogo(false);
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
          maintenanceMessage,
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
          logo,
        },
        grading: {
          passMark,
        },
      });
      // Invalidate the public settings query so the logo appears immediately
      queryClient.invalidateQueries({ queryKey: ['settings', 'public'] });
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
    { id: 'Grading', label: 'Grading', icon: '📊' },
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
          <div className="flex flex-row overflow-x-auto whitespace-nowrap lg:flex-col lg:space-y-1 bg-gray-50 p-2 rounded-xl border border-slate-200/65 gap-1 shrink-0 scrollbar-none">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                  activeTab === item.id
                    ? 'bg-white text-slate-900 shadow-sm border-slate-900 font-bold border-b-2 lg:border-b-0 lg:border-l-4'
                    : 'text-slate-600 border-b-2 lg:border-b-0 lg:border-l-4 border-transparent hover:bg-white/50 hover:text-slate-900'
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
                    <div className="flex-1">
                      <span className="block text-sm font-bold text-slate-900">System Maintenance Broadcasts</span>
                      <span className="block text-xs text-slate-500 mt-0.5">Allow global dashboard banners for planned downtime notifications.</span>
                    </div>
                  </label>
                  {maintenanceBroadcasts && (
                    <div className="ml-7 space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Broadcast Message</label>
                      <textarea
                        value={maintenanceMessage}
                        onChange={(e) => setMaintenanceMessage(e.target.value)}
                        placeholder="Enter maintenance message to display across all pages..."
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white resize-none"
                      />
                      <p className="text-xs text-slate-400">This message will appear as a banner on all pages when maintenance broadcasts are enabled.</p>
                    </div>
                  )}
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
                    <label className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-slate-50 transition cursor-pointer text-center">
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        disabled={uploadingLogo}
                        onChange={handleLogoUpload}
                      />
                      <svg className="w-8 h-8 text-slate-400 mb-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                      </svg>
                      <span className="text-sm font-bold text-slate-900">{uploadingLogo ? 'Uploading…' : 'Click to upload logo'}</span>
                      <span className="text-xs text-slate-500 mt-1">PNG or JPG recommended (Max 2MB)</span>
                    </label>
                    {logo && (
                      <button
                        type="button"
                        onClick={() => setLogo('')}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 transition"
                      >
                        Remove logo
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Current Preview</label>
                    <div className="bg-slate-100 rounded-2xl p-4 flex items-center justify-center min-h-[140px] border border-slate-200/60">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Institution logo" className="max-h-[100px] max-w-full object-contain" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: brandColor }}>
                          <span className="text-white text-xs font-black">LOGO</span>
                        </div>
                      )}
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

            {/* TAB: Grading */}
            {activeTab === 'Grading' && (
              <div className="space-y-6">

                {/* ── Grading Structure card ── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📊</span>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Grading Structure</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Define the assessment components and their weights. Total must equal 100%.</p>
                      </div>
                    </div>
                    {/* Live total badge */}
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border ${
                      weightValid
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${weightValid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      Total: {totalWeight.toFixed(totalWeight % 1 === 0 ? 0 : 1)}%
                      {weightValid ? ' ✓' : ' — must equal 100%'}
                    </span>
                  </div>

                  {/* Pass Mark */}
                  <div className="mb-6 grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Pass Mark (%)</label>
                      <input
                        type="number" min="0" max="100"
                        value={passMark}
                        onChange={(e) => setPassMark(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white text-sm"
                      />
                      <p className="text-xs text-slate-400">Minimum % to pass a subject — used on report cards.</p>
                    </div>
                  </div>

                  {/* Components table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                          <th className="px-4 py-3">Order</th>
                          <th className="px-4 py-3 w-full">Component Name</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">Weight (%)</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {gradingComponents.map((comp, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors group">
                            {editingCompIdx === idx ? (
                              <>
                                <td className="px-4 py-3 text-slate-400 text-xs font-medium">{idx + 1}</td>
                                <td className="px-4 py-3">
                                  <input
                                    autoFocus
                                    value={editingCompName}
                                    onChange={e => setEditingCompName(e.target.value)}
                                    className="w-full rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                                    placeholder="Component name"
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(idx); if (e.key === 'Escape') setEditingCompIdx(null); }}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number" min="0" max="100"
                                    value={editingCompWeight}
                                    onChange={e => setEditingCompWeight(e.target.value)}
                                    className="w-20 ml-auto block rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm text-right text-slate-900 outline-none focus:border-indigo-500"
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(idx); if (e.key === 'Escape') setEditingCompIdx(null); }}
                                  />
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <button onClick={() => handleSaveEdit(idx)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition mr-1.5">Save</button>
                                  <button onClick={() => setEditingCompIdx(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3">
                                  <div className="flex gap-0.5">
                                    <button onClick={() => handleMoveUp(idx)} disabled={idx === 0} title="Move up" className="rounded p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-0 disabled:pointer-events-none transition">▲</button>
                                    <button onClick={() => handleMoveDown(idx)} disabled={idx === gradingComponents.length - 1} title="Move down" className="rounded p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-0 disabled:pointer-events-none transition">▼</button>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-800">{comp.name}</td>
                                <td className="px-4 py-3 text-right">
                                  <span className="inline-block rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
                                    {comp.weight}%
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => handleStartEdit(idx)}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition mr-1.5"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComponent(idx)}
                                    className="rounded-lg border border-rose-100 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                        {gradingComponents.length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-4 py-8 text-center text-slate-400 text-sm">
                              No components defined. Add one below.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Add new component row */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end mb-6">
                    <div className="flex-1 space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">New Component Name</label>
                      <input
                        type="text"
                        value={newCompName}
                        onChange={e => setNewCompName(e.target.value)}
                        placeholder="e.g. Practical, Project, Oral Exam…"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                        onKeyDown={e => e.key === 'Enter' && handleAddComponent()}
                      />
                    </div>
                    <div className="sm:w-28 space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Weight (%)</label>
                      <input
                        type="number" min="0" max="100"
                        value={newCompWeight}
                        onChange={e => setNewCompWeight(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                        onKeyDown={e => e.key === 'Enter' && handleAddComponent()}
                      />
                    </div>
                    <button
                      onClick={handleAddComponent}
                      className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white hover:bg-slate-800 transition whitespace-nowrap flex-nowrap shrink-0 h-[46px] flex items-center justify-center"
                    >
                      + Add Component
                    </button>
                  </div>

                  {/* Save bar */}
                  <div className={`flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between rounded-xl px-5 py-4 border ${
                    weightValid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-100'
                  }`}>
                    <div>
                      <p className={`text-sm font-bold ${weightValid ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {weightValid
                          ? '✓ Ready to save — weights sum to exactly 100%'
                          : `Total is ${totalWeight.toFixed(1)}% — adjust weights until they equal 100%`}
                      </p>
                      {!weightValid && (
                        <p className="text-xs text-rose-600 mt-0.5">
                          {totalWeight < 100
                            ? `You need to add ${(100 - totalWeight).toFixed(1)}% more.`
                            : `You need to remove ${(totalWeight - 100).toFixed(1)}%.`}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleSaveWeights}
                      disabled={savingWeights || !weightValid}
                      className="rounded-xl bg-slate-900 text-white px-6 py-2.5 text-xs font-bold hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex-nowrap shrink-0 text-center"
                    >
                      {savingWeights ? 'Saving…' : 'Save Grading Structure'}
                    </button>
                  </div>
                </div>

              </div>
            )}



      

          </div>

        </div>
      </div>
    </SuperAdminLayout>
  );
}
