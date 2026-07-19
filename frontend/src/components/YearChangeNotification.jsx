/**
 * YearChangeNotification
 * 
 * A component that displays a notification when the academic year changes.
 * Automatically detects year changes and notifies users.
 */

import { useEffect, useState, useRef } from 'react';
import { useAcademicYear } from '../context/AcademicYearContext';
import { toast } from 'react-toastify';

export default function YearChangeNotification() {
  const { activeYear } = useAcademicYear();
  const [previousYear, setPreviousYear] = useState(null);
  const hasNotified = useRef(false);
  
  useEffect(() => {
    if (previousYear && activeYear && previousYear.id !== activeYear.id) {
      // Year has changed
      if (!hasNotified.current) {
        toast.info(
          `Academic year changed from ${previousYear.year} to ${activeYear.year}`,
          {
            autoClose: 8000,
            position: 'top-center',
            onClick: () => window.location.reload()
          }
        );
        hasNotified.current = true;
        
        // Reset notification flag after 10 seconds
        setTimeout(() => {
          hasNotified.current = false;
        }, 10000);
      }
    }
    
    setPreviousYear(activeYear);
  }, [activeYear, previousYear]);
  
  return null;
}
