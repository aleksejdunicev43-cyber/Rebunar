/**
 * REBUNAR — APPLICATION ENTRY POINT
 */

import {
  registerRoute,
  navigate,
  initRouter,
  subscribeToRoute
} from './router.js';

import { createShell } from '../layout/shell.js';
import { initNavigation } from '../layout/navigation.js';
import {
  initializeAuth,
  getUser,
  clearUser
} from '../features/auth/session.js';

import { renderAuthScreen } from '../features/auth/view.js';
import { logout } from '../features/auth/api.js';
import { renderProfileScreen } from '../features/profile/view.js';
import { renderHomeScreen } from '../features/home/view.js';
import { renderMessagesScreen } from '../features/messages/view.js';
import '../features/messages/messages.css';
import { renderStatisticsScreen } from '../features/statistics/view.js';
import { renderSettingsScreen } from '../features/settings/view.js';
import { startPresence, stopPresence } from '../features/statistics/presence.js';
import { initializeTheme } from '../shared/theme.js';
import {
  completeMatrixConnection
} from '../infrastructure/matrix/connection.js';
import {
  consumeMatrixSsoCallback
} from '../infrastructure/matrix/sso.js';
import {
  disconnectMatrix
} from '../infrastructure/matrix/client.js';

const root = document.getElementById('app');

if (!root) {
  throw new Error('Rebunar: элемент #app не найден');
}

const screens = {
  home: 'Главная',
  games: 'Игры',
  communities: 'Сообщества',
  messages: 'Сообщения',
  profile: 'Профиль',
  search: 'Поиск',
  notifications: 'Уведомления',
  composer: 'Создание публикации',
  settings: 'Настройки',
  statistics: 'Статистика'
};

for (const [path, title] of Object.entries(screens)) {
  registerRoute(path, () => {
    const outlet = document.getElementById('screen-outlet');

    if (!outlet) return;

    if (path === 'home') {
      renderHomeScreen(outlet);
      return;
    }

    if (path === 'messages') {
      renderMessagesScreen(outlet);
      return;
    }

    if (path === 'profile') {
      renderProfileScreen(outlet, getUser(), handleLogout);
      return;
    }

    if (path === 'settings') {
      renderSettingsScreen(outlet);
      return;
    }

    if (path === 'statistics') {
      renderStatisticsScreen(outlet);
      return;
    }

    outlet.innerHTML = `
      <section class="screen">
        <h1>${title}</h1>
        <p>Раздел Rebunar подготовлен к разработке.</p>
      </section>
    `;
  });
}

let appStarted = false;
let navigationInitialized = false;
let routerInitialized = false;

async function handleLogout(event) {
  const button = event?.currentTarget;
  stopPresence();

  if (button) {
    button.disabled = true;
    button.textContent = 'Выходим...';
  }

  try {
    await logout();

    try {
      await disconnectMatrix();
    } catch (matrixError) {
      console.warn('Rebunar: Matrix-соединение не удалось остановить');
    }

    clearUser();

    appStarted = false;

    renderAuthScreen(root, mountApp);

    console.log('Rebunar: выход из аккаунта выполнен');
  } catch (error) {
    startPresence();
    console.error('Rebunar: ошибка выхода:', error);

    if (button) {
      button.disabled = false;
      button.textContent = 'Выйти из аккаунта';
    }

    const message = document.createElement('p');
    message.className = 'profile-logout-error';
    message.textContent = 'Не удалось выйти: ' + error.message;

    const card = root.querySelector('.profile-card');
    if (card) card.appendChild(message);
  }
}

function mountApp() {
  if (appStarted) return;

  appStarted = true;
  startPresence();

  createShell(root);

  if (!navigationInitialized) {
    initNavigation(root, navigate, subscribeToRoute);
    navigationInitialized = true;
  }

  const user = getUser();

  console.log(
    'Rebunar: пользователь авторизован:',
    user ? user.username : 'неизвестен'
  );

  if (!routerInitialized) {
    initRouter('home');
    routerInitialized = true;
  } else {
    navigate('home');
  }

  console.log('Rebunar: приложение запущено');
}

async function startApp() {
  root.innerHTML = `
    <section class="screen">
      <h1>Rebunar</h1>
      <p>Проверка подключения и авторизации...</p>
    </section>
  `;

  await initializeAuth();

  if (getUser()) {
    mountApp();

    if (new URLSearchParams(window.location.search).has('loginToken')) {
      completeMatrixConnection().then(result => {
        if (result) {
          console.log('Rebunar: Matrix подключён, E2EE инициализирован');
        }
      }).catch(error => {
        console.error('Rebunar: ошибка подключения Matrix:', error.message);
      });
    }

    return;
  }

  // Если сессия Rebunar отсутствует, удаляем одноразовый
  // Matrix-токен из URL и предлагаем обычный вход.
  try {
    consumeMatrixSsoCallback();
  } catch (error) {
    console.warn('Rebunar: Matrix callback не принят');
  }

  renderAuthScreen(root, mountApp);

  console.log('Rebunar: ожидается вход пользователя');
}

initializeTheme();
startApp();
