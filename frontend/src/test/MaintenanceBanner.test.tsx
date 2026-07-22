import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MaintenanceBanner from '../components/MaintenanceBanner';
import { useMaintenance } from '../context/MaintenanceContext';

// Mock MaintenanceContext hook
vi.mock('../context/MaintenanceContext', () => ({
  useMaintenance: vi.fn(),
}));

describe('MaintenanceBanner Component', () => {
  it('should render nothing when maintenance is not active', () => {
    (useMaintenance as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      maintenanceBroadcast: { active: false, message: '' },
      loading: false,
    });

    const { container } = render(<MaintenanceBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should render banner with broadcast message when active', () => {
    (useMaintenance as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      maintenanceBroadcast: { active: true, message: 'System under maintenance' },
      loading: false,
    });

    render(<MaintenanceBanner />);
    expect(screen.getByText('System under maintenance')).toBeInTheDocument();
  });
});
