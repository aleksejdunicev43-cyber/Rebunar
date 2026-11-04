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
  frameAssets: [],
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

async function captureFrameGalleries() {
  const galleryPage = await context.newPage();
  await galleryPage.setViewportSize({ width: 1440, height: 1100 });
  await galleryPage.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const frameCards = Array.from({ length: 13 }, (_, index) => {
    const number = index + 1;
    const src = baseURL.replace(/\/new$/, '') + '/new/assets/frames/rebunar_avatar_' + number + '.png';
    return `<article class="card">
      <div class="preview">
        <div class="avatar"></div>
        <img src="${src}" alt="Рамка ${number}" data-frame="${number}">
      </div>
      <div class="label">Рамка ${number}</div>
    </article>`;
  }).join('');

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
    <title>Rebunar — проверка 13 рамок</title>
    <style>
      *{box-sizing:border-box}body{margin:0;padding:28px;background:#101317;color:#f1f3f5;font:16px Arial,sans-serif}
      h1{margin:0 0 8px;font-size:28px}p{margin:0 0 24px;color:#aab2bc}
      .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
      .card{min-height:220px;padding:16px;border:1px solid #39424c;border-radius:14px;background:#1b2026;text-align:center}
      .preview{position:relative;width:150px;height:150px;margin:0 auto 12px}
      .avatar{position:absolute;left:25%;top:25%;width:50%;height:50%;border-radius:50%;background:linear-gradient(135deg,#526273,#202833);border:2px solid #7c8997}
      img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
      .label{font-weight:700;letter-spacing:.04em}
      @media(max-width:600px){body{padding:14px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.card{padding:10px;min-height:185px}.preview{width:132px;height:132px}}
    </style></head><body><h1>13 рамок Rebunar</h1>
    <p>Все изображения показаны поверх одинакового круглого аватара для проверки прозрачности, центровки и формы.</p>
    <main class="grid">${frameCards}</main></body></html>`;

  await galleryPage.setContent(html, { waitUntil: 'load' });
  await galleryPage.waitForFunction(() => [...document.querySelectorAll('img[data-frame]')].every(img => img.complete));
  report.frameVisuals = await galleryPage.locator('img[data-frame]').evaluateAll(images =>
    images.map(img => ({ frame: Number(img.dataset.frame), loaded: img.naturalWidth > 0, width: img.naturalWidth, height: img.naturalHeight }))
  );
  await galleryPage.screenshot({ path: path.join(outputDir, '09-frames-gallery-desktop.png'), fullPage: true });
  report.screenshots.push(path.join(outputDir, '09-frames-gallery-desktop.png'));

  await galleryPage.setViewportSize({ width: 390, height: 844 });
  await galleryPage.screenshot({ path: path.join(outputDir, '10-frames-gallery-mobile.png'), fullPage: true });
  report.screenshots.push(path.join(outputDir, '10-frames-gallery-mobile.png'));
  await galleryPage.close();
}

try {
  const response = await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
  if (!response || !response.ok()) throw new Error('Сайт вернул HTTP ' + (response?.status() ?? 'нет ответа'));
  await page.waitForTimeout(1200);
  await screenshot('01-auth-mobile');

  // Проверяем все PNG рамки по публичным URL, не изменяя данные аккаунтов.
  for (let i = 1; i <= 13; i++) {
    const url = baseURL.replace(/\/new$/, '') + '/new/assets/frames/rebunar_avatar_' + i + '.png';
    const assetResponse = await context.request.get(url, { timeout: 30000 });
    report.frameAssets.push({ frame: i, status: assetResponse.status(), ok: assetResponse.ok() });
  }

  // Визуально показываем все 13 рамок поверх круглого аватара, а не только проверяем HTTP.
  await captureFrameGalleries();

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
if (report.frameAssets.some(asset => !asset.ok)) process.exitCode = 1;
if (report.pageErrors.length) process.exitCode = 1;
