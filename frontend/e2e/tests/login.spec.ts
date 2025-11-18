import { expect, test } from '@playwright/test';

import { LoginPage } from '../pages/login.page';

test.describe('Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test('should load login page', async ({ page }) => {
    await expect(page).toHaveTitle(/TechSpec Storage/i, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('should display login form with email field', async () => {
    const emailField = loginPage.getEmailField();
    await expect(emailField).toBeVisible({ timeout: 15000 });
    await expect(emailField).toHaveAttribute('type', 'email');
  });

  test('should display login form with password field', async () => {
    const passwordField = loginPage.getPasswordField();
    await expect(passwordField).toBeVisible({ timeout: 15000 });
    await expect(passwordField).toHaveAttribute('type', 'password');
  });

  test('should display login button', async () => {
    const loginButton = loginPage.getLoginButton();
    await expect(loginButton).toBeVisible({ timeout: 15000 });
    await expect(loginButton).toBeEnabled();
  });

  test('should allow typing in email field', async () => {
    const testEmail = 'test@example.com';
    await loginPage.fillEmail(testEmail);
    const emailField = loginPage.getEmailField();
    await expect(emailField).toHaveValue(testEmail);
  });

  test('should allow typing in password field', async () => {
    const testPassword = 'password123';
    await loginPage.fillPassword(testPassword);
    const passwordField = loginPage.getPasswordField();
    await expect(passwordField).toHaveValue(testPassword);
  });

  test('should display password visibility toggle', async () => {
    const toggleButton = loginPage.getPasswordVisibilityToggle();
    await expect(toggleButton).toBeVisible({ timeout: 15000 });
  });

  test('should toggle password visibility', async () => {
    const testPassword = 'password123';
    await loginPage.fillPassword(testPassword);

    let passwordField = loginPage.getPasswordField();
    await expect(passwordField).toHaveAttribute('type', 'password');

    await loginPage.togglePasswordVisibility();
    passwordField = loginPage.getPasswordField();
    await expect(passwordField).toHaveAttribute('type', 'text');

    await loginPage.togglePasswordVisibility();
    passwordField = loginPage.getPasswordField();
    await expect(passwordField).toHaveAttribute('type', 'password');
  });
});
