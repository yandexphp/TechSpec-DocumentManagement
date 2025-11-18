import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLogin } from '../../../features/auth/hooks/useLogin';
import { renderWithProviders } from '../../../test/utils';
import LoginPage from '../ui/LoginPage';

vi.mock('../../../features/auth/hooks/useLogin', () => ({
  useLogin: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('../../../features/auth/hooks/useRegister', () => ({
  useRegister: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../../../features/auth/hooks/useCheckNickname', () => ({
  useCheckNickname: () => ({
    data: { available: true },
    isLoading: false,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../shared/store/theme.store', () => ({
  useThemeStore: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form', async () => {
    renderWithProviders(<LoginPage />);

    await waitFor(
      () => {
        const emailInput = screen.getByRole('textbox', { name: /email/i });
        expect(emailInput).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    await waitFor(
      () => {
        const passwordInputs = screen.getAllByLabelText(/пароль/i);
        const passwordInput = passwordInputs.find(
          (input) => input.getAttribute('type') === 'password'
        );
        expect(passwordInput).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should switch to registration form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await waitFor(
      () => {
        expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const registrationTab = screen.getByRole('tab', { name: /регистрация/i });
    await user.click(registrationTab);

    await waitFor(
      () => {
        expect(screen.getByRole('textbox', { name: /никнейм/i })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should submit login form', async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();

    (useLogin as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      mutate,
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      status: 'idle',
      data: undefined,
      error: null,
      reset: vi.fn(),
      mutateAsync: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
      variables: undefined,
    }));

    renderWithProviders(<LoginPage />);

    await waitFor(
      () => {
        expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInputs = screen.getAllByLabelText(/пароль/i);
    const passwordInput = passwordInputs.find(
      (input) => input.getAttribute('type') === 'password'
    ) as HTMLInputElement;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    expect(mutate).toHaveBeenCalled();
  });
});
