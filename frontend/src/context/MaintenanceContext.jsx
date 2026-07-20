import { createContext, useContext, useState, useEffect } from 'react';
import axios from '../api/axios';

const MaintenanceContext = createContext(null);

export const MaintenanceProvider = ({ children }) => {
  const [maintenanceBroadcast, setMaintenanceBroadcast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/settings');
        const settings = res.data || {};
        if (settings.notifications?.maintenanceBroadcasts && settings.notifications?.maintenanceMessage) {
          setMaintenanceBroadcast({
            message: settings.notifications.maintenanceMessage,
            active: true
          });
        } else {
          setMaintenanceBroadcast(null);
        }
      } catch (err) {
        console.error('Failed to fetch maintenance settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return (
    <MaintenanceContext.Provider value={{ maintenanceBroadcast, loading }}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenance must be used within MaintenanceProvider');
  }
  return context;
};
