/**
 * REBUNAR — APPLICATION ENTRY POINT
 */

import { registerRoute, navigate, initRouter, subscribeToRoute } from './router.js';
import { createShell } from '../layout/shell.js?v=boot-preload-20261106-1';
import { initNavigation } from '../layout/navigation.js';
import { initializeAuth, getUser, clearUser } from '../features/auth/session.js';
import { renderAuthScreen } from '../features/auth/view.js';
import { logout } from '../features/auth/api.js';
import { renderProfileScreen } from '../features/profile/view.js?v=avatar-system-20261104-6';
import { enhanceProfileScreen } from '../features/profile/enhancements.js?v=avatar-system-20261104-6';
import { renderHomeScreen } from '../features/home/view.js';
import { renderFavoritesScreen } from '../features/favorites/view.js';
import { renderMessagesScreen } from '../features/messages/view.js?v=avatar-system-20261104-6';
import { renderGamesScreen } from '../features/games/view.js';
import { renderEcosystemScreen } from '../features/ecosystem/view.js';
import '../features/ecosystem/ecosystem.css';
import { renderCommunitiesScreen } from '../features/communities/view.js?v=avatar-system-20261104-6';
import '../features/messages/messages.css?v=avatar-system-20261104-6';
import '../shared/avatar.css?v=avatar-system-20261104-7';
import '../features/favorites/favorites.css';
import '../features/games/games.css';
import '../features/communities/communities.css?v=avatar-system-20261104-6';
import { renderStatisticsScreen } from '../features/statistics/view.js';
import '../features/statistics/statistics.css';
import { renderUserProfileScreen } from '../features/users/profile-view.js?v=avatar-system-20261104-6';
import { renderUsersScreen } from '../features/users/view.js?v=avatar-system-20261104-6';
import '../features/users/users.css?v=avatar-system-20261104-6';
import { renderSettingsScreen } from '../features/settings/view.js';
import { startPresence, stopPresence } from '../features/statistics/presence.js';
import { initializeTheme } from '../shared/theme.js';
import { completeMatrixConnection } from '../infrastructure/matrix/connection.js';
import { consumeMatrixSsoCallback } from '../infrastructure/matrix/sso.js';
import { disconnectMatrix } from '../infrastructure/matrix/client.js';

const root = document.getElementById('app');
if (!root) throw new Error('Rebunar: элемент #app не найден');

// Keep the first-paint splash outside #app so the real interface can be mounted
// underneath it without exposing partially loaded header images or avatars.
let bootScreen = root.querySelector('.rebunar-boot');
if (bootScreen) document.body.appendChild(bootScreen);

function createBootScreen() {
  const screen = document.createElement('section');
  screen.className = 'rebunar-boot';
  screen.setAttribute('role', 'status');
  screen.setAttribute('aria-live', 'polite');
  screen.innerHTML = '<div class="rebunar-boot-content"><div class="rebunar-boot-mark">REBUNAR</div><div class="rebunar-boot-line" aria-hidden="true"></div><div class="rebunar-boot-caption">ЗАГРУЗКА ПРИЛОЖЕНИЯ</div></div>';
  document.body.appendChild(screen);
  return screen;
}

function preloadImage(url) {
  if (!url) return Promise.resolve();
  return new Promise(resolve => {
    const image = new Image();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      resolve();
    };
    const timeout = setTimeout(finish, 2200);
    image.onload = () => {
      Promise.resolve(image.decode?.()).catch(() => {}).finally(finish);
    };
    image.onerror = finish;
    image.src = url;
    if (image.complete) {
      if (image.naturalWidth > 0) {
        Promise.resolve(image.decode?.()).catch(() => {}).finally(finish);
      } else {
        finish();
      }
    }
  });
}

