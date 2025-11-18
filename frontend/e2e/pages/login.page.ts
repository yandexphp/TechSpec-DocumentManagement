import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async navigate(): Promise<void> {
    await this.page.addInitScript(() => {
      localStorage.setItem('locale', 'en');
    });
    await this.page.goto('/login');
    await this.waitForPageLoad();
    await this.ensureEnglishLanguage();
  }

  async ensureEnglishLanguage(): Promise<void> {
    try {
      const languageSwitcher = this.getLanguageSwitcher();
      await languageSwitcher.waitFor({ state: 'visible', timeout: 10000 });
      const currentLang = await this.getCurrentLanguage();
      if (!currentLang.match(/eng|англ|en/i)) {
        await this.selectLanguage('en');
        await this.page.waitForTimeout(1000);
      }
    } catch (error) {
      console.warn('Failed to ensure English language:', error);
    }
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector('form', { timeout: 15000 });
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.warn('⚠️ networkidle state was not reached within 10s');
    });
  }

  getEmailField(): Locator {
    return this.page.getByRole('textbox', { name: /email/i });
  }

  getPasswordField(): Locator {
    return this.page.getByRole('textbox', { name: /password|пароль/i });
  }

  getLoginButton(): Locator {
    return this.page.locator('form button[type="submit"]').first();
  }

  getPasswordVisibilityToggle(): Locator {
    return this.page.getByRole('button', { name: /показать пароль|show password/i });
  }

  getLanguageSwitcher(): Locator {
    return this.page.locator('div[role="combobox"]').first();
  }

  async selectLanguage(language: 'ru' | 'en' | 'kz'): Promise<void> {
    const switcher = this.getLanguageSwitcher();
    await switcher.waitFor({ state: 'visible', timeout: 15000 });
    await switcher.click();
    await this.page.waitForTimeout(500);

    const menu = this.page.locator('[role="listbox"]');
    await menu.waitFor({ state: 'visible', timeout: 5000 });

    const allOptions = this.page.locator('[role="option"]');
    await allOptions.first().waitFor({ state: 'visible', timeout: 5000 });

    const languageIndex: Record<'ru' | 'en' | 'kz', number> = { ru: 0, en: 1, kz: 2 };
    const menuItem = allOptions.nth(languageIndex[language]);

    await menuItem.waitFor({ state: 'visible', timeout: 5000 });
    await menuItem.click();
    await this.page.waitForTimeout(1000);
  }

  async getCurrentLanguage(): Promise<string> {
    const switcher = this.getLanguageSwitcher();
    await switcher.waitFor({ state: 'visible', timeout: 15000 });
    return switcher.textContent().then((text) => text?.trim() || '');
  }

  async fillEmail(email: string): Promise<void> {
    const emailField = this.getEmailField();
    await emailField.waitFor({ state: 'visible', timeout: 15000 });
    await emailField.clear();
    await emailField.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    const passwordField = this.getPasswordField();
    await passwordField.waitFor({ state: 'visible', timeout: 15000 });
    await passwordField.clear();
    await passwordField.fill(password);
  }

  async togglePasswordVisibility(): Promise<void> {
    const toggle = this.getPasswordVisibilityToggle();
    await toggle.waitFor({ state: 'visible', timeout: 15000 });
    await toggle.click();
    await this.page.waitForTimeout(300);
  }

  async submitLoginForm(): Promise<void> {
    const loginButton = this.getLoginButton();
    await loginButton.waitFor({ state: 'visible', timeout: 15000 });
    await loginButton.click();
  }
}
