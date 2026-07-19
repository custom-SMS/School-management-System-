import { useEffect, useState } from 'react';
import { useParentChildrenQuery } from '../queries/parentQueries';

const STORAGE_KEY = 'parent.selectedChildId';

/**
 * Fetches /stats/parent/me and manages the currently-selected child.
 * Each parent page calls this; selection persists in localStorage so it stays
 * consistent as the parent navigates between Dashboard / Academics / Attendance / Finance.
 */
export function useParentChildren() {
  const { data, isLoading: loading, error: queryError } = useParentChildrenQuery();
  const children = data?.children || [];
  const [childId, setChildIdState] = useState(() => localStorage.getItem(STORAGE_KEY) || '');

  useEffect(() => {
    if (children.length > 0) {
      setChildIdState((cur) => {
        const valid = children.find((k) => (k.profile?._id || k.profile?.id) === cur);
        return valid ? cur : (children[0]?.profile?._id || children[0]?.profile?.id || '');
      });
    }
  }, [children]);

  const error = queryError ? queryError.response?.data?.message || 'Failed to load children.' : '';

  const setChildId = (id) => {
    setChildIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const selectedChild = children.find((k) => (k.profile?._id || k.profile?.id) === childId) || children[0] || null;

  return { children, childId: childId || (selectedChild ? selectedChild.profile?._id || selectedChild.profile?.id : ''), setChildId, selectedChild, loading, error };
}
