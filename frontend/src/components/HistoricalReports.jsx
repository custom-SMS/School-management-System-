/**
 * HistoricalReports
 * 
 * A component for accessing historical data across academic years.
 * Provides read-only access to previous years' data for authorized users.
 */

import { useState } from 'react';
import { useAcademicYear } from '../context/AcademicYearContext';
import { Box, Card, CardContent, CardHeader, CardTitle, FormControl, InputLabel, Select, MenuItem, Typography, Alert } from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';

export default function HistoricalReports({ children, title = 'Historical Reports' }) {
  const { years, activeYear } = useAcademicYear();
  const [selectedYearId, setSelectedYearId] = useState(null);
  const [isHistoricalView, setIsHistoricalView] = useState(false);
  
  const handleYearChange = (event) => {
    const yearId = event.target.value;
    setSelectedYearId(yearId);
    setIsHistoricalView(yearId !== activeYear?.id);
  };
  
  const selectedYear = years.find(y => y.id === selectedYearId);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HistoryIcon />
          <Typography variant="h6">{title}</Typography>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Select Academic Year</InputLabel>
          <Select
            value={selectedYearId || activeYear?.id}
            onChange={handleYearChange}
            label="Select Academic Year"
          >
            {years.map(year => (
              <MenuItem key={year.id} value={year.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Typography>{year.year}</Typography>
                  {year.isActive && (
                    <Typography variant="caption" sx={{ ml: 2, color: 'success.main' }}>
                      (Current)
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {isHistoricalView && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              You are viewing historical data from {selectedYear?.year}. This data is read-only.
            </Typography>
          </Alert>
        )}
        
        {selectedYearId && (
          <Box>
            {typeof children === 'function' 
              ? children({ yearId: selectedYearId, year: selectedYear, isHistorical: isHistoricalView })
              : children
            }
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
