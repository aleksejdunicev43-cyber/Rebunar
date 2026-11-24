/**
 * REBUNAR — HOME WORKSPACE
 * Чистый домашний экран с пользовательскими обоями.
 */

const DB_NAME = 'rebunar-home-workspace';
const STORE_NAME = 'wallpapers';
const WALLPAPER_KEY = 'home';
let wallpaperUrl = null;

function openWallpaperDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Хранилище обоев недоступно в этом браузере.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Не удалось открыть хранилище обоев.'));
  });
}

async function readWallpaper() {
  const db = await openWallpaperDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(WALLPAPER_KEY);
    request.onsuccess = () => { db.close(); resolve(request.result || null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

async function writeWallpaper(blob) {
  const db = await openWallpaperDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(blob, WALLPAPER_KEY);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error('Сохранение отменено.')); };
  });
}

async function deleteWallpaper() {
  const db = await openWallpaperDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(WALLPAPER_KEY);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

function applyWallpaper(workspace, blob) {
  if (wallpaperUrl) URL.revokeObjectURL(wallpaperUrl);
  wallpaperUrl = blob ? URL.createObjectURL(blob) : null;
  if (wallpaperUrl) {
    workspace.style.setProperty('--home-wallpaper-image', `url("${wallpaperUrl}")`);
    workspace.classList.add('has-wallpaper');
  } else {
    workspace.style.removeProperty('--home-wallpaper-image');
    workspace.classList.remove('has-wallpaper');
  }
  workspace.querySelector('[data-action="reset-wallpaper"]').hidden = !blob;
}

function showWallpaperMessage(workspace, message, isError = false) {
  const status = workspace.querySelector('.home-wallpaper-status');
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}

export function renderHomeScreen(outlet) {
  const shell = outlet.closest('.app-shell');
  shell?.classList.add('home-workspace-active');

  outlet.innerHTML = `
    <section class="home-workspace" aria-label="Главный экран Rebunar">
      <div class="home-workspace-glow" aria-hidden="true"></div>
      <div class="home-workspace-top">
        <div class="home-workspace-brand">
          <span class="home-workspace-mark">R</span>
          <span>REBUNAR</span>
        </div>
        <div class="home-wallpaper-controls">
          <button type="button" class="home-wallpaper-button" data-action="choose-wallpaper">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2-2h2l1.5-2h5L16 5h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12" r="3.5"/></svg>
            <span>Обои</span>
          </button>
          <button type="button" class="home-wallpaper-reset" data-action="reset-wallpaper" hidden>Сбросить</button>
        </div>
      </div>

      <input class="home-wallpaper-input" type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Выбрать изображение для обоев">

      <div class="home-workspace-center">
        <div class="home-workspace-empty-mark" aria-hidden="true"><span></span></div>
        <p class="home-workspace-caption">ТВОЁ ПРОСТРАНСТВО</p>
      </div>

      <div class="home-workspace-bottom">
        <p class="home-wallpaper-status" role="status">Установи собственные обои и создай свой экран Rebunar.</p>
        <span class="home-workspace-version">REBUNAR HOME</span>
      </div>
    </section>
  `;

  const workspace = outlet.querySelector('.home-workspace');
  const fileInput = workspace.querySelector('.home-wallpaper-input');

  workspace.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    if (button.dataset.action === 'choose-wallpaper') {
      fileInput.click();
      return;
    }

    if (button.dataset.action === 'reset-wallpaper') {
      button.disabled = true;
      try {
        await deleteWallpaper();
        applyWallpaper(workspace, null);
        showWallpaperMessage(workspace, 'Обои сброшены. Можно выбрать другое изображение.');
      } catch (error) {
        showWallpaperMessage(workspace, error.message || 'Не удалось сбросить обои.', true);
      } finally {
        button.disabled = false;
      }
    }
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      showWallpaperMessage(workspace, 'Выбери изображение JPG, PNG, WebP или AVIF.', true);
      fileInput.value = '';
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      showWallpaperMessage(workspace, 'Изображение слишком большое. Максимальный размер — 12 МБ.', true);
      fileInput.value = '';
      return;
    }

    showWallpaperMessage(workspace, 'Сохраняю обои…');
    try {
      await writeWallpaper(file);
      applyWallpaper(workspace, file);
      showWallpaperMessage(workspace, 'Обои установлены и сохранены на этом устройстве.');
    } catch (error) {
      showWallpaperMessage(workspace, error.message || 'Не удалось сохранить изображение.', true);
    } finally {
      fileInput.value = '';
    }
  });

  readWallpaper()
    .then(blob => { if (blob) applyWallpaper(workspace, blob); })
    .catch(error => showWallpaperMessage(workspace, error.message || 'Не удалось загрузить сохранённые обои.', true));
}
