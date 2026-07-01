const prisma = require('../prisma');
const { logActivity } = require('../middleware/auditLogger');

// Default values for each settings category. Stored values are merged over these so
// new fields added later automatically get a sensible default.
const DEFAULTS = {
  security: {
    sessionTimeout: '30',
    passwordComplexity: 'Institutional Standard (8+ chars)',
    twoFactor: true,
  },
  notifications: {
    gradeAlerts: true,
    receiptSummaries: true,
    maintenanceBroadcasts: false,
  },
  localization: {
    currency: 'ETB Ethiopian Birr',
    timezone: '(GMT+03:00) East Africa Time - Addis Ababa',
    dateFormat: 'DD/MM/YYYY (Day-Month-Year)',
    calendarType: 'Ethiopian Calendar (EC)',
  },
  branding: {
    institutionNameEn: 'National Academy of Addis Ababa',
    institutionNameAm: 'ብሔራዊ የአዲስ አበባ አካዳሚ',
    brandColor: '#080845',
    headerTitle: 'Institutional Excellence Dashboard',
    logo: '', // URL of the uploaded institution logo (e.g. /uploads/<file>)
  },
  grading: {
    gpaEnabled: false,
    passMark: 50,
  },
};

const CATEGORIES = Object.keys(DEFAULTS);

// @desc    Get all system settings (merged with defaults)
// @route   GET /api/settings
// @access  Private (SuperAdmin)
const getSettings = async (req, res) => {
  try {
    const rows = await prisma.systemSetting.findMany();
    const stored = {};
    rows.forEach((row) => { stored[row.key] = row.value; });

    const result = {};
    CATEGORIES.forEach((cat) => {
      result[cat] = { ...DEFAULTS[cat], ...(stored[cat] || {}) };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update one or more settings categories
// @route   PUT /api/settings
// @access  Private (SuperAdmin)
const updateSettings = async (req, res) => {
  try {
    const incoming = req.body || {};
    const categoriesToUpdate = CATEGORIES.filter((cat) => incoming[cat] !== undefined);

    if (categoriesToUpdate.length === 0) {
      return res.status(400).json({ message: 'No valid settings categories provided.' });
    }

    await Promise.all(
      categoriesToUpdate.map((cat) => {
        // Merge over defaults to keep the stored object complete and consistent.
        const value = { ...DEFAULTS[cat], ...(incoming[cat] || {}) };
        return prisma.systemSetting.upsert({
          where: { key: cat },
          update: { value },
          create: { key: cat, value },
        });
      })
    );

    await logActivity(
      req.user._id,
      'Update System Settings',
      null,
      `Updated settings: ${categoriesToUpdate.join(', ')}`
    );

    // Return the fresh merged settings.
    const rows = await prisma.systemSetting.findMany();
    const stored = {};
    rows.forEach((row) => { stored[row.key] = row.value; });
    const result = {};
    CATEGORIES.forEach((cat) => {
      result[cat] = { ...DEFAULTS[cat], ...(stored[cat] || {}) };
    });

    res.status(200).json({ message: 'Settings saved successfully.', settings: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get public settings used by role-based portals (branding, grading,
//          localization, and maintenance/banner-safe notifications)
// @route   GET /api/settings/public
// @access  Public
const getPublicSettings = async (req, res) => {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: ['grading', 'branding', 'localization', 'notifications'] } }
    });
    const stored = {};
    rows.forEach((row) => { stored[row.key] = row.value; });

    // Expose only the portal-safe subset needed by student/parent UIs.
    const result = {
      grading: { ...DEFAULTS.grading, ...(stored.grading || {}) },
      branding: { ...DEFAULTS.branding, ...(stored.branding || {}) },
      localization: { ...DEFAULTS.localization, ...(stored.localization || {}) },
      notifications: {
        maintenanceBroadcasts: stored.notifications?.maintenanceBroadcasts ?? DEFAULTS.notifications.maintenanceBroadcasts,
      },
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getSettings, updateSettings, getPublicSettings };
