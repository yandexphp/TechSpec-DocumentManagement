import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUpdateProfile } from '../../../features/auth/hooks/useUpdateProfile';
import { renderWithProviders } from '../../../test/utils';
import ProfilePage from '../ui/ProfilePage';

vi.mock('../../../features/auth/model/authContext', () => ({
  useAuth: () => ({
    data: {
      userId: 'user-123',
      email: 'test@example.com',
      nickname: 'testuser',
      avatarUrl: null,
    },
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../../../features/auth/hooks/useUpdateProfile', () => ({
  useUpdateProfile: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: undefined,
    variables: undefined,
    reset: vi.fn(),
    mutateAsync: vi.fn(),
    status: 'idle',
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isIdle: true,
    isPaused: false,
    submittedAt: 0,
  })),
}));

vi.mock('../../../features/auth/hooks/useCheckNickname', () => ({
  useCheckNickname: vi.fn(() => ({
    data: { available: true },
    isLoading: false,
    isFetching: false,
  })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render profile form', async () => {
    renderWithProviders(<ProfilePage />);

    await waitFor(
      () => {
        expect(screen.getByRole('textbox', { name: /никнейм/i })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should update nickname', async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();

    (useUpdateProfile as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      mutate,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
      data: undefined,
      variables: undefined,
      reset: vi.fn(),
      mutateAsync: vi.fn(),
      status: 'idle',
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      submittedAt: 0,
    }));

    renderWithProviders(<ProfilePage />);

    await waitFor(
      () => {
        expect(screen.getByRole('textbox', { name: /никнейм/i })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const nicknameInput = screen.getByRole('textbox', { name: /никнейм/i });

    await user.clear(nicknameInput);

    await user.type(nicknameInput, 'newnickname');

    await waitFor(
      () => {
        expect(nicknameInput).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const form = nicknameInput.closest('form') as HTMLFormElement;
    expect(form).toBeInTheDocument();

    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(mutate).toHaveBeenCalled();
      },
      { timeout: 5000 }
    );
  });

  it('should upload avatar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await waitFor(
      () => {
        expect(screen.getByRole('textbox', { name: /никнейм/i })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;

    expect(fileInput).toBeInTheDocument();
    await user.upload(fileInput, file);

    expect(fileInput.files?.[0]).toBe(file);
  });
});
