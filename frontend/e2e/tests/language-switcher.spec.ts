import { expect, test } from '@playwright/test';

import { LoginPage } from '../pages/login.page';

test.describe('Language Switcher', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test('should switch language from English to Russian', async () => {
    const languageSwitcher = loginPage.getLanguageSwitcher();
    await expect(languageSwitcher).toBeVisible({ timeout: 15000 });

    const initialLanguage = await loginPage.getCurrentLanguage();
    console.log('Initial language:', initialLanguage);
    expect(initialLanguage).toMatch(/eng|англ|en/i);

    await loginPage.selectLanguage('ru');
    await loginPage.page.waitForTimeout(1000);

    const loginButton = loginPage.getLoginButton();
    await expect(loginButton).toBeVisible({ timeout: 15000 });

    const buttonText = await loginButton.textContent();
    console.log('Button text after switch:', buttonText);
    expect(buttonText).toMatch(/войти/i);
    expect(buttonText).not.toMatch(/sign in/i);
  });

  test('should display login form in Russian after switching', async () => {
    await loginPage.selectLanguage('ru');
    await loginPage.page.waitForTimeout(1500);

    const emailField = loginPage.getEmailField();
    await expect(emailField).toBeVisible({ timeout: 15000 });

    const passwordField = loginPage.getPasswordField();
    await expect(passwordField).toBeVisible({ timeout: 15000 });

    const loginButton = loginPage.getLoginButton();
    await expect(loginButton).toBeVisible({ timeout: 15000 });

    const buttonText = await loginButton.textContent();
    expect(buttonText).toMatch(/войти/i);
  });
});
