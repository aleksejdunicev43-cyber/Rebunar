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
  const image = workspace.querySelector('.home-wallpaper-image');
  if (image) {
    if (wallpaperUrl) {
      image.src = wallpaperUrl;
      image.hidden = false;
    } else {
      image.removeAttribute('src');
      image.hidden = true;
    }
  }
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


function openWallpaperEditor(file, workspace) {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const source = new Image();
    source.onload = () => {
      const overlay = document.createElement('section');
      overlay.className = 'wallpaper-editor';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Редактирование обоев');
      overlay.innerHTML = '<div class="wallpaper-editor-panel">' +
        '<header class="wallpaper-editor-header"><button class="wallpaper-editor-cancel" type="button">Отмена</button><strong>Настройка обоев</strong><button class="wallpaper-editor-apply" type="button">Применить</button></header>' +
        '<div class="wallpaper-editor-preview-wrap"><div class="wallpaper-editor-preview"><img class="wallpaper-editor-source" alt=""><div class="wallpaper-editor-guide" aria-hidden="true"></div></div></div>' +
        '<div class="wallpaper-editor-tools"><p>Перемещай фото пальцем и меняй масштаб двумя пальцами</p><div class="wallpaper-editor-controls">' +
        '<button type="button" data-action="zoom-out" aria-label="Уменьшить">−</button><button type="button" data-action="zoom-in" aria-label="Увеличить">+</button>' +
        '<button type="button" data-action="rotate-left" aria-label="Повернуть влево">↶</button><button type="button" data-action="rotate-right" aria-label="Повернуть вправо">↷</button><button type="button" data-action="reset">Сбросить</button></div></div></div>';
      workspace.appendChild(overlay);
      const preview = overlay.querySelector('.wallpaper-editor-preview');
      const image = overlay.querySelector('.wallpaper-editor-source');
      image.src = sourceUrl;
      let zoom = 1, rotation = 0, offsetX = 0, offsetY = 0;
      const pointers = new Map();
      let dragOrigin = null, pinchOrigin = null;
      const updateTransform = () => {
        image.style.transform = 'translate(calc(-50% + ' + offsetX + 'px), calc(-50% + ' + offsetY + 'px)) rotate(' + rotation + 'deg) scale(' + zoom + ')';
      };
      const layout = () => {
        const rect = preview.getBoundingClientRect();
        const rotated = Math.abs(rotation % 180) === 90;
        const iw = rotated ? source.naturalHeight : source.naturalWidth;
        const ih = rotated ? source.naturalWidth : source.naturalHeight;
        const fit = Math.max(rect.width / iw, rect.height / ih);
        image.style.width = (source.naturalWidth * fit) + 'px';
        image.style.height = (source.naturalHeight * fit) + 'px';
        updateTransform();
      };
      const finish = value => {
        overlay.remove();
        URL.revokeObjectURL(sourceUrl);
        resolve(value);
      };
      overlay.querySelector('.wallpaper-editor-cancel').addEventListener('click', () => finish(null));
      overlay.querySelector('[data-action="zoom-out"]').addEventListener('click', () => { zoom = Math.max(.5, zoom / 1.18); updateTransform(); });
      overlay.querySelector('[data-action="zoom-in"]').addEventListener('click', () => { zoom = Math.min(4, zoom * 1.18); updateTransform(); });
      overlay.querySelector('[data-action="rotate-left"]').addEventListener('click', () => { rotation -= 90; layout(); });
      overlay.querySelector('[data-action="rotate-right"]').addEventListener('click', () => { rotation += 90; layout(); });
      overlay.querySelector('[data-action="reset"]').addEventListener('click', () => { zoom = 1; rotation = 0; offsetX = 0; offsetY = 0; layout(); });
      preview.addEventListener('pointerdown', event => {
        event.preventDefault();
        preview.setPointerCapture(event.pointerId);
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size === 1) dragOrigin = { x: event.clientX, y: event.clientY, offsetX, offsetY };
        else if (pointers.size === 2) {
          const pts = [...pointers.values()];
          pinchOrigin = { distance: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), zoom };
        }
      });
      preview.addEventListener('pointermove', event => {
        if (!pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size === 1 && dragOrigin) {
          offsetX = dragOrigin.offsetX + event.clientX - dragOrigin.x;
          offsetY = dragOrigin.offsetY + event.clientY - dragOrigin.y;
          updateTransform();
        } else if (pointers.size === 2 && pinchOrigin) {
          const pts = [...pointers.values()];
          const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          zoom = Math.max(.5, Math.min(4, pinchOrigin.zoom * distance / Math.max(1, pinchOrigin.distance)));
          updateTransform();
        }
      });
      const releasePointer = event => {
        pointers.delete(event.pointerId);
        if (pointers.size < 2) pinchOrigin = null;
        if (pointers.size === 1) {
          const p = [...pointers.values()][0];
          dragOrigin = { x: p.x, y: p.y, offsetX, offsetY };
        } else dragOrigin = null;
      };
      preview.addEventListener('pointerup', releasePointer);
      preview.addEventListener('pointercancel', releasePointer);
      overlay.querySelector('.wallpaper-editor-apply').addEventListener('click', () => {
        const rect = preview.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 2, 4096 / Math.max(rect.width, rect.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(rect.width * ratio));
        canvas.height = Math.max(1, Math.round(rect.height * ratio));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#071b15';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const rotated = Math.abs(rotation % 180) === 90;
        const fit = rotated
          ? Math.max(rect.width / source.naturalHeight, rect.height / source.naturalWidth)
          : Math.max(rect.width / source.naturalWidth, rect.height / source.naturalHeight);
        ctx.save();
        ctx.translate(canvas.width / 2 + offsetX * ratio, canvas.height / 2 + offsetY * ratio);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.scale(fit * zoom * ratio, fit * zoom * ratio);
        ctx.drawImage(source, -source.naturalWidth / 2, -source.naturalHeight / 2);
        ctx.restore();
        canvas.toBlob(blob => {
          if (!blob) { showWallpaperMessage(workspace, 'Не удалось подготовить изображение.', true); return; }
          finish(blob);
        }, 'image/jpeg', .94);
      });
      layout();
    };
    source.onerror = () => { URL.revokeObjectURL(sourceUrl); reject(new Error('Не удалось открыть это изображение.')); };
    source.src = sourceUrl;
  });
}

