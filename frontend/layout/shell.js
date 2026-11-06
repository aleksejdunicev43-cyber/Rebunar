/**
 * REBUNAR — APPLICATION SHELL
 * Общая оболочка интерфейса.
 */

import {
  getUser,
  subscribeToAuth
} from '../features/auth/session.js';
import { avatarMarkup } from '../shared/avatar.js?v=avatar-system-20261104-1';

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

function favoritesButton() {
  return `
    <button type="button" class="nav-favorites" data-route="favorites">
      <span aria-hidden="true">☆</span>
      <span>Избранное</span>
    </button>
  `;
}

function updateHeaderProfile(root, user) {
  const button = root.querySelector('.header-profile-button');
  if (!button) return;

  button.innerHTML = avatarMarkup(user || {}, { size: 'header', label: 'Мой профиль' });
  button.title = user?.display_name || user?.username || 'Мой профиль';
  applySavedHeaderPhotoSize(button);
  enableHeaderAvatarPhotoDrag(button);
}

const HEADER_AVATAR_POSITION_KEY = 'rebunar.header-avatar-circle-position.v2';
const HEADER_AVATAR_MAX_OFFSET = 18;
const HEADER_PHOTO_SIZE_KEY = 'rebunar.header-avatar-photo-diameter.v1';
const HEADER_PHOTO_SIZE_MIN = 20;
const HEADER_PHOTO_SIZE_MAX = 75;

function applySavedHeaderPhotoSize(root) {
  const avatar = root.querySelector('.rb-avatar--header');
  if (!avatar) return;
  let diameter = 52;
  try {
    const saved = Number(localStorage.getItem(HEADER_PHOTO_SIZE_KEY));
    if (Number.isFinite(saved) && saved >= HEADER_PHOTO_SIZE_MIN && saved <= HEADER_PHOTO_SIZE_MAX) diameter = saved;
  } catch {}
  const photo = avatar.querySelector('.rb-avatar__photo');
  if (photo) {
    const imageSize = (diameter / 52) * 100;
    photo.style.width = imageSize + '%';
    photo.style.height = imageSize + '%';
  }
}

function setHeaderPhotoDiameter(value, root = document) {
  const diameter = Math.max(HEADER_PHOTO_SIZE_MIN, Math.min(HEADER_PHOTO_SIZE_MAX, Number(value) || 52));
  try { localStorage.setItem(HEADER_PHOTO_SIZE_KEY, String(diameter)); } catch {}
  root.querySelectorAll('.rb-avatar--header').forEach(avatar => {
    const photo = avatar.querySelector('.rb-avatar__photo');
    if (!photo) return;
    const imageSize = (diameter / 52) * 100;
    photo.style.width = imageSize + '%';
    photo.style.height = imageSize + '%';
  });
  const range = root.querySelector('.header-avatar-size-range');
  const label = root.querySelector('.header-avatar-size-value');
  if (range) range.value = String(diameter);
  if (label) label.textContent = diameter + '%';
}

function setupHeaderPhotoSizeControl(root) {
  const toggle = root.querySelector('.header-avatar-size-toggle');
  const panel = root.querySelector('.header-avatar-size-panel');
  const range = root.querySelector('.header-avatar-size-range');
  if (!toggle || !panel || !range || toggle.dataset.ready === 'true') return;
  toggle.dataset.ready = 'true';
  let initial = 52;
  try {
    const saved = Number(localStorage.getItem(HEADER_PHOTO_SIZE_KEY));
    if (Number.isFinite(saved) && saved >= HEADER_PHOTO_SIZE_MIN && saved <= HEADER_PHOTO_SIZE_MAX) initial = saved;
  } catch {}
  setHeaderPhotoDiameter(initial, root);
  toggle.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const opening = panel.hidden;
    panel.hidden = !opening;
    toggle.setAttribute('aria-expanded', String(opening));
  });
  range.addEventListener('input', () => setHeaderPhotoDiameter(range.value, root));
  document.addEventListener('pointerdown', event => {
    if (panel.hidden || panel.contains(event.target) || toggle.contains(event.target)) return;
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  });
}

function enableHeaderAvatarPhotoDrag(button) {
  const photo = button.querySelector('.rb-avatar__photo');
  if (!photo) return;

  let position = { x: 0, y: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(HEADER_AVATAR_POSITION_KEY) || '{}');
    position.x = Math.max(-HEADER_AVATAR_MAX_OFFSET, Math.min(HEADER_AVATAR_MAX_OFFSET, Number(saved.x) || 0));
    position.y = Math.max(-HEADER_AVATAR_MAX_OFFSET, Math.min(HEADER_AVATAR_MAX_OFFSET, Number(saved.y) || 0));
  } catch {}

  const paint = () => {
    const currentPhoto = button.querySelector('.rb-avatar__photo');
    if (currentPhoto) {
      currentPhoto.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    }
  };
  paint();
  if (button.dataset.photoDragReady === 'true') return;
  button.dataset.photoDragReady = 'true';

  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let moved = false;

  button.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    originX = position.x;
    originY = position.y;
    moved = false;
    button.setPointerCapture?.(pointerId);
  });

  button.addEventListener('pointermove', event => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!moved && Math.hypot(dx, dy) < 2) return;
    moved = true;
    event.preventDefault();
    position.x = Math.max(-HEADER_AVATAR_MAX_OFFSET, Math.min(HEADER_AVATAR_MAX_OFFSET, originX + dx));
    position.y = Math.max(-HEADER_AVATAR_MAX_OFFSET, Math.min(HEADER_AVATAR_MAX_OFFSET, originY + dy));
    paint();
  });

  const finishDrag = event => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    if (moved) {
      try {
        localStorage.setItem(HEADER_AVATAR_POSITION_KEY, JSON.stringify(position));
      } catch {}
      button.addEventListener('click', click => {
        click.preventDefault();
        click.stopImmediatePropagation();
      }, { capture: true, once: true });
    }
    pointerId = null;
  };

  button.addEventListener('pointerup', finishDrag);
  button.addEventListener('pointercancel', finishDrag);
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
            <span>Р</span>
          </button>
          <button type="button" class="header-avatar-size-toggle" aria-label="Размер фотографии аватарки" aria-expanded="false" title="Размер фотографии"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h7M15 7h5M4 17h3M11 17h9"/><circle cx="13" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg></button>
          <div class="header-avatar-size-panel" hidden>
            <label for="header-avatar-size-range">Размер фотографии</label>
            <input id="header-avatar-size-range" class="header-avatar-size-range" type="range" min="20" max="75" step="1" value="52">
            <output class="header-avatar-size-value">52%</output>
          </div>
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
          <nav class="main-navigation">
            <button type="button" data-route="home">Главная</button>
            ${favoritesButton()}
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
        ${favoritesButton()}
        <button type="button" data-route="games">Игры</button>
        <button type="button" data-route="communities">Сообщества</button>
        ${chatButton()}
      </nav>

    </div>
  `;

  setupHeaderPhotoSizeControl(root);
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
