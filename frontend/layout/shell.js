/**
 * REBUNAR — APPLICATION SHELL
 * Общая оболочка интерфейса.
 */

import {
  getUser,
  subscribeToAuth
} from '../features/auth/session.js';

const chatIcon = `
  <svg class="nav-icon" viewBox="0 0 24 24"
       width="23" height="23" fill="none"
       stroke="currentColor" stroke-width="1.9"
       stroke-linecap="round" stroke-linejoin="round"
       aria-hidden="true">
    <path d="M20 11.5a8.4 8.4 0 0 1-.9 3.8
      8.5 8.5 0 0 1-7.6 4.7
      8.4 8.4 0 0 1-3.8-.9L3 21l1.9-4.7
      A8.4 8.4 0 0 1 4 12.5
      8.5 8.5 0 0 1 8.7 4.9
      8.4 8.4 0 0 1 12.5 4h.5
      a8.5 8.5 0 0 1 7 7.5z"/>
  </svg>
`;

function chatButton() {
  return `
    <button type="button" class="nav-chat" data-route="messages">
      ${chatIcon}
      <span>Чаты</span>
    </button>
  `;
}

function updateHeaderProfile(root, user) {
  const button = root.querySelector('.header-profile-button');
  if (!button) return;

  button.replaceChildren();

  if (user?.avatar) {
    const image = document.createElement('img');
    image.className = 'header-profile-avatar';
    image.alt = 'Аватар пользователя';
    image.src = new URL(user.avatar, window.location.origin).href;

    image.onerror = () => {
      button.replaceChildren();
      const fallback = document.createElement('span');
      fallback.textContent = (user.display_name || user.username || 'R')
        .trim().charAt(0).toUpperCase();
      button.append(fallback);
    };

    button.append(image);
  } else {
    const fallback = document.createElement('span');
    fallback.textContent = (user?.display_name || user?.username || 'R')
      .trim().charAt(0).toUpperCase();
    button.append(fallback);
  }

  button.title = user?.display_name || user?.username || 'Мой профиль';
}

export function createShell(root) {
  root.innerHTML = `
    <div class="app-shell">

      <header class="app-header">
  <div class="header-brand">
    <button
      type="button"
      class="header-profile-button"
      data-route="profile"
      aria-label="Мой профиль"
      title="Мой профиль">
      <span>R</span>
    </button>
  </div>

  <div class="header-logo">
    <img class="app-logo-image" src="./assets/rebunar-logo.svg" alt="REBUNAR">
  </div>

  <div class="header-actions">
    <button type="button" class="header-icon-button"
      data-route="search" aria-label="Поиск" title="Поиск">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.8" cy="10.8" r="6.8"/>
        <path d="m16 16 5 5"/>
      </svg>
    </button>

    <button type="button" class="header-icon-button header-notifications"
      data-route="notifications" aria-label="Уведомления" title="Уведомления">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
        <path d="M10 21h4"/>
      </svg>
      <span class="notification-indicator" hidden></span>
    </button>

    <button type="button" class="header-create-button"
      data-route="composer">Создать</button>
  </div>
</header>

      <div class="app-layout">

        <aside class="sidebar">
          <nav class="main-navigation">
            <button type="button" data-route="home">Главная</button>
            <button type="button" data-route="games">Игры</button>
            <button type="button" data-route="communities">Сообщества</button>
            ${chatButton()}
</nav>
        </aside>

        <main class="main-content">
          <div id="screen-outlet"></div>
        </main>

        <aside class="context-panel" id="context-panel"></aside>

      </div>

      <nav class="mobile-navigation">
        <button type="button" data-route="home">Главная</button>
        <button type="button" data-route="games">Игры</button>
        <button type="button" data-route="communities">Сообщества</button>
        ${chatButton()}
</nav>

    </div>
  `;

  // Сразу показываем текущий аватар
  updateHeaderProfile(root, getUser());

  // Обновляем аватар при изменении аккаунта
  root.__rebunarHeaderAuthUnsubscribe?.();
  root.__rebunarHeaderAuthUnsubscribe = subscribeToAuth(user => {
    updateHeaderProfile(root, user);
  });

  return {
    outlet: root.querySelector('#screen-outlet'),
    contextPanel: root.querySelector('#context-panel')
  };
}
