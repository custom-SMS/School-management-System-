import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PaymentForm from '../components/PaymentForm';

describe('PaymentForm Component', () => {
  const mockFees = [
    { _id: 'fee-1', amount: 500, description: 'Tuition Fee - Sep', month: 'September' },
    { _id: 'fee-2', amount: 300, description: 'Library Fee', month: 'September' },
  ];

  it('renders student details and unpaid fee options', () => {
    render(
      <PaymentForm
        studentName="John Doe"
        studentId="STU-001"
        unpaidFees={mockFees as any}
        initialFeeId="fee-1"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/STU-001/i)).toBeInTheDocument();
    expect(screen.getByText(/Tuition Fee - Sep/i)).toBeInTheDocument();
  });

  it('validates required fields before submitting', () => {
    const handleSubmit = vi.fn();
    render(
      <PaymentForm
        studentName="John Doe"
        studentId="STU-001"
        unpaidFees={mockFees as any}
        initialFeeId="fee-1"
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Submit for Verification/i });
    fireEvent.click(submitButton);

    // Errors should trigger and onSubmit should not be called with empty reference/bank
    expect(handleSubmit).not.toHaveBeenCalled();
  });
});
