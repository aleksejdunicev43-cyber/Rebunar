/**
 * REBUNAR — APPLICATION ENTRY POINT
 */

import { registerRoute, navigate, initRouter, subscribeToRoute } from './router.js';
import { createShell } from '../layout/shell.js?v=avatar-20261101-2';
import { initNavigation } from '../layout/navigation.js';
import { initializeAuth, getUser, clearUser } from '../features/auth/session.js';
import { renderAuthScreen } from '../features/auth/view.js';
import { logout } from '../features/auth/api.js';
import { renderProfileScreen } from '../features/profile/view.js';
import { enhanceProfileScreen } from '../features/profile/enhancements.js';
import { initProfileCollectionButton } from '../features/profile/collection-button.js';
import { renderHomeScreen } from '../features/home/view.js';
import { renderFavoritesScreen } from '../features/favorites/view.js';
import { renderMessagesScreen } from '../features/messages/view.js';
import { renderGamesScreen } from '../features/games/view.js';
import { renderCommunitiesScreen } from '../features/communities/view.js';
import '../features/messages/messages.css';
import '../features/favorites/favorites.css';
import '../features/games/games.css';
import '../features/communities/communities.css';
import { renderStatisticsScreen } from '../features/statistics/view.js';
import '../features/statistics/statistics.css';
import { renderUsersScreen } from '../features/users/view.js';
import { renderUserProfileScreen } from '../features/users/profile-view.js';
import '../features/users/users.css';
import { renderSettingsScreen } from '../features/settings/view.js';
import { startPresence, stopPresence } from '../features/statistics/presence.js';
import { initializeTheme } from '../shared/theme.js';
import { completeMatrixConnection } from '../infrastructure/matrix/connection.js';
import { consumeMatrixSsoCallback } from '../infrastructure/matrix/sso.js';
import { disconnectMatrix } from '../infrastructure/matrix/client.js';

const root = document.getElementById('app');
if (!root) throw new Error('Rebunar: элемент #app не найден');

const screens = { home:'Главная', favorites:'Избранное', games:'Игры', communities:'Сообщества', messages:'Сообщения', profile:'Профиль', search:'Поиск', notifications:'Уведомления', composer:'Создание публикации', settings:'Настройки', statistics:'Статистика', users:'Пользователи', 'user-profile':'Профиль пользователя' };

for (const [path, title] of Object.entries(screens)) {
  registerRoute(path, (params = {}) => {
    const outlet = document.getElementById('screen-outlet');
    if (!outlet) return;
    if (path === 'home') return renderHomeScreen(outlet);
    if (path === 'favorites') return renderFavoritesScreen(outlet);
    if (path === 'messages') return renderMessagesScreen(outlet, params);
    if (path === 'games') return renderGamesScreen(outlet);
    if (path === 'communities') return renderCommunitiesScreen(outlet);
    if (path === 'profile') {
      const user = getUser();
      renderProfileScreen(outlet, user, handleLogout);
      enhanceProfileScreen(outlet, user);
      initProfileCollectionButton(outlet);
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
    clearUser(); initializeTheme(null); appStarted = false; renderAuthScreen(root, mountApp);
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

async function startApp() {
  root.innerHTML = `<section class="rebunar-splash" role="status" aria-live="polite"><div class="rebunar-splash-content"><div class="rebunar-splash-mark">REBUNAR</div><div class="rebunar-splash-line" aria-hidden="true"></div><div class="rebunar-splash-caption">ВОЗВРАЩАЕМ ТВОЙ МИР</div></div></section>`;
  await initializeAuth(); initializeTheme(getUser());
  if (getUser()) {
    mountApp();
    if (new URLSearchParams(window.location.search).has('loginToken')) completeMatrixConnection().catch(() => {});
    return;
  }
  try { consumeMatrixSsoCallback(); } catch {}
  renderAuthScreen(root, mountApp);
}

startApp();
