import { useEffect, useState } from 'react';
import axios from '../api/axios';

const STORAGE_KEY = 'parent.selectedChildId';

/**
 * Fetches /stats/parent/me and manages the currently-selected child.
 * Each parent page calls this; selection persists in localStorage so it stays
 * consistent as the parent navigates between Dashboard / Academics / Attendance / Finance.
 */
export function useParentChildren() {
  const [children, setChildren] = useState([]);
  const [childId, setChildIdState] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    axios
      .get('/stats/parent/me')
      .then((r) => {
        if (!active) return;
        const kids = r.data?.children || [];
        setChildren(kids);
        setChildIdState((cur) => {
          const valid = kids.find((k) => (k.profile?._id || k.profile?.id) === cur);
          return valid ? cur : (kids[0]?.profile?._id || kids[0]?.profile?.id || '');
        });
      })
      .catch((e) => active && setError(e.response?.data?.message || 'Failed to load children.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const setChildId = (id) => {
    setChildIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const selectedChild = children.find((k) => (k.profile?._id || k.profile?.id) === childId) || children[0] || null;

  return { children, childId: childId || (selectedChild ? selectedChild.profile?._id || selectedChild.profile?.id : ''), setChildId, selectedChild, loading, error };
}
