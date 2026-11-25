import { test, expect } from '@playwright/test';

test('login screen switches to registration and records UI clicks', async ({ page }) => {
  await page.route('**/api/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ logged_in: false })
  }));

  await page.goto('/?rebunarTest=1');
  await expect(page.locator('.auth-screen')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'С возвращением' })).toBeVisible();

  await page.getByRole('button', { name: 'Нет аккаунта? Зарегистрироваться' }).click();
  await expect(page.getByRole('heading', { name: 'Создание аккаунта' })).toBeVisible();

  const report = await page.evaluate(() => window.__REBUNAR_TEST__?.snapshot());
  expect(report?.events.some(event => event.type === 'click')).toBeTruthy();
  expect(report?.errors).toHaveLength(0);
});

test('signed-in test user can open the store and add an app shortcut', async ({ page }) => {
  let meCalls = 0;
  await page.route('**/api/me', route => {
    meCalls += 1;
    const user = meCalls === 1
      ? { logged_in: false }
      : { logged_in: true, id: 1, username: 'e2e-user', display_name: 'E2E User' };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
  });
  await page.route('**/api/login', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true })
  }));
  await page.route('**/api/presence/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true })
  }));

  await page.goto('/?rebunarTest=1');
  await page.locator('#auth-username').fill('e2e-user');
  await page.locator('#auth-password').fill('test-password');
  await page.locator('.auth-submit').click();

  await expect(page.locator('.app-shell')).toBeVisible();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Магазин приложений' })).toBeVisible();

  const addButton = page.locator('[data-add-app="pinterest"]');
  await expect(addButton).toHaveText('Добавить на главный экран');
  await addButton.click();
  await expect(addButton).toHaveText('Добавлено');
  await expect(addButton).toBeDisabled();

  const report = await page.evaluate(() => window.__REBUNAR_TEST__?.snapshot());
  expect(report?.route).toBe('store');
  expect(report?.events.some(event => event.type === 'route' && event.path === 'store')).toBeTruthy();
  expect(report?.errors).toHaveLength(0);
});
