import { navigate } from '../../app/router.js';
import { subscribeToAuth } from '../auth/session.js';

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

async function fetchHomeSettings() {
  const response = await fetch('/api/home/settings', { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Не удалось получить настройки аккаунта.');
  return response.json();
}

async function uploadAccountWallpaper(blob) {
  const form = new FormData();
  form.append('wallpaper', blob, 'rebunar-home-wallpaper.jpg');
  const response = await fetch('/api/home/wallpaper', {
    method: 'POST',
    credentials: 'same-origin',
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Не удалось сохранить обои в аккаунте.');
  return data;
}

async function syncAccountHomeLayout(workspace) {
  try {
    const settings = await fetchHomeSettings();
    if (!settings.logged_in || !workspace.isConnected) return;
    if (settings.layout && !homeLayoutTouched) {
      localStorage.setItem(HOME_LAYOUT_KEY, JSON.stringify(settings.layout));
      workspace.querySelector('.home-app-launcher')?.remove();
      renderHomeAppLauncher(workspace);
    } else if (!settings.layout && !homeLayoutTouched) {
      const localLayout = localStorage.getItem(HOME_LAYOUT_KEY);
      if (localLayout) {
        const response = await fetch('/api/home/layout', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ layout: JSON.parse(localLayout) })
        });
        if (!response.ok) console.warn('Rebunar: не удалось перенести раскладку в аккаунт.');
      }
    }
  } catch (error) {
    console.warn('Rebunar: не удалось синхронизировать рабочий стол.', error);
  }
}

async function loadAccountWallpaper(workspace) {
  try {
    const settings = await fetchHomeSettings();
    if (settings.logged_in && settings.wallpaper_url) {
      const response = await fetch(settings.wallpaper_url, { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error('Не удалось загрузить обои аккаунта.');
      const blob = await response.blob();
      await writeWallpaper(blob);
      applyWallpaper(workspace, blob);
      return;
    }
    const localBlob = await readWallpaper();
    if (localBlob) {
      applyWallpaper(workspace, localBlob);
      if (settings.logged_in) {
        showWallpaperMessage(workspace, 'Эти обои сохранены только на этом устройстве. Выбери их заново, чтобы синхронизировать.');
      }
    }
  } catch (error) {
    const localBlob = await readWallpaper().catch(() => null);
    if (localBlob) applyWallpaper(workspace, localBlob);
    showWallpaperMessage(workspace, error.message || 'Не удалось загрузить настройки аккаунта.', true);
  }
}

function openWallpaperSourcePicker(workspace, fileInput) {
  return new Promise(resolve => {
    const overlay = document.createElement('section');
    overlay.className = 'wallpaper-source-picker';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Выбор обоев');
    overlay.innerHTML = '<header class="wallpaper-source-header"><button type="button" class="wallpaper-source-close" aria-label="Закрыть">×</button><strong>Обои</strong><span></span></header>' +
      '<div class="wallpaper-source-preview"><div class="wallpaper-source-preview-image"></div><span>Предпросмотр обоев</span></div>' +
      '<div class="wallpaper-source-bottom"><button type="button" data-source="screenshots"><span class="wallpaper-source-icon">▧</span><strong>Скриншоты</strong></button><button type="button" data-source="photos"><span class="wallpaper-source-icon">▣</span><strong>Фото</strong></button></div>';
    workspace.appendChild(overlay);
    const preview = overlay.querySelector('.wallpaper-source-preview-image');
    if (wallpaperUrl) preview.style.backgroundImage = 'url("' + wallpaperUrl + '")';
    const finish = value => { overlay.remove(); resolve(value); };
    overlay.querySelector('.wallpaper-source-close').addEventListener('click', () => finish(null));
    overlay.addEventListener('click', event => {
      const sourceButton = event.target.closest('[data-source]');
      if (!sourceButton) return;
      // Android opens its native image picker; the user can choose the Screenshots
      // or Photos album there. Keep this click directly tied to the user gesture.
      finish(sourceButton.dataset.source);
      fileInput.click();
    });
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


const HOME_APPS = [
  {id:'games',name:'Игры',icon:'🎮',color:'#315b47',route:'store'},
  {id:'video',name:'Видео',icon:'▶',color:'#74434c',route:'creators'},
  {id:'music',name:'Музыка',icon:'♫',color:'#554b7a',route:null},
  {id:'books',name:'Книги',icon:'📚',color:'#66533b',route:'reader'},
  {id:'chats',name:'Чаты',icon:'✉',color:'#315b72',route:'messages'},
  {id:'store',name:'Магазин',icon:'◈',color:'#6b4c37',route:'store'},
  {id:'anime',name:'Аниме',icon:'✦',color:'#67466f',route:null},
  {id:'communities',name:'Сообщества',icon:'♧',color:'#38634d',route:'communities'},
  {id:'photos',name:'Фото',icon:'▧',color:'#5c5275',route:'favorites'},
  {id:'files',name:'Файлы',icon:'▤',color:'#4a6170',route:null},
  {id:'maps',name:'Карты',icon:'⌖',color:'#456b58',route:null},
  {id:'browser',name:'Браузер',icon:'◎',color:'#3d6274',route:null},
  {id:'news',name:'Новости',icon:'▥',color:'#66503d',route:'notifications'},
  {id:'users',name:'Люди',icon:'♙',color:'#536b54',route:'users'},
  {id:'profile',name:'Профиль',icon:'◉',color:'#624d70',route:'profile'},
  {id:'mail',name:'Почта',icon:'✉',color:'#4c6377',route:'mail'},
  {id:'search',name:'Поиск',icon:'⌕',color:'#426b5a',route:'search'},
  {id:'alerts',name:'Уведомления',icon:'♢',color:'#765448',route:'notifications'},
  {id:'stats',name:'Статистика',icon:'▥',color:'#405e78',route:'statistics'},
  {id:'settings',name:'Настройки',icon:'⚙',color:'#52665a',route:'settings'},
  {id:'creator',name:'Авторы',icon:'✎',color:'#76516b',route:'creators'},
  {id:'reader',name:'Читалка',icon:'▣',color:'#5c6141',route:'reader'},
  {id:'favorites',name:'Избранное',icon:'♡',color:'#744b55',route:'favorites'},
  {id:'social',name:'Лента',icon:'⌁',color:'#3e6a63',route:'communities'},
  {id:'cloud',name:'Облако',icon:'☁',color:'#526b7a',route:null},
  {id:'calendar',name:'Календарь',icon:'▦',color:'#6a5842',route:null},
  {id:'wallet',name:'Кошелёк',icon:'◇',color:'#536b49',route:null},
  {id:'translate',name:'Переводчик',icon:'文',color:'#4d5d7b',route:null},
  {id:'camera',name:'Камера',icon:'◉',color:'#68516a',route:null},
  {id:'more',name:'Ещё',icon:'＋',color:'#426b52',route:'settings'}
];
const HOME_DOCK_DEFAULT = ['dock-home','dock-messages','dock-search','dock-favorites','dock-profile'];
const HOME_DOCK_APPS = [
  {id:'dock-home',name:'Главная',icon:'⌂',color:'#286b48',route:'home'},
  {id:'dock-messages',name:'Чаты',icon:'✉',color:'#315b72',route:'messages'},
  {id:'dock-search',name:'Поиск',icon:'⌕',color:'#426b5a',route:'search'},
  {id:'dock-favorites',name:'Избранное',icon:'♡',color:'#744b55',route:'favorites'},
  {id:'dock-profile',name:'Профиль',icon:'◉',color:'#624d70',route:'profile'}
];
const HOME_LAYOUT_KEY = 'rebunar-home-app-layout-v1';
let homeLayoutTouched = false;
const HOME_CUSTOM_APPS_KEY = 'rebunar-home-custom-apps-v1';
const HOME_REMOVED_APPS_KEY = 'rebunar-home-removed-apps-v1';
const HOME_FAVORITES_KEY = 'rebunar-home-favorites-v1';
const HOME_RECENTS_KEY = 'rebunar-home-recents-v1';

function readHomeIds(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter(id => typeof id === 'string') : [];
  } catch { return []; }
}
function writeHomeIds(key, ids) {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch {}
}

function loadRemovedHomeApps() {
  try {
    const ids = JSON.parse(localStorage.getItem(HOME_REMOVED_APPS_KEY) || '[]');
    return Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : [];
  } catch { return []; }
}
function saveRemovedHomeApps(ids) {
  try { localStorage.setItem(HOME_REMOVED_APPS_KEY, JSON.stringify([...ids])); } catch {}
}

function loadCustomHomeApps() {
  const allowedApps = new Set(['pinterest', 'chatgpt']);
  try {
    const stored = JSON.parse(localStorage.getItem(HOME_CUSTOM_APPS_KEY) || '[]');
    const apps = Array.isArray(stored)
      ? stored.filter(app => app && allowedApps.has(app.id) && typeof app.url === 'string')
      : [];
    // Remove legacy/demo shortcuts saved by older store versions.
    if (!Array.isArray(stored) || apps.length !== stored.length) {
      localStorage.setItem(HOME_CUSTOM_APPS_KEY, JSON.stringify(apps));
    }
    return apps;
  } catch {
    try { localStorage.setItem(HOME_CUSTOM_APPS_KEY, '[]'); } catch {}
    return [];
  }
}
const HOME_MAX_PAGES = 10;

function loadHomeAppLayout() {
  const removed = new Set(loadRemovedHomeApps());
  const gridDefault = HOME_APPS.map(app => app.id).filter(id => !removed.has(id));
  try {
    const saved = JSON.parse(localStorage.getItem(HOME_LAYOUT_KEY) || 'null');
    if (saved && Array.isArray(saved.dock)) {
      const pages = Array.isArray(saved.pages) ? saved.pages
        : Array.isArray(saved.grid) ? [saved.grid] : [gridDefault];
      const customIds = loadCustomHomeApps().map(app => app.id).filter(id => !removed.has(id));
      const dockDefaults = HOME_DOCK_DEFAULT.filter(id => !removed.has(id));
      const all = new Set([...gridDefault, ...dockDefaults, ...customIds]);
      const normalized = pages.slice(0, HOME_MAX_PAGES).map(page => Array.from({length:30}, (_, i) => all.has(page?.[i]) ? page[i] : null));
      if (!normalized.length) normalized.push(Array(30).fill(null));
      const dock = Array.from({length:5}, (_, i) => all.has(saved.dock[i]) ? saved.dock[i] : null);
      const seen = new Set();
      for (const page of normalized) {
        for (let i=0;i<page.length;i++) {
          const id=page[i];
          if (id && seen.has(id)) page[i]=null;
          else if (id) seen.add(id);
        }
      }
      for (let i=0;i<dock.length;i++) {
        if (dock[i] && seen.has(dock[i])) dock[i]=null;
        else if (dock[i]) seen.add(dock[i]);
      }
      const placed = new Set([...normalized.flat(), ...dock].filter(Boolean));
      const missing = [...gridDefault, ...dockDefaults, ...customIds].filter(id => !placed.has(id));
      for (const id of missing) {
        let pageIndex = normalized.findIndex(page => page.includes(null));
        if (pageIndex < 0) { normalized.push(Array(30).fill(null)); pageIndex=normalized.length-1; }
        normalized[pageIndex][normalized[pageIndex].indexOf(null)] = id;
      }
      while (normalized.length > 1 && !normalized[normalized.length - 1].some(Boolean)) normalized.pop();
      return {pages:normalized, dock};
    }
  } catch {}
  const pages = [gridDefault.concat(Array(30-gridDefault.length).fill(null))];
  for (const id of loadCustomHomeApps().map(app => app.id).filter(id => !removed.has(id))) {
    if (pages.some(page => page.includes(id))) continue;
    let pageIndex = pages.findIndex(page => page.includes(null));
    if (pageIndex < 0) {
      if (pages.length >= HOME_MAX_PAGES) break;
      pages.push(Array(30).fill(null));
      pageIndex = pages.length - 1;
    }
    const emptyIndex = pages[pageIndex].indexOf(null);
    if (emptyIndex >= 0) pages[pageIndex][emptyIndex] = id;
  }
  return {pages, dock:HOME_DOCK_DEFAULT.slice()};
}

function renderHomeAppLauncher(workspace) {
  const launcher = document.createElement('section');
  launcher.className = 'home-app-launcher';
  launcher.setAttribute('aria-label', 'Приложения');
  launcher.innerHTML = '<div class="home-app-pages"></div><div class="home-app-page-indicators" aria-label="Страницы"></div><div class="home-app-dock" aria-label="Нижняя панель приложений"></div>';
  workspace.appendChild(launcher);
  const pagesHost = launcher.querySelector('.home-app-pages');
  const indicators = launcher.querySelector('.home-app-page-indicators');
  const dock = launcher.querySelector('.home-app-dock');
  const layout = loadHomeAppLayout();
  const removedApps = new Set(loadRemovedHomeApps());
  const headerActions = workspace.closest('.app-shell')?.querySelector('.header-actions');
  let trashButton = headerActions?.querySelector('.home-app-trash');
  if (headerActions && !trashButton) {
    trashButton = document.createElement('button');
    trashButton.type = 'button';
    trashButton.className = 'home-app-trash';
    trashButton.setAttribute('aria-label', 'Удалить приложение');
    trashButton.title = 'Перетащите сюда, чтобы убрать с главного экрана';
    trashButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/></svg>';
    headerActions.appendChild(trashButton);
  }
  const appById = new Map([...HOME_APPS, ...HOME_DOCK_APPS, ...loadCustomHomeApps()].map(app => [app.id, app]));
  const launchApp = app => {
    if (!app) return;
    writeHomeIds(HOME_RECENTS_KEY, [app.id, ...readHomeIds(HOME_RECENTS_KEY).filter(id => id !== app.id)].slice(0, 12));
    const target = app.url || (app.id === 'pinterest' ? 'https://www.pinterest.com/' : '');
    if (target) {
      let url;
      try { url = new URL(target, window.location.href); } catch { return; }
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
      if (window.AndroidBrowser && typeof window.AndroidBrowser.open === 'function') {
        window.AndroidBrowser.open(url.href, app.name || 'Приложение');
      } else {
        const opened = window.open(url.href, '_blank', 'noopener,noreferrer');
        if (!opened) window.location.assign(url.href);
      }
      return;
    }
    if (app.route) navigate(app.route);
  };
  let currentPage = 0;
  let holdTimer = null;
  let pendingStart = null;
  let activeDrag = null;
  let edgeTimer = null;
  let edgeDirection = 0;
  let suppressClick = false;
  let swipeStart = null;

  const pageHasApps = index => Boolean(layout.pages[index]?.some(Boolean));
  const compactEmptyPages = () => {
    for(let i=layout.pages.length-1;i>0;i--){
      if(!pageHasApps(i)){
        layout.pages.splice(i,1);
        if(currentPage>i) currentPage--;
      }
    }
    currentPage=Math.min(currentPage,layout.pages.length-1);
  };
  const save = () => {
    const encoded = JSON.stringify(layout);
    try { localStorage.setItem(HOME_LAYOUT_KEY, encoded); } catch {}
    homeLayoutTouched = true;
    fetch('/api/home/layout', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout })
    }).then(response => {
      if (!response.ok && response.status !== 401) {
        console.warn('Rebunar: не удалось синхронизировать расположение приложений.');
      }
    }).catch(error => console.warn('Rebunar: синхронизация рабочего стола недоступна.', error));
  };
  const createSlot = (zone, index, id, pageIndex=0) => {
    const slot = document.createElement('div');
    slot.className = 'home-app-slot' + (id ? '' : ' is-empty');
    slot.dataset.zone = zone;
    slot.dataset.index = String(index);
    if (zone === 'grid') slot.dataset.page = String(pageIndex);
    if (!id) { slot.setAttribute('aria-label', 'Свободное место'); return slot; }
    const app = appById.get(id);
    if (!app) return slot;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'home-app-button';
    button.dataset.appId = id;
    button.style.setProperty('--app-icon-color', app.color);
    button.setAttribute('aria-label', app.name);
    button.innerHTML = '<span class="home-app-icon" aria-hidden="true"></span><span class="home-app-name"></span>';
    if (app.id === 'pinterest') {
      button.querySelector('.home-app-icon').innerHTML = '<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true" style="display:block"><circle cx="32" cy="32" r="32" fill="#E60023"/><text x="32" y="47" text-anchor="middle" font-family="Georgia,serif" font-size="49" font-weight="bold" fill="#fff">P</text></svg>';
    } else {
      button.querySelector('.home-app-icon').textContent = app.icon;
    }
    button.querySelector('.home-app-name').textContent = app.name;
    slot.appendChild(button);
    return slot;
  };
  const renderIndicators = () => {
    indicators.replaceChildren(...layout.pages.map((_, index) => {
      const button=document.createElement('button');
      button.type='button';
      button.className='home-app-page-dot'+(index===currentPage?' is-active':'');
      button.setAttribute('aria-label','Страница '+(index+1));
      button.addEventListener('click',()=>showPage(index));
      return button;
    }));
  };
  const showPage = index => {
    currentPage=Math.max(0,Math.min(index,layout.pages.length-1));
    pagesHost.style.transform='translateX(-'+(currentPage*100)+'%)';
    renderIndicators();
  };
  const paint = () => {
    pagesHost.replaceChildren(...layout.pages.map((page,pageIndex)=>{
      const grid=document.createElement('div');
      grid.className='home-app-grid';
      grid.dataset.page=String(pageIndex);
      grid.setAttribute('aria-label','Страница приложений '+(pageIndex+1));
      grid.append(...page.map((id,index)=>createSlot('grid',index,id,pageIndex)));
      return grid;
    }));
    dock.replaceChildren(...layout.dock.map((id,index)=>createSlot('dock',index,id)));
    showPage(currentPage);
  };
  window.addEventListener('rebunar-home-app-added', event => {
    if (!launcher.isConnected) return;
    const app = event.detail;
    if (!app || typeof app.id !== 'string') return;
    removedApps.delete(app.id);
    saveRemovedHomeApps(removedApps);
    appById.set(app.id, app);
    if (![...layout.pages.flat(), ...layout.dock].includes(app.id)) {
      let pageIndex = layout.pages.findIndex(page => page.includes(null));
      if (pageIndex < 0 && layout.pages.length < HOME_MAX_PAGES) {
        layout.pages.push(Array(30).fill(null));
        pageIndex = layout.pages.length - 1;
      }
      if (pageIndex >= 0) {
        const emptyIndex = layout.pages[pageIndex].indexOf(null);
        if (emptyIndex >= 0) layout.pages[pageIndex][emptyIndex] = app.id;
      }
    }
    save();
    paint();
  });
  const ensurePage = index => {
    if(index < 0 || index >= HOME_MAX_PAGES) return false;
    while(layout.pages.length<=index) {
      const previous=layout.pages[layout.pages.length-1];
      if(!previous?.some(Boolean)) return false;
      layout.pages.push(Array(30).fill(null));
    }
    paint(); save();
    return true;
  };
  const clearEdgeTimer = () => {
    if(edgeTimer) clearTimeout(edgeTimer);
    edgeTimer=null; edgeDirection=0;
  };
  const clearDrag = () => {
    if(holdTimer) clearTimeout(holdTimer);
    holdTimer=null; pendingStart=null; clearEdgeTimer();
    if(activeDrag?.button) activeDrag.button.style.visibility='';
    activeDrag?.ghost?.remove();
    launcher.classList.remove('is-dragging');
    headerActions?.classList.remove('is-home-app-dragging');
    trashButton?.classList.remove('is-over');
    trashButton?.setAttribute('aria-hidden', 'true');
    activeDrag=null;
  };
  const movePageEdge = (x) => {
    const rect=launcher.getBoundingClientRect();
    const direction=x>rect.right-30?1:x<rect.left+30?-1:0;
    if(!direction || (direction<0 && currentPage===0)) { clearEdgeTimer(); return; }
    if(direction===edgeDirection && edgeTimer) return;
    clearEdgeTimer(); edgeDirection=direction;
    edgeTimer=window.setTimeout(()=>{
      edgeTimer=null;
      const next=currentPage+direction;
      if(direction>0 && next>=layout.pages.length) {
        const sourcePage=activeDrag?.zone==='grid'?layout.pages[activeDrag.page]:null;
        if(!pageHasApps(currentPage) || (sourcePage && sourcePage.filter(Boolean).length<=1) || !ensurePage(next)) return;
      }
      if(next>=0 && next<layout.pages.length) showPage(next);
    },420);
  };
  launcher.addEventListener('pointerdown', event => {
    if(event.pointerType==='touch') {
      swipeStart={x:event.clientX,y:event.clientY};
      try { launcher.setPointerCapture(event.pointerId); } catch {}
    }
    if (event.target.closest('.home-app-favorite')) return;
    const button=event.target.closest('.home-app-button');
    if(!button) return;
    if(event.button!==undefined && event.button!==0) return;
    const slot=button.closest('.home-app-slot');
    const rect=button.getBoundingClientRect();
    const startPoint={x:event.clientX,y:event.clientY};
    pendingStart=startPoint;
    holdTimer=window.setTimeout(()=>{
      pendingStart=null;
      const ghost=button.cloneNode(true);
      ghost.classList.add('is-dragging');
      ghost.style.position='fixed'; ghost.style.left=rect.left+'px'; ghost.style.top=rect.top+'px';
      ghost.style.width=rect.width+'px'; ghost.style.height=rect.height+'px'; ghost.style.zIndex='120';
      ghost.style.pointerEvents='none'; ghost.style.margin='0';
      document.body.appendChild(ghost);
      button.style.visibility='hidden';
      activeDrag={button,ghost,id:button.dataset.appId,zone:slot.dataset.zone,page:Number(slot.dataset.page||0),start:startPoint};
      launcher.classList.add('is-dragging');
      headerActions?.classList.add('is-home-app-dragging');
      trashButton?.setAttribute('aria-hidden', 'false');
    },320);
  });
  launcher.addEventListener('pointermove', event => {
    if(activeDrag) {
      activeDrag.ghost.style.transform='translate('+(event.clientX-activeDrag.start.x)+'px,'+(event.clientY-activeDrag.start.y)+'px) scale(1.08)';
      movePageEdge(event.clientX);
      if (trashButton) {
        const trashRect = trashButton.getBoundingClientRect();
        const overTrash = event.clientX >= trashRect.left - 10 && event.clientX <= trashRect.right + 10 && event.clientY >= trashRect.top - 10 && event.clientY <= trashRect.bottom + 10;
        trashButton.classList.toggle('is-over', overTrash);
        activeDrag.trashOver = overTrash;
      }
      event.preventDefault();
    } else if(holdTimer && pendingStart) {
      if(Math.hypot(event.clientX-pendingStart.x,event.clientY-pendingStart.y)>14) {
        clearTimeout(holdTimer); holdTimer=null; pendingStart=null;
      }
    } else if(swipeStart) {
      // Swipe is evaluated on pointer release.
    }
  },{passive:false});
  const finishDrag = event => {
    if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}
    if(!activeDrag) {
      if(swipeStart) {
        const dx=event.clientX-swipeStart.x, dy=event.clientY-swipeStart.y;
        if(Math.abs(dx)>32 && Math.abs(dx)>Math.abs(dy)*1.15) {
          if(dx<0) {
            const next=currentPage+1;
            if(next<layout.pages.length) showPage(next);
          } else showPage(currentPage-1);
          suppressClick=true;
          window.setTimeout(()=>{suppressClick=false;},450);
        }
        swipeStart=null;
      }
      return;
    }
    clearEdgeTimer();
    const trashRect = trashButton?.getBoundingClientRect();
    const droppedOnTrash = event.type === 'pointerup' && trashRect && event.clientX >= trashRect.left - 10 && event.clientX <= trashRect.right + 10 && event.clientY >= trashRect.top - 10 && event.clientY <= trashRect.bottom + 10;
    if (droppedOnTrash) {
      const from = activeDrag.zone === 'dock' ? layout.dock : layout.pages[activeDrag.page];
      const index = from.indexOf(activeDrag.id);
      if (index >= 0) {
        from[index] = null;
        removedApps.add(activeDrag.id);
        saveRemovedHomeApps(removedApps);
        compactEmptyPages();
        save();
      }
    }
    const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.home-app-slot');
    if(!droppedOnTrash && target) {
      const from=activeDrag.zone==='dock'?layout.dock:layout.pages[activeDrag.page];
      const targetZone=target.dataset.zone;
      const to=targetZone==='dock'?layout.dock:layout.pages[Number(target.dataset.page)];
      const fromIndex=from.indexOf(activeDrag.id), targetIndex=Number(target.dataset.index);
      if(fromIndex>=0 && targetIndex>=0 && targetIndex<to.length) {
        [from[fromIndex],to[targetIndex]]=[to[targetIndex],from[fromIndex]];
        compactEmptyPages();
        save();
      }
    } else if(!droppedOnTrash && event.clientX>launcher.getBoundingClientRect().right-34) {
      const next=currentPage+1;
      const from=activeDrag.zone==='dock'?layout.dock:layout.pages[activeDrag.page];
      const sourcePage=activeDrag.zone==='grid'?layout.pages[activeDrag.page]:null;
      const sourceCount=sourcePage?sourcePage.filter(Boolean).length:Infinity;
      if((next<layout.pages.length || (pageHasApps(currentPage) && ensurePage(next))) && sourceCount>1) {
        const targetPage=layout.pages[next];
        const empty=targetPage.indexOf(null);
        const index=from.indexOf(activeDrag.id);
        if(empty>=0 && index>=0){from[index]=null;targetPage[empty]=activeDrag.id;compactEmptyPages();save();currentPage=Math.min(next,layout.pages.length-1);}
      }
    }
    suppressClick=true;
    clearDrag();
    paint();
    window.setTimeout(()=>{suppressClick=false;},450);
  };
  launcher.addEventListener('pointerup',finishDrag);
  launcher.addEventListener('pointercancel',finishDrag);
  launcher.addEventListener('click',event=>{
    const button=event.target.closest('.home-app-button');
    if(!button) return;
    if(suppressClick){event.preventDefault();event.stopPropagation();return;}
    const app=appById.get(button.dataset.appId);
    launchApp(app);
  });
  paint();
}
export function renderHomeScreen(outlet) {
  homeLayoutTouched = false;
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
      <button class="home-wallpaper-picker" type="button" hidden aria-label="Выбрать обои">
        <span class="home-wallpaper-picker-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect x="3.5" y="4.5" width="17" height="15" rx="2.2"></rect><circle cx="9" cy="9.5" r="1.7"></circle><path d="m5 17 5.2-5 3.2 3 2.2-2 3.4 4"></path></svg></span>
        <span class="home-wallpaper-picker-label">Обои</span>
        <span class="home-wallpaper-picker-sparkle" aria-hidden="true">✦</span>
      </button>
      <div class="home-wallpaper-status" role="status" aria-live="polite"></div>
    </section>
  `);

  const workspace = host.querySelector(':scope > .home-workspace');
  renderHomeAppLauncher(workspace);
  syncAccountHomeLayout(workspace);
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
    openWallpaperSourcePicker(workspace, fileInput);
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
      await uploadAccountWallpaper(edited);
      await writeWallpaper(edited);
      applyWallpaper(workspace, edited);
      showWallpaperMessage(workspace, 'Обои сохранены в аккаунте и синхронизируются между устройствами.');
    } catch (error) {
      showWallpaperMessage(workspace, error.message || 'Не удалось сохранить изображение.', true);
    } finally {
      fileInput.value = '';
    }
  });

  let wallpaperSyncForUser = null;
  const syncWallpaperForAccount = user => {
    if (!user || !workspace.isConnected) return;
    const userKey = String(user.id || user.username || 'account');
    if (wallpaperSyncForUser === userKey) return;
    wallpaperSyncForUser = userKey;
    loadAccountWallpaper(workspace).catch(error => {
      wallpaperSyncForUser = null;
      console.warn('Rebunar: не удалось восстановить обои аккаунта.', error);
    });
  };
  loadAccountWallpaper(workspace);
  subscribeToAuth(syncWallpaperForAccount);
}
