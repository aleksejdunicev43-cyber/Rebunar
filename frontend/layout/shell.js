/**
 * REBUNAR — APPLICATION SHELL
 * Общая оболочка интерфейса.
 */

import {
  getUser,
  subscribeToAuth
} from '../features/auth/session.js';
import { avatarMarkup } from '../shared/avatar.js?v=avatar-system-20261104-1';

const navIcons = {
  home: '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
  store: '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18l-1.5 12h-15z"/><path d="M5 9 7 3h10l2 6M9 9v3m6-3v3"/></svg>',
  reader: '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5.5v16.5M8 7h8M8 11h8"/></svg>',
  communities: '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  messages: '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-4.7A8.4 8.4 0 0 1 4 12.5 8.5 8.5 0 0 1 8.7 4.9 8.4 8.4 0 0 1 12.5 4h.5a8.5 8.5 0 0 1 7 7.5z"/></svg>',
  favorites: '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg>',
  creators: '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.5-1 10-10a2.8 2.8 0 0 0-4-4l-10 10z"/><path d="m13 6 5 5M4 20h16"/></svg>',
  more: '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>'
};

function navButton(route, label) {
  return `
    <button type="button" class="nav-item" data-route="${route}">
      ${navIcons[route] || ''}
      <span>${label}</span>
    </button>
  `;
}

function favoritesButton() {
  return navButton('favorites', 'Избранное');
}

function updateHeaderProfile(root, user) {
  const button = root.querySelector('.header-profile-button');
  if (!button) return;

  button.innerHTML = avatarMarkup(user || {}, { size: 'header', label: 'Мой профиль' });
  const photo = button.querySelector('.rb-avatar__photo');
  if (photo) { photo.loading = 'eager'; photo.fetchPriority = 'high'; }
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

        <div class="app-logo-image-wrap" aria-label="REBUNAR">
          <img
            class="app-logo-image"
            src="/new/build/rebunar-header.png"
            alt="REBUNAR"
          />
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
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-3-3-9"/>
              <path d="M10 21h4"/>
            </svg>
            <span class="notification-indicator" hidden></span>
          </button>
        </div>
      </header>

      <div class="app-layout">

        <aside class="sidebar">
          <nav class="main-navigation" aria-label="Основная навигация">
            <div class="nav-group">
              <span class="nav-group-title">REBUNAR</span>
              ${navButton('home', 'Главная')}
              ${navButton('store', 'Магазин')}
              ${navButton('reader', 'Читалка')}
              ${navButton('communities', 'Сообщества')}
              ${navButton('messages', 'Чаты')}
            </div>
            <div class="nav-group">
              <span class="nav-group-title">ДОПОЛНИТЕЛЬНО</span>
              ${favoritesButton()}
              ${navButton('creators', 'Творчество')}
            </div>
          </nav>
        </aside>

        <main class="main-content">
          <div id="screen-outlet"></div>
        </main>

        <aside class="context-panel" id="context-panel"></aside>

      </div>

      <nav class="mobile-navigation" aria-label="Основная навигация">
        ${navButton('home', 'Главная')}
        ${navButton('store', 'Магазин')}
        ${navButton('reader', 'Читалка')}
        ${navButton('communities', 'Сообщества')}
        ${navButton('messages', 'Чаты')}
        <button type="button" class="nav-item mobile-more-toggle" aria-expanded="false" aria-label="Дополнительные разделы" title="Дополнительно">
          ${navIcons.more}
          <span>Ещё</span>
        </button>
        <div class="mobile-more-menu" hidden>
          ${navButton('favorites', 'Избранное')}
          ${navButton('creators', 'Творчество')}
        </div>
      </nav>

    </div>
  `;

  updateHeaderProfile(root, getUser());

  root.__rebunarHeaderAuthUnsubscribe?.();
  root.__rebunarHeaderAuthUnsubscribe = subscribeToAuth(user => {
    updateHeaderProfile(root, user);
  });

  return {
    outlet: root.querySelector('#screen-outlet'),
    contextPanel: root.querySelector('#context-panel')
  };
}
