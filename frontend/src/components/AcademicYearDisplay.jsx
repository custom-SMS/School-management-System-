/**
 * AcademicYearDisplay
 * 
 * A simple display component showing the current active academic year.
 * Used for non-Super Admin users who cannot switch years.
 */

import { useAcademicYear } from '../context/AcademicYearContext';
import { Box, Typography } from '@mui/material';
import { CalendarToday as CalendarIcon } from '@mui/icons-material';

export default function AcademicYearDisplay() {
  const { activeYear, loading } = useAcademicYear();
  
  if (loading || !activeYear) {
    return null;
  }
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: 1,
        bgcolor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <CalendarIcon sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.7)' }} />
      <Typography
        variant="body2"
        sx={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontWeight: 500
        }}
      >
        {activeYear.year}
      </Typography>
    </Box>
  );
}
