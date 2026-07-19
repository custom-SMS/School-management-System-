/**
 * AcademicYearSwitcher
 *
 * For Super Admin:
 * - "View" a historical year (sets viewYear in context, injects header) without changing the globally active year
 * - "Activate" a year to make it globally active for everyone
 * Shows a distinct "Historical View" badge when viewing a non-active year.
 */

import { useState } from 'react';
import { useAcademicYear } from '../context/AcademicYearContext';
import {
  Box, Button, Menu, MenuItem, Chip, Typography, Divider, Tooltip
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Visibility as ViewIcon,
  CheckCircle as ActivateIcon,
  History as HistoryIcon
} from '@mui/icons-material';

export default function AcademicYearSwitcher() {
  const {
    activeYear, years, switchYear, setViewYear, resetViewYear,
    canSwitchYear, loading, viewYear, isViewingHistory, selectedYear
  } = useAcademicYear();
  const [anchorEl, setAnchorEl] = useState(null);
  const [switching, setSwitching] = useState(null);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleView = (year) => {
    setViewYear(year);
    handleClose();
  };

  const handleActivate = async (yearId) => {
    setSwitching(yearId);
    const result = await switchYear(yearId);
    setSwitching(null);
    if (result.ok) handleClose();
  };

  if (!canSwitchYear || loading || !activeYear) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Historical view badge */}
      {isViewingHistory && (
        <Tooltip title="Click to return to current active year">
          <Chip
            icon={<HistoryIcon sx={{ fontSize: 14 }} />}
            label="Historical View"
            size="small"
            onClick={resetViewYear}
            sx={{
              bgcolor: 'rgba(251, 191, 36, 0.2)',
              color: '#fbbf24',
              border: '1px solid rgba(251, 191, 36, 0.4)',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: 700,
              '&:hover': { bgcolor: 'rgba(251, 191, 36, 0.3)' }
            }}
          />
        </Tooltip>
      )}

      <Button
        variant="outlined"
        size="small"
        onClick={handleClick}
        endIcon={<ArrowDownIcon />}
        sx={{
          borderColor: isViewingHistory ? 'rgba(251, 191, 36, 0.5)' : 'rgba(255, 255, 255, 0.3)',
          color: isViewingHistory ? '#fbbf24' : 'white',
          '&:hover': {
            borderColor: isViewingHistory ? 'rgba(251, 191, 36, 0.7)' : 'rgba(255, 255, 255, 0.5)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)'
          }
        }}
      >
        <CalendarIcon sx={{ mr: 1, fontSize: 18 }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {selectedYear?.year || activeYear.year}
        </Typography>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 280,
            maxHeight: 500,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="caption" sx={{
            color: 'text.secondary', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: 0.8
          }}>
            Academic Years
          </Typography>
        </Box>
        <Divider />

        {years.map((year) => {
          const isActive = year.id === activeYear?.id;
          const isViewing = year.id === viewYear?.id;
          return (
            <MenuItem
              key={year.id}
              disableRipple
              sx={{
                px: 2, py: 1.5,
                bgcolor: isViewing
                  ? 'rgba(251, 191, 36, 0.08)'
                  : isActive ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                '&:hover': {
                  bgcolor: isViewing ? 'rgba(251, 191, 36, 0.15)' : 'action.hover'
                }
              }}
            >
              <Box sx={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', width: '100%', gap: 1
              }}>
                {/* Year label + status chip */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: isActive || isViewing ? 700 : 400 }}>
                    {year.year}
                  </Typography>
                  {isActive && (
                    <Chip size="small" label="Active" color="success"
                      sx={{ height: 18, fontSize: '0.65rem' }} />
                  )}
                  {isViewing && !isActive && (
                    <Chip size="small" label="Viewing"
                      sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#fbbf24', color: '#1a1a1a' }} />
                  )}
                </Box>

                {/* Action buttons */}
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                  {!isViewing && (
                    <Tooltip title="View this year's data without changing the active year">
                      <Box
                        component="button"
                        onClick={(e) => { e.stopPropagation(); handleView(year); }}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.5,
                          px: 1, py: 0.5, borderRadius: 1,
                          border: '1px solid rgba(0,0,0,0.12)',
                          bgcolor: 'transparent', cursor: 'pointer',
                          fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' }
                        }}
                      >
                        <ViewIcon sx={{ fontSize: 12 }} />
                        View
                      </Box>
                    </Tooltip>
                  )}
                  {!isActive && (
                    <Tooltip title="Set as the globally active year for all users">
                      <Box
                        component="button"
                        onClick={(e) => { e.stopPropagation(); handleActivate(year.id); }}
                        disabled={switching === year.id}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.5,
                          px: 1, py: 0.5, borderRadius: 1,
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          bgcolor: 'rgba(16, 185, 129, 0.08)', cursor: 'pointer',
                          fontSize: '0.7rem', fontWeight: 600, color: '#059669',
                          '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.15)' },
                          '&:disabled': { opacity: 0.5, cursor: 'not-allowed' }
                        }}
                      >
                        <ActivateIcon sx={{ fontSize: 12 }} />
                        {switching === year.id ? '…' : 'Activate'}
                      </Box>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </MenuItem>
          );
        })}

        {/* Return to active year */}
        {isViewingHistory && (
          <>
            <Divider />
            <MenuItem onClick={resetViewYear} sx={{ py: 1.5, color: 'text.secondary' }}>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                ↩ Return to current active year ({activeYear?.year})
              </Typography>
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
}
