/**
 * REBUNAR — PUBLIC USER PROFILE
 */
import { api } from '../../shared/api/client.js';
import { navigate } from '../../app/router.js';
import { avatarMarkup } from '../../shared/avatar.js';
import './public-profile.css';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

export async function renderUserProfileScreen(container, params = {}) {
  const userId = Number(params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    container.innerHTML = '<section class="screen public-profile-screen"><p class="public-profile-state">Некорректный профиль.</p><button type="button" data-back-users>К пользователям</button></section>';
    container.querySelector('[data-back-users]')?.addEventListener('click', () => navigate('users'));
    return;
  }

  container.innerHTML = '<section class="screen public-profile-screen"><div class="public-profile-state">Загружаем профиль…</div></section>';
  try {
    const user = await api.get('/users/' + userId + '/profile');
    const name = user.display_name || user.username || 'Пользователь';
    const avatar = avatarMarkup(user, { size: 'public' });
    const status = user.online
      ? '<span class="public-profile-status is-online"><i></i>В сети</span>'
      : '<span class="public-profile-status"><i></i>Не в сети</span>';

    container.innerHTML = `
      <section class="screen public-profile-screen">
        <header class="public-profile-heading">
          <button type="button" class="public-profile-back" data-back-users>‹ <span>Пользователи</span></button>
          <span class="public-profile-kicker">REBUNAR / УЧАСТНИК</span>
        </header>
        <article class="public-profile-card">
          ${avatar}
          <h1>${escapeHTML(name)}</h1>
          <p class="public-profile-username">@${escapeHTML(user.username || 'user')}</p>
          ${status}
          <div class="public-profile-id">ID #${Number(user.id)}</div>
          <div class="public-profile-bio">
            <span>О СЕБЕ</span>
            <p>${escapeHTML(user.bio || 'Пользователь пока ничего не рассказал о себе.')}</p>
          </div>
          ${user.is_me
            ? '<div class="public-profile-self">Это ваш профиль</div>'
            : '<button type="button" class="public-profile-message" data-write-message>✉ Написать в чат</button>'}
        </article>
      </section>
    `;

    container.querySelector('[data-back-users]')?.addEventListener('click', () => navigate('users'));
    container.querySelector('[data-write-message]')?.addEventListener('click', () => {
      navigate('messages', {
        userId: Number(user.id),
        user: {
          display_name: user.display_name || user.username,
          username: user.username,
          avatar: user.avatar || '',
          equipped_frame: user.equipped_frame || 'none'
        }
      });
    });
  } catch (error) {
    container.innerHTML = `
      <section class="screen public-profile-screen">
        <button type="button" class="public-profile-back" data-back-users>‹ <span>Пользователи</span></button>
        <div class="public-profile-state is-error">${escapeHTML(error.message || 'Не удалось загрузить профиль')}</div>
      </section>
    `;
    container.querySelector('[data-back-users]')?.addEventListener('click', () => navigate('users'));
  }
}
