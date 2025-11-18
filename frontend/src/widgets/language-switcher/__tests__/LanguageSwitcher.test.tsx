import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as i18nStore from '../../../shared/store/i18n.store';
import { renderWithProviders } from '../../../test/utils';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

vi.mock('../../../shared/store/i18n.store', () => ({
  useI18nStore: vi.fn(() => ({
    language: 'ru',
    setLanguage: vi.fn(),
  })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('LanguageSwitcher', () => {
  it('should render language switcher', () => {
    renderWithProviders(<LanguageSwitcher />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should change language on select', async () => {
    const user = userEvent.setup();
    const setLanguage = vi.fn();

    vi.mocked(i18nStore.useI18nStore).mockReturnValue({
      language: 'ru',
      setLanguage,
    } as ReturnType<typeof i18nStore.useI18nStore>);

    renderWithProviders(<LanguageSwitcher />);

    const select = screen.getByRole('combobox');
    await user.click(select);
    await user.click(screen.getByText('Англ'));

    expect(setLanguage).toHaveBeenCalledWith('en');
  });
});