function waitForInitialPaint() {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function finishBoot(user) {
  if (!bootScreen) return;
  const fontReady = document.fonts?.ready || Promise.resolve();
  await Promise.allSettled([
    preloadImage('/new/build/rebunar-header.png'),
    preloadImage(user?.avatar),
    Promise.race([fontReady, new Promise(resolve => setTimeout(resolve, 1200))])
  ]);
  await waitForInitialPaint();
  const screen = bootScreen;
  screen.classList.add('is-leaving');
  setTimeout(() => {
    screen.remove();
    if (bootScreen === screen) bootScreen = null;
  }, 300);
}

const screens = { home:'Главная', store:'Магазин', games:'Игровой центр', communities:'Сообщества', messages:'Чаты', favorites:'Избранное', studio:'Rebunar Studio', creators:'Творчество', profile:'Профиль', mail:'Почта Rebunar', search:'Поиск', notifications:'Уведомления', composer:'Создание публикации', settings:'Настройки', statistics:'Статистика', users:'Пользователи', 'user-profile':'Профиль пользователя' };

for (const [path, title] of Object.entries(screens)) {
  registerRoute(path, (params = {}) => {
    const outlet = document.getElementById('screen-outlet');
    if (!outlet) return;
    if (path === 'home') return renderHomeScreen(outlet);
    if (path === 'favorites') return renderFavoritesScreen(outlet);
    if (path === 'messages') return renderMessagesScreen(outlet, params);
    if (path === 'games') return renderGamesScreen(outlet);
    if (['store', 'studio', 'creators', 'mail', 'search', 'notifications'].includes(path)) return renderEcosystemScreen(outlet, path);
    if (path === 'communities') return renderCommunitiesScreen(outlet);
    if (path === 'profile') {
      const user = getUser();
      renderProfileScreen(outlet, user, handleLogout);
      enhanceProfileScreen(outlet, user);
      return;
    }
    if (path === 'settings') return renderSettingsScreen(outlet);
    if (path === 'statistics') return renderStatisticsScreen(outlet);
    if (path === 'users') return renderUsersScreen(outlet);
    if (path === 'user-profile') return renderUserProfileScreen(outlet, params);
    outlet.innerHTML = `<section class="screen"><h1>${title}</h1><p>Раздел Rebunar подготовлен к разработке.</p></section>`;
  });
}

let appStarted = false;
let navigationInitialized = false;
let routerInitialized = false;

async function handleLogout(event) {
  const button = event?.currentTarget;
  stopPresence();
  if (button) { button.disabled = true; button.textContent = 'Выходим...'; }
  try {
    await logout();
    try { await disconnectMatrix(); } catch { console.warn('Rebunar: Matrix-соединение не удалось остановить'); }
    clearUser(); initializeTheme(null); appStarted = false; renderAuthScreen(root, enterApp);
  } catch (error) {
    startPresence();
    if (button) { button.disabled = false; button.textContent = 'Выйти из аккаунта'; }
    const message = document.createElement('p'); message.className = 'profile-logout-error'; message.textContent = 'Не удалось выйти: ' + error.message;
    root.querySelector('.profile-card')?.appendChild(message);
  }
}

function mountApp() {
  if (appStarted) return;
  appStarted = true; initializeTheme(getUser()); startPresence(); createShell(root);
  if (!navigationInitialized) { initNavigation(root, navigate, subscribeToRoute); navigationInitialized = true; }
  if (!routerInitialized) { initRouter('home'); routerInitialized = true; } else navigate('home');
}

function enterApp() {
  if (!bootScreen) bootScreen = createBootScreen();
  mountApp();
  finishBoot(getUser());
}

async function startApp() {
  await initializeAuth();
  initializeTheme(getUser());
  if (getUser()) {
    mountApp();
    await finishBoot(getUser());
    if (new URLSearchParams(window.location.search).has('loginToken')) completeMatrixConnection().catch(() => {});
    return;
  }
  try { consumeMatrixSsoCallback(); } catch {}
  renderAuthScreen(root, enterApp);
  await finishBoot(null);
}

startApp();
