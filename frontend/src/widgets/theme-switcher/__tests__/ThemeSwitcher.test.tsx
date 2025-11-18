import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as themeStore from '../../../shared/store/theme.store';
import { renderWithProviders } from '../../../test/utils';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';

vi.mock('../../../shared/store/theme.store', () => ({
  useThemeStore: vi.fn(() => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
  })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ThemeSwitcher', () => {
  it('should render theme switcher', () => {
    renderWithProviders(<ThemeSwitcher />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should toggle theme on click', async () => {
    const user = userEvent.setup();
    const toggleTheme = vi.fn();

    vi.mocked(themeStore.useThemeStore).mockReturnValueOnce({
      theme: 'dark',
      toggleTheme,
    } as ReturnType<typeof themeStore.useThemeStore>);

    renderWithProviders(<ThemeSwitcher />);

    await user.click(screen.getByRole('button'));

    expect(toggleTheme).toHaveBeenCalled();
  });
});
