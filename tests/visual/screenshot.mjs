import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = (process.env.REBUNAR_BASE_URL || 'https://rebunar.pythonanywhere.com/new').replace(/\/$/, '');
const outputDir = 'artifacts/visual';
await fs.mkdir(outputDir, { recursive: true });

const report = {
  baseURL,
  startedAt: new Date().toISOString(),
  screenshots: [],
  avatarGeometry: [],
  pageErrors: [],
  consoleErrors: [],
  authenticated: false,
  notes: [],
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

page.on('pageerror', error => report.pageErrors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') report.consoleErrors.push(message.text());
});

async function screenshot(name) {
  const file = path.join(outputDir, name + '.png');
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  report.screenshots.push(file);
}

async function openRoute(route, name, selector) {
  const button = page.locator(selector || '[data-route="' + route + '"]').filter({ visible: true }).first();
  if (await button.count()) {
    await button.click();
    await page.waitForTimeout(900);
    await screenshot(name);
    return true;
  }
  report.notes.push('Не найдена кнопка перехода: ' + route);
  return false;
}


try {
  const response = await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
  if (!response || !response.ok()) throw new Error('Сайт вернул HTTP ' + (response?.status() ?? 'нет ответа'));
  await page.waitForTimeout(1200);
  await screenshot('01-auth-mobile');


  const username = process.env.REBUNAR_TEST_USERNAME;
  const password = process.env.REBUNAR_TEST_PASSWORD;

  if (username && password) {
    await page.locator('#auth-username').fill(username);
    await page.locator('#auth-password').fill(password);
    await page.locator('.auth-submit').click();
    await page.waitForSelector('.app-shell', { timeout: 30000 });
    report.authenticated = true;
    await page.waitForTimeout(1500);

    await screenshot('02-home-mobile');
    await openRoute('profile', '03-profile-mobile', '.header-profile-button');
    await openRoute('users', '04-users-mobile', '.profile-users-button');
    await openRoute('communities', '05-communities-mobile');
    await openRoute('messages', '06-messages-mobile');

    // Дополнительные десктопные снимки ключевых экранов.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openRoute('home', '07-home-desktop');
    await openRoute('profile', '08-profile-desktop', '.header-profile-button');
  } else {
    report.notes.push('Не заданы GitHub Secrets REBUNAR_TEST_USERNAME и REBUNAR_TEST_PASSWORD. Сделан снимок экрана входа; приватные разделы пропущены без создания или изменения аккаунтов.');
  }
} catch (error) {
  report.fatalError = error.stack || error.message;
  try { await screenshot('99-error-state'); } catch {}
} finally {
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
if (report.fatalError) process.exitCode = 1;
if (report.avatarGeometry.some(item => Math.abs(item.width - item.height) > 1 || item.borderRadius === '0px')) process.exitCode = 1;
if (report.pageErrors.length) process.exitCode = 1;
