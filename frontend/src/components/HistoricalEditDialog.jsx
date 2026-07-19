/**
 * HistoricalEditDialog
 *
 * Two-step confirmation dialog for SuperAdmin historical data edits.
 * Step 1: Data integrity warning — user must acknowledge before proceeding.
 * Step 2: Reason input + confirm — fetches a short-lived edit token from the backend.
 *
 * Usage:
 *   <HistoricalEditDialog
 *     isOpen={open}
 *     onClose={() => setOpen(false)}
 *     onConfirm={({ reason, editToken }) => doSomethingWithToken(editToken)}
 *     yearLabel="2024/2025"
 *     targetData={{ recordId: '...' }}
 *   />
 */

import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, AlertTitle, Typography, Box, CircularProgress, Stepper, Step, StepLabel
} from '@mui/material';
import { Warning as WarningIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from '../api/axios';
import { toast } from 'react-toastify';

const steps = ['Acknowledge Warning', 'Provide Reason'];

export default function HistoricalEditDialog({ isOpen, onClose, onConfirm, targetData, yearLabel }) {
  const [activeStep, setActiveStep] = useState(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    // Reset state on close
    setActiveStep(0);
    setReason('');
    onClose();
  };

  const handleFirstStep = () => setActiveStep(1);

  const handleConfirm = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      toast.error('Please provide a detailed reason (at least 10 characters).');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('/academic-years/confirm-historical-edit', {
        reason: reason.trim(),
        targetData
      });
      const { editToken } = response.data;
      await onConfirm({ reason: reason.trim(), editToken });
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm historical edit.');
    } finally {
      setLoading(false);
    }
  };

  const isReasonValid = reason.trim().length >= 10;

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box
          sx={{
            width: 36, height: 36, borderRadius: '50%',
            bgcolor: 'rgba(234, 88, 12, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}
        >
          <WarningIcon sx={{ color: '#ea580c', fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Historical Data Edit
          </Typography>
          {yearLabel && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Academic Year: {yearLabel}
            </Typography>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 1 — Warning */}
        {activeStep === 0 && (
          <Alert severity="warning" icon={<WarningIcon />} sx={{ borderRadius: 2 }}>
            <AlertTitle sx={{ fontWeight: 700 }}>Data Integrity Warning</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              You are about to edit <strong>historical data</strong>
              {yearLabel ? ` from academic year "${yearLabel}"` : ''}.
            </Typography>
            <Typography variant="body2">
              This action is <strong>permanently logged</strong> in the audit trail with your identity,
              timestamp, and reason. Historical edits should only be made to correct genuine data errors.
            </Typography>
          </Alert>
        )}

        {/* Step 2 — Reason */}
        {activeStep === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                An edit token valid for <strong>15 minutes</strong> will be issued.
                All changes made with this token will be permanently logged.
              </Typography>
            </Alert>
            <TextField
              id="historical-edit-reason"
              fullWidth
              multiline
              rows={4}
              label="Reason for Edit *"
              placeholder="Describe clearly why this historical record needs to be corrected (e.g., data entry error in Grade 10A Math score for Semester 1)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              error={reason.length > 0 && !isReasonValid}
              helperText={
                reason.length > 0 && !isReasonValid
                  ? `${10 - reason.trim().length} more characters required`
                  : `${reason.trim().length} / 10 minimum characters`
              }
              InputProps={{
                startAdornment: <EditIcon sx={{ color: 'text.secondary', mr: 1, alignSelf: 'flex-start', mt: 1 }} />
              }}
            />
            <Typography variant="caption" color="text.secondary">
              This reason will appear in the audit log alongside your name and timestamp.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          color="inherit"
          disabled={loading}
          sx={{ borderRadius: 2 }}
        >
          Cancel
        </Button>
        {activeStep === 0 ? (
          <Button
            onClick={handleFirstStep}
            variant="contained"
            color="warning"
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            I Understand — Continue
          </Button>
        ) : (
          <Button
            id="historical-edit-confirm-btn"
            onClick={handleConfirm}
            variant="contained"
            color="primary"
            disabled={loading || !isReasonValid}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {loading ? 'Confirming…' : 'Confirm Edit'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