export function renderHomeScreen(outlet) {
  const shell = outlet.closest('.app-shell');
  shell?.classList.add('home-workspace-active');

  outlet.innerHTML = '';
  const host = shell || outlet;
  host.querySelector(':scope > .home-workspace')?.remove();
  host.insertAdjacentHTML('beforeend', `
    <section class="home-workspace" aria-label="Главный экран Rebunar">
      <img class="home-wallpaper-image" alt="" aria-hidden="true" hidden>
      <input class="home-wallpaper-input" type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        aria-label="Выбрать обои из галереи">
      <button class="home-wallpaper-picker" type="button" hidden>
        <span aria-hidden="true">▧</span>
        <span>Выбрать фото</span>
      </button>
      <div class="home-wallpaper-status" role="status" aria-live="polite"></div>
    </section>
  `);

  const workspace = host.querySelector(':scope > .home-workspace');
  const fileInput = workspace.querySelector('.home-wallpaper-input');
  const pickerButton = workspace.querySelector('.home-wallpaper-picker');
  let holdTimer = null;
  let holdTriggered = false;
  let pointerStart = null;

  const hidePicker = () => {
    pickerButton.hidden = true;
  };

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
      const bounds = workspace.getBoundingClientRect();
      const left = Math.min(Math.max(event.clientX - bounds.left, 18), bounds.width - 150);
      const top = Math.min(Math.max(event.clientY - bounds.top, 18), bounds.height - 58);
      pickerButton.style.left = `${left}px`;
      pickerButton.style.top = `${top}px`;
      pickerButton.hidden = false;
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

  pickerButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    hidePicker();
    // The gallery opens from this explicit tap, preserving Android's user gesture.
    fileInput.click();
  });

  workspace.addEventListener('contextmenu', event => event.preventDefault());

  workspace.addEventListener('click', event => {
    if (!event.target.closest('.home-wallpaper-picker') && !pickerButton.hidden) {
      hidePicker();
    }
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

    showWallpaperMessage(workspace, '');
    try {
      const edited = await openWallpaperEditor(file, workspace);
      if (!edited) return;
      showWallpaperMessage(workspace, 'Сохраняю обои…');
      await writeWallpaper(edited);
      applyWallpaper(workspace, edited);
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
