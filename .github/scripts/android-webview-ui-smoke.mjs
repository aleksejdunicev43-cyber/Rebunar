import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const output = 'test-results/android';
await fs.mkdir(output, { recursive: true });

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const contexts = browser.contexts();
  assert.ok(contexts.length, 'Android WebView exposed no browser context');
  const pages = contexts.flatMap(context => context.pages());
  const page = pages.find(candidate => candidate.url().includes('rebunar.pythonanywhere.com'));
  assert.ok(page, `Rebunar page not found. Open pages: ${pages.map(p => p.url()).join(', ')}`);

  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  await page.locator('.auth-screen').waitFor({ state: 'visible', timeout: 45000 });
  await page.getByRole('heading', { name: 'С возвращением' }).waitFor({ state: 'visible', timeout: 15000 });

  const initial = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    readyState: document.readyState,
    bodyText: document.body.innerText.slice(0, 5000),
    viewport: { width: innerWidth, height: innerHeight },
    documentHeight: document.documentElement.scrollHeight
  }));
  await fs.writeFile(`${output}/webview-before.json`, JSON.stringify(initial, null, 2));
  await page.screenshot({ path: `${output}/rebunar-screen-before.png`, fullPage: true });

  await page.getByRole('button', { name: 'Нет аккаунта? Зарегистрироваться' }).click();
  await page.getByRole('heading', { name: 'Создание аккаунта' }).waitFor({ state: 'visible', timeout: 15000 });
  await page.screenshot({ path: `${output}/rebunar-screen-registration.png`, fullPage: true });

  const after = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    bodyText: document.body.innerText.slice(0, 5000),
    activeElement: document.activeElement?.outerHTML?.slice(0, 500)
  }));
  await fs.writeFile(`${output}/webview-after.json`, JSON.stringify(after, null, 2));
  await fs.writeFile(`${output}/webview-console-errors.txt`, runtimeErrors.join('\n'));
  assert.deepEqual(runtimeErrors, [], `WebView JavaScript errors: ${runtimeErrors.join('; ')}`);
  console.log('ANDROID_WEBVIEW_UI_OK');
  console.log(JSON.stringify({ initial, after }, null, 2));
} finally {
  await browser.close();
}
