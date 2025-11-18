import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as authContext from '../../../features/auth/model/authContext';
import { renderWithProviders } from '../../../test/utils';
import { UserProfile } from '../ui/UserProfile';

vi.mock('../../../features/auth/model/authContext', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: {
      userId: 'user-123',
      email: 'test@example.com',
      nickname: 'testuser',
      avatarUrl: null,
    },
    data: {
      userId: 'user-123',
      email: 'test@example.com',
      nickname: 'testuser',
      avatarUrl: null,
    },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('UserProfile', () => {
  it('should render user profile', () => {
    renderWithProviders(<UserProfile />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('should display avatar with first letter when no avatarUrl', () => {
    renderWithProviders(<UserProfile />);

    const avatar = screen.getByText('T');
    expect(avatar).toBeInTheDocument();
  });

  it('should render null when user is not available', () => {
    (authContext.useAuth as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      isAuthenticated: false,
      user: null,
      data: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    const { container } = renderWithProviders(<UserProfile />);
    expect(container.firstChild).toBeNull();
  });
});
