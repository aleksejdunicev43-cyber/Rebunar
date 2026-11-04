/**
 * REBUNAR — USERS DIRECTORY
 * Каталог зарегистрированных аккаунтов с настоящими аватарами и рамками.
 */
import { getUsers } from './api.js';
import { frameArtwork } from '../profile/enhancements.js';
import { navigate } from '../../app/router.js';
import './users.css';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

const safeFrameId = value => {
  const id = String(value || 'rookie').replace(/[^a-z0-9-]/gi, '');
  return id || 'rookie';
};

export function renderUsersScreen(container) {
  let page = 1;
  let query = '';
  let requestToken = 0;
  let searchTimer = null;

  container.innerHTML = `
    <section class="screen users-screen">
      <header class="users-heading">
        <div>
          <span class="users-kicker">СООБЩЕСТВО REBUNAR</span>
          <h1>Пользователи</h1>
          <p>Найди участников Rebunar по имени или никнейму.</p>
        </div>
      </header>
      <section class="users-total-card" aria-live="polite">
        <span class="users-total-icon" aria-hidden="true">♟</span>
        <div><strong data-users-total>—</strong><span>зарегистрированных пользователей</span></div>
      </section>
      <label class="users-search">
        <span aria-hidden="true">⌕</span>
        <input type="search" data-users-search maxlength="50"
          placeholder="Поиск по имени или @нику..." autocomplete="off">
        <button type="button" data-users-clear aria-label="Очистить поиск" hidden>×</button>
      </label>
      <div class="users-list-heading">
        <strong data-users-caption>Все участники</strong>
        <span data-users-count></span>
      </div>
      <div class="users-list" data-users-list aria-live="polite">
        <div class="users-state">Загружаем пользователей…</div>
      </div>
      <nav class="users-pagination" data-users-pagination aria-label="Страницы пользователей"></nav>
    </section>
  `;

  const searchInput = container.querySelector('[data-users-search]');
  const clearButton = container.querySelector('[data-users-clear]');
  const list = container.querySelector('[data-users-list]');

  function renderRows(users) {
    if (!users.length) {
      list.innerHTML = '<div class="users-state">Пользователи не найдены. Попробуй изменить запрос.</div>';
      return;
    }

    list.innerHTML = users.map(user => {
      const name = user.display_name || user.username || 'Пользователь';
      const initial = escapeHTML(name.trim().slice(0, 1).toUpperCase() || 'R');
      const frame = safeFrameId(user.equipped_frame);
      const avatar = user.avatar
        ? `<img class="users-avatar-image" src="${escapeHTML(user.avatar)}" alt="" loading="lazy" onerror="this.hidden=true">`
        : `<span class="users-avatar-placeholder">${initial}</span>`;
      const status = user.online
        ? '<span class="users-status is-online"><i></i>В сети</span>'
        : '<span class="users-status"><i></i>Участник Rebunar</span>';
      const isMe = Boolean(user.is_me);

      return `
        <article class="users-item" data-open-user="${Number(user.id)}" role="button" tabindex="0" aria-label="Открыть профиль ${escapeHTML(name)}">
          <span class="users-avatar-wrap">
            <span class="users-avatar">${avatar}</span>
            <span class="users-avatar-frame frame-${frame}" aria-hidden="true">${frameArtwork(frame)}</span>
          </span>
          <span class="users-identity">
            <strong>${escapeHTML(name)}</strong>
            <span class="users-username">@${escapeHTML(user.username || 'user')}</span>
            ${status}
          </span>
          <span class="users-id">ID #${Number(user.id)}</span>
          ${isMe ? '<span class="users-you">Это вы</span>' : ''}
        </article>
      `;
    }).join('');
  }

  function renderPagination(data) {
    const nav = container.querySelector('[data-users-pagination]');
    if (data.pages <= 1) {
      nav.innerHTML = '';
      return;
    }
    nav.innerHTML = `
      <button type="button" data-users-prev ${page <= 1 ? 'disabled' : ''}>‹</button>
      <span>${page} / ${data.pages}</span>
      <button type="button" data-users-next ${page >= data.pages ? 'disabled' : ''}>›</button>
    `;
    nav.querySelector('[data-users-prev]')?.addEventListener('click', () => { page--; load(); });
    nav.querySelector('[data-users-next]')?.addEventListener('click', () => { page++; load(); });
  }

  async function load() {
    const token = ++requestToken;
    list.innerHTML = '<div class="users-state">Загружаем пользователей…</div>';
    try {
      const data = await getUsers({ query, page, limit: 20 });
      if (token !== requestToken) return;
      container.querySelector('[data-users-total]').textContent =
        Number(data.total_registered || 0).toLocaleString('ru-RU');
      container.querySelector('[data-users-caption]').textContent =
        query ? 'Результаты поиска' : 'Все участники';
      container.querySelector('[data-users-count]').textContent =
        Number(data.total_results || 0).toLocaleString('ru-RU') + ' найдено';
      renderRows(data.users || []);
      renderPagination(data);
    } catch (error) {
      if (token !== requestToken) return;
      list.innerHTML = `<div class="users-state is-error">${escapeHTML(error.message || 'Не удалось загрузить пользователей')}</div>`;
      container.querySelector('[data-users-pagination]').innerHTML = '';
    }
  }

  searchInput.addEventListener('input', () => {
    query = searchInput.value.trim().replace(/^@/, '');
    clearButton.hidden = !searchInput.value;
    page = 1;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 250);
  });

  clearButton.addEventListener('click', () => {
    searchInput.value = '';
    query = '';
    clearButton.hidden = true;
    page = 1;
    load();
    searchInput.focus();
  });

  list.addEventListener('click', event => {
    const item = event.target.closest('[data-open-user]');
    if (item) navigate('user-profile', { userId: Number(item.dataset.openUser) });
  });
  list.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const item = event.target.closest('[data-open-user]');
    if (!item) return;
    event.preventDefault();
    navigate('user-profile', { userId: Number(item.dataset.openUser) });
  });

  load();
}
