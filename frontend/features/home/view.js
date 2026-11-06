/**
 * REBUNAR — HOME SCREEN
 * Главная — личный центр экосистемы, а не вторая лента игр и публикаций.
 */

import { getUser } from '../auth/session.js';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

export function renderHomeScreen(outlet) {
  const user = getUser() || {};
  const name = user.display_name || user.username || 'участник Rebunar';

  outlet.innerHTML = `
    <section class="screen home-screen">
      <header class="home-intro">
        <span class="home-eyebrow">REBUNAR / ЛИЧНОЕ ПРОСТРАНСТВО</span>
        <h1>С возвращением, ${escapeHTML(name)}!</h1>
        <p>Твоя точка входа в игры, творчество и общение. Здесь — быстрые действия и важные обновления, а не дублирующаяся лента.</p>
      </header>

      <section class="home-start-section" aria-labelledby="home-start-title">
        <div class="home-section-heading">
          <div>
            <span class="home-section-kicker">БЫСТРЫЙ СТАРТ</span>
            <h2 id="home-start-title">Чем займёмся?</h2>
          </div>
        </div>
        <div class="home-action-grid">
          <button type="button" class="home-action-card home-action-card--primary" data-route="studio">
            <span class="home-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m8 10 2 2-2 2m5 0h3"/></svg>
            </span>
            <span class="home-action-title">Создать игру</span>
            <span class="home-action-description">Начни проект в Rebunar Studio</span>
            <span class="home-action-arrow" aria-hidden="true">→</span>
          </button>
          <button type="button" class="home-action-card" data-route="store">
            <span class="home-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 9h18l-1.5 12h-15z"/><path d="M5 9 7 3h10l2 6M9 9v3m6-3v3"/></svg>
            </span>
            <span class="home-action-title">Найти игру</span>
            <span class="home-action-description">Открой магазин и игровые проекты</span>
            <span class="home-action-arrow" aria-hidden="true">→</span>
          </button>
          <button type="button" class="home-action-card" data-route="communities">
            <span class="home-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
            <span class="home-action-title">Открыть сообщества</span>
            <span class="home-action-description">Обсуждения, публикации и авторы</span>
            <span class="home-action-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <section class="home-personal-section" aria-labelledby="home-personal-title">
        <div class="home-section-heading">
          <div>
            <span class="home-section-kicker">ТВОЯ АКТИВНОСТЬ</span>
            <h2 id="home-personal-title">Личное пространство</h2>
          </div>
        </div>
        <div class="home-personal-list">
          <button type="button" class="home-personal-link" data-route="messages">
            <span class="home-personal-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M20 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-4.7A8.4 8.4 0 0 1 4 12.5 8.5 8.5 0 0 1 8.7 4.9 8.4 8.4 0 0 1 12.5 4h.5a8.5 8.5 0 0 1 7 7.5z"/></svg>
            </span>
            <span><strong>Сообщения</strong><small>Личные и групповые чаты</small></span>
            <span class="home-personal-arrow" aria-hidden="true">›</span>
          </button>
          <button type="button" class="home-personal-link" data-route="notifications">
            <span class="home-personal-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-3-3-9"/><path d="M10 21h4"/></svg>
            </span>
            <span><strong>Уведомления</strong><small>Ответы, упоминания и события</small></span>
            <span class="home-personal-arrow" aria-hidden="true">›</span>
          </button>
        </div>
        <p class="home-profile-note">Профиль и официальная почта Rebunar всегда доступны через твою аватарку в верхней панели.</p>
      </section>

      <footer class="home-footer">
        <span>REBUNAR</span>
        <p>Одна платформа — играть, создавать и находить своих.</p>
      </footer>
    </section>
  `;
}
