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
      <input class="home-wallpaper-input" type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        aria-label="Выбрать обои из галереи">
      <div class="home-wallpaper-status" role="status" aria-live="polite"></div>
    </section>
  `;

  const workspace = outlet.querySelector('.home-workspace');
  const fileInput = workspace.querySelector('.home-wallpaper-input');
  let holdTimer = null;
  let holdTriggered = false;
  let pointerStart = null;

  const clearHold = () => {
    if (holdTimer) window.clearTimeout(holdTimer);
    holdTimer = null;
    pointerStart = null;
  };

  workspace.addEventListener('pointerdown', event => {
    if (event.target.closest('button, input, a')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    clearHold();
    holdTriggered = false;
    pointerStart = { x: event.clientX, y: event.clientY };
    holdTimer = window.setTimeout(() => {
      holdTriggered = true;
      fileInput.click();
    }, 550);
  });

  workspace.addEventListener('pointermove', event => {
    if (!pointerStart) return;
    if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 12) {
      clearHold();
    }
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
    workspace.addEventListener(type, clearHold);
  });

  workspace.addEventListener('contextmenu', event => event.preventDefault());

  workspace.addEventListener('click', event => {
    if (holdTriggered) {
      event.preventDefault();
      event.stopPropagation();
      holdTriggered = false;
    }
  }, true);

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
      showWallpaperMessage(workspace, 'Обои установлены.');
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
