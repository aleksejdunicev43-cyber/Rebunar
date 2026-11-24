/**
 * REBUNAR — PROFILE VIEW
 */

import { uploadAvatar, uploadProfileCover, updateProfile } from './api.js';
import { getUser, setUser } from '../auth/session.js';
import { avatarMarkup } from '../../shared/avatar.js?v=avatar-outline-20261105-1';
import { navigate } from '../../app/router.js';
import { enhanceProfileScreen } from './enhancements.js';

export function renderProfileScreen(container, user, onLogout) {
  const avatar = avatarMarkup(user, { size: 'profile', label: 'Аватар профиля' });

  const displayName = user.display_name || user.username || 'Пользователь';
  const username = user.username || '—';
  const hasUserId = user.id !== undefined && user.id !== null;
  const userId = hasUserId ? String(user.id) : '—';
  const bio = user.bio || 'Пока нет описания профиля.';
  const profileCover = user.profile_cover || '';

  container.innerHTML = `
    <section class="screen profile-screen">
      <div class="profile-card">
        <div class="profile-cover${profileCover ? ' has-custom-cover' : ''}" ${profileCover ? `style="--profile-cover-image: url('${escapeHTML(profileCover)}')"` : ''}>
        </div>
        <input class="profile-cover-input" type="file" accept="image/jpeg,image/png,image/webp" hidden>
        <div class="profile-hero">
          <button class="profile-avatar profile-avatar-button" type="button" aria-label="Аватар профиля">${avatar}</button>
          <input class="profile-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" hidden>
          <div class="profile-identity"><h2>${escapeHTML(displayName)}</h2></div>
          <div class="profile-hero-controls" aria-label="Управление профилем">
            <button class="profile-customize-button" type="button" aria-label="Оформление профиля">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.2 6.2 3.6 3.6M4 20l4.2-1 10.9-10.9a2.55 2.55 0 0 0-3.6-3.6L4.6 15.4 4 20Z"/><path d="M3 21h7"/></svg><span>Оформление</span>
            </button>
            <button class="profile-hero-icon-button" type="button" data-profile-control="settings" aria-label="Настройки"><span aria-hidden="true">⚙</span></button>
            <button class="profile-hero-icon-button" type="button" data-profile-control="info" aria-label="Информация"><span aria-hidden="true">i</span></button>
          </div>
        </div>
        <div class="profile-details">
          <div class="profile-bio">
            <span>О себе</span>
            <p>${escapeHTML(bio)}</p>
          </div>
        </div>
        <div class="profile-quick-grid profile-quick-grid-all" aria-label="Основные разделы профиля">
          ${renderProfileQuickActions([
            ["recent","Читалка","◷"],
            ["library","Библиотека","▣"],
            ["achievements","Достижения","✧"],
            ["stats","Статистика","▥"]
          ])}
        </div>
        <div class="profile-activity" aria-label="Статус и достижения"></div>


        <button class="profile-logout" type="button">
          Выйти из аккаунта
        </button>
      </div>
    </section>
  `;

  const quickActions = container.querySelectorAll('[data-profile-action]');
  quickActions.forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.profileAction;
      if (button.disabled) return;
      if (action === 'recent') navigate('reader');
      else if (action === 'library') navigate('favorites');
      else if (action === 'stats') navigate('statistics');
      else if (action === 'achievements') {
        const achievements = container.querySelector('.profile-achievements-card');
        achievements?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
  container.querySelector('.profile-logout')
    .addEventListener('click', onLogout);

  const avatarButton = container.querySelector('.profile-avatar-button');
  const fileInput = container.querySelector('.profile-avatar-input');

  avatarButton.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) openAvatarEditor(container, file, user, onLogout);
    fileInput.value = '';
  });

  const coverInput = container.querySelector('.profile-cover-input');
  container.querySelector('.profile-customize-button').addEventListener('click', () => openProfileCustomization(container, user, onLogout));
  container.querySelector('[data-profile-control="settings"]').addEventListener('click', () => navigate('settings'));
  container.querySelector('[data-profile-control="info"]').addEventListener('click', () => openProfileInfo(container, user));
  coverInput.addEventListener('change', async () => {
    const file = coverInput.files?.[0];
    coverInput.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showProfileToast(container, 'Выбери изображение JPG, PNG или WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showProfileToast(container, 'Размер обложки не должен превышать 5 МБ');
      return;
    }
    const coverButton = container.querySelector('.profile-customize-button');
    coverButton.disabled = true;
    coverButton.textContent = 'Загрузка…';
    try {
      const result = await uploadProfileCover(file);
      const latestUser = getUser() || user;
      const updatedUser = { ...latestUser, profile_cover: result.profile_cover };
      setUser(updatedUser);
      renderProfileScreen(container, updatedUser, onLogout);
      showProfileToast(container, 'Обложка профиля обновлена');
    } catch (error) {
      console.error('Rebunar: ошибка загрузки обложки:', error);
      coverButton.disabled = false;
      coverButton.textContent = 'Оформление';
      showProfileToast(container, error.message || 'Не удалось загрузить обложку');
    }
  });

  enhanceProfileScreen(container, user);
}



function openProfileCustomization(container, user, onLogout) {
  if (container.querySelector('.profile-customize-overlay')) return;
  const profileCover = container.querySelector('.profile-cover');
  const originalCover = user.profile_cover || '';
  let selectedBackgroundFile = null;
  let selectedBackgroundUrl = '';
  let backgroundSaved = false;
  let onKeydown = null;

  const overlay = document.createElement('div');
  overlay.className = 'profile-customize-overlay';
  overlay.innerHTML = `
    <section class="profile-customize-sheet" role="dialog" aria-modal="true" aria-labelledby="profile-customize-title">
      <div class="profile-customize-heading">
        <div class="profile-customize-heading-copy">
          <span class="profile-customize-sparkle" aria-hidden="true">✧</span>
          <div><h2 id="profile-customize-title">Оформление профиля</h2></div>
        </div>
        <button class="profile-customize-close" type="button" aria-label="Закрыть">×</button>
      </div>
      <p class="profile-customize-description">Выбери предмет — профиль сверху сразу покажет, как это выглядит</p>
      <div class="profile-customize-tabs" role="tablist" aria-label="Категории оформления">
        <button class="profile-customize-tab is-active" type="button" role="tab" aria-selected="true" data-customize-tab="avatars">Аватарки</button>
        <button class="profile-customize-tab" type="button" role="tab" aria-selected="false" data-customize-tab="frames">Рамки</button>
        <button class="profile-customize-tab" type="button" role="tab" aria-selected="false" data-customize-tab="backgrounds">Фоны</button>
      </div>
      <div class="profile-customize-content" role="tabpanel" aria-live="polite">
        <div class="profile-customize-empty"><span aria-hidden="true">✧</span><strong>Каталог скоро появится</strong><small>Раздел «Аватарки» будет добавлен позже</small></div>
      </div>
      <div class="profile-customize-footer">
        <button class="profile-customize-dismiss" type="button">Закрыть</button>
      </div>
    </section>`;
  container.appendChild(overlay);

  const restoreOriginalCover = () => {
    if (!profileCover || backgroundSaved) return;
    if (originalCover) {
      profileCover.classList.add('has-custom-cover');
      profileCover.style.setProperty('--profile-cover-image', `url("${originalCover}")`);
    } else {
      profileCover.classList.remove('has-custom-cover');
      profileCover.style.removeProperty('--profile-cover-image');
    }
  };
  const close = () => {
    restoreOriginalCover();
    overlay.remove();
    if (selectedBackgroundUrl) URL.revokeObjectURL(selectedBackgroundUrl);
    if (onKeydown) document.removeEventListener('keydown', onKeydown);
  };
  overlay.querySelector('.profile-customize-close').addEventListener('click', close);
  overlay.querySelector('.profile-customize-dismiss').addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });

  const content = overlay.querySelector('.profile-customize-content');
  const labels = {
    avatars: ['Каталог скоро появится', 'Раздел «Аватарки» будет добавлен позже'],
    frames: ['Рамки скоро появятся', 'Раздел «Рамки» будет добавлен позже']
  };

  const showBackgroundPicker = () => {
    content.innerHTML = `
      <div class="profile-background-picker">
        <input class="profile-background-input" type="file" accept="image/jpeg,image/png,image/webp" hidden>
        <button class="profile-background-choose" type="button"><span aria-hidden="true">＋</span> Выбрать из галереи</button>
        <button class="profile-background-apply" type="button" disabled>Установить фон</button>
        <small class="profile-background-hint">JPG, PNG или WebP · до 5 МБ</small>
      </div>`;
    const input = content.querySelector('.profile-background-input');
    const chooseButton = content.querySelector('.profile-background-choose');
    const applyButton = content.querySelector('.profile-background-apply');
    const hint = content.querySelector('.profile-background-hint');

    if (selectedBackgroundFile) {
      applyButton.disabled = false;
      hint.textContent = 'Предпросмотр показан на профиле';
    }

    chooseButton.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showProfileToast(container, 'Выбери изображение JPG, PNG или WebP');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showProfileToast(container, 'Размер фона не должен превышать 5 МБ');
        return;
      }

      if (selectedBackgroundUrl) URL.revokeObjectURL(selectedBackgroundUrl);
      selectedBackgroundFile = file;
      selectedBackgroundUrl = URL.createObjectURL(file);

      if (profileCover) {
        profileCover.classList.add('has-custom-cover');
        profileCover.style.setProperty('--profile-cover-image', `url("${selectedBackgroundUrl}")`);
      }
      applyButton.disabled = false;
      hint.textContent = 'Предпросмотр показан на профиле';
    });

    applyButton.addEventListener('click', async () => {
      if (!selectedBackgroundFile || applyButton.disabled) return;
      applyButton.disabled = true;
      chooseButton.disabled = true;
      applyButton.textContent = 'Устанавливаем…';
      try {
        const result = await uploadProfileCover(selectedBackgroundFile);
        const latestUser = getUser() || user;
        const updatedUser = { ...latestUser, profile_cover: result.profile_cover };
        setUser(updatedUser);
        backgroundSaved = true;
        close();
        renderProfileScreen(container, updatedUser, onLogout);
        showProfileToast(container, 'Фон профиля установлен');
      } catch (error) {
        console.error('Rebunar: ошибка установки фона профиля:', error);
        applyButton.disabled = false;
        chooseButton.disabled = false;
        applyButton.textContent = 'Повторить установку';
        showProfileToast(container, error.message || 'Не удалось установить фон');
      }
    });
  };

  overlay.querySelectorAll('[data-customize-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      overlay.querySelectorAll('[data-customize-tab]').forEach(item => {
        const active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
      if (tab.dataset.customizeTab === 'backgrounds') {
        showBackgroundPicker();
        return;
      }
      const [title, description] = labels[tab.dataset.customizeTab];
      content.innerHTML = `<div class="profile-customize-empty"><span aria-hidden="true">✧</span><strong>${title}</strong><small>${description}</small></div>`;
    });
  });

  onKeydown = event => {
    if (event.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKeydown);
}

function openProfileInfo(container, user) {
  if (container.querySelector('.profile-info-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'profile-info-overlay';
  const displayName = user.display_name || user.username || 'Пользователь';
  const username = user.username || '—';
  const userId = user.id !== undefined && user.id !== null ? String(user.id) : '—';
  overlay.innerHTML = `
    <section class="profile-info-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-info-title">
      <div class="profile-info-heading">
        <div><span class="profile-info-kicker">REBUNAR / PROFILE</span><h2 id="profile-info-title">Информация о профиле</h2></div>
        <button class="profile-info-close" type="button" aria-label="Закрыть">×</button>
      </div>
      <p class="profile-info-description">Твой профиль — это твоя личная страница в экосистеме Rebunar.</p>
      <div class="profile-info-row"><span>Имя</span><strong>${escapeHTML(displayName)}</strong><button class="profile-info-copy" type="button" data-copy-profile-value="${escapeHTML(displayName)}" aria-label="Скопировать имя" title="Скопировать имя"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"></path></svg></button></div>
      <div class="profile-info-row"><span>Логин</span><strong>@${escapeHTML(username)}</strong><button class="profile-info-copy" type="button" data-copy-profile-value="${escapeHTML("@" + username)}" aria-label="Скопировать логин" title="Скопировать логин"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"></path></svg></button></div>
      <div class="profile-info-row"><span>ID аккаунта</span><strong>${escapeHTML(userId)}</strong><button class="profile-info-copy" type="button" data-copy-profile-value="${escapeHTML(userId)}" aria-label="Скопировать ID" title="Скопировать ID" ${user.id === undefined || user.id === null ? "disabled" : ""}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"></path></svg></button></div>
      <button class="profile-info-done" type="button">Понятно</button>
    </section>`;
  container.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.profile-info-close').addEventListener('click', close);
  overlay.querySelector('.profile-info-done').addEventListener('click', close);
  overlay.querySelectorAll('[data-copy-profile-value]').forEach(button => {
    button.addEventListener('click', async () => {
      try {
        await copyProfileText(button.dataset.copyProfileValue || '');
        showProfileToast(container, 'Скопировано в буфер обмена');
      } catch (error) {
        console.warn('Rebunar: не удалось скопировать данные профиля:', error);
        showProfileToast(container, 'Не удалось скопировать');
      }
    });
  });
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  overlay.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
}

function renderProfileQuickActions(items) {
  const soon = new Set([]);
  const icons = {
    creator: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    recent: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bookmarks: '<path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-4-6 4V4.8Z"/>',
    myworks: '<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    drafts: '<path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Z"/><path d="m13.8 6.7 3.5 3.5"/>',
    notifications: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
    saved: '<path d="M5 4h14v16l-7-4-7 4V4Z"/><path d="m9 9 2 2 4-4"/>',
    library: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5.5v16.5M8 7h8M8 11h8"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    edit: '<path d="M12 20h9"/><path d="m16.5 3.5 4 4L9 19l-5 1 1-5 11.5-11.5Z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.8Z"/>',
    avatar: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    achievements: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    privacy: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.2 1.8c-1.1 1-1.8 1.3-1.8 2.7M12 17h.01"/>'
  };
  return items.map(([action, label]) => {
    const isSoon = soon.has(action);
    const icon = icons[action] || '<circle cx="12" cy="12" r="8"/>';
    const image = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + icon + '</svg>';
    return `<button class="profile-quick-action${isSoon ? ' is-coming' : ''}" type="button" data-profile-action="${action}" ${isSoon ? 'disabled aria-disabled="true" title="Скоро"' : ''}><span class="profile-quick-icon">${image}</span><span>${label}</span></button>`;
  }).join('');
}

export function openCreatorChoice(container) {
  const overlay=document.createElement('div');
  overlay.className='profile-creator-overlay';
  overlay.innerHTML=[
    '<section class="profile-creator-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-creator-title">',
    '<div class="profile-creator-heading"><div><span class="profile-creator-kicker">REBUNAR / CREATOR</span><h2 id="profile-creator-title">Кем хочешь стать?</h2></div><button class="profile-creator-close" type="button" aria-label="Закрыть">×</button></div>',
    '<button class="profile-creator-option" type="button" data-creator-role="author"><span class="profile-creator-option-icon" aria-hidden="true">✍</span><span><strong>Автор</strong><small>Новеллы, вебтуны и другие истории</small></span><span class="profile-creator-arrow" aria-hidden="true">›</span></button>',
    '<div class="profile-creator-option is-coming"><span class="profile-creator-option-icon" aria-hidden="true">⌘</span><span><strong>Разработчик</strong><small>Игры, приложения и цифровые проекты</small></span><span class="profile-creator-soon">СКОРО</span></div>',
    '</section>'
  ].join('');
  container.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector('.profile-creator-close').addEventListener('click',close);
  overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
  overlay.querySelector('[data-creator-role="author"]').addEventListener('click',()=>{close();navigate('reader',{mode:'studio'});});
}


export function openProfileEditor(container, user, onLogout) {
  const overlay = document.createElement('div');
  overlay.className = 'profile-editor-overlay';

  const currentDisplayName = user.display_name || '';
  const currentUsername = user.username || '';
  const currentBio = user.bio || '';

  overlay.innerHTML = `
    <div class="profile-editor" role="dialog" aria-modal="true"
      aria-labelledby="profile-editor-title">

      <div class="profile-editor-heading">
        <h2 id="profile-editor-title">Редактирование профиля</h2>
        <button class="profile-editor-close" type="button"
          aria-label="Закрыть">×</button>
      </div>

      <div class="profile-editor-avatar-row">
        <div><strong>Аватар профиля</strong><small>Фотография, которая отображается рядом с твоим именем</small></div>
        <button class="profile-editor-avatar-change" type="button">Изменить аватар</button>
        <input class="profile-editor-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" hidden>
      </div>

      <div class="profile-editor-fields">

        <label class="profile-editor-field">
          <span>Имя</span>
          <input
            class="profile-editor-display-name"
            type="text"
            maxlength="100"
            autocomplete="name"
            value="${escapeHTML(currentDisplayName)}"
            placeholder="Ваше имя">
        </label>

        <label class="profile-editor-field">
          <span>Имя пользователя</span>
          <div class="profile-editor-username-wrap">
            <span>@</span>
            <input
              class="profile-editor-username"
              type="text"
              maxlength="50"
              autocomplete="username"
              value="${escapeHTML(currentUsername)}"
              placeholder="username">
          </div>
          <small>Используется для входа в аккаунт.</small>
        </label>

        <label class="profile-editor-field">
          <span>О себе</span>
          <textarea
            class="profile-editor-bio"
            maxlength="500"
            rows="5"
            placeholder="Расскажите немного о себе">${escapeHTML(currentBio)}</textarea>
        </label>

      </div>

      <p class="profile-editor-error" aria-live="polite"></p>

      <div class="profile-editor-actions">
        <button class="profile-editor-cancel" type="button">
          Отмена
        </button>
        <button class="profile-editor-save" type="button">
          Сохранить
        </button>
      </div>
    </div>
  `;

  container.appendChild(overlay);

  const avatarInput = overlay.querySelector('.profile-editor-avatar-input');
  overlay.querySelector('.profile-editor-avatar-change').addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files?.[0];
    avatarInput.value = '';
    if (file) openAvatarEditor(container, file, user, onLogout);
  });

  const displayNameInput =
    overlay.querySelector('.profile-editor-display-name');
  const usernameInput =
    overlay.querySelector('.profile-editor-username');
  const bioInput =
    overlay.querySelector('.profile-editor-bio');
  const errorText =
    overlay.querySelector('.profile-editor-error');
  const saveButton =
    overlay.querySelector('.profile-editor-save');

  let saving = false;

  function closeEditor() {
    if (saving) return;
    overlay.remove();
  }

  overlay.querySelector('.profile-editor-close')
    .addEventListener('click', closeEditor);

  overlay.querySelector('.profile-editor-cancel')
    .addEventListener('click', closeEditor);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeEditor();
  });

  saveButton.addEventListener('click', async () => {
    if (saving) return;

    const displayName = displayNameInput.value.trim();
    const username = usernameInput.value.trim().replace(/^@+/, '');
    const bio = bioInput.value.trim();

    if (username.length < 3) {
      errorText.textContent =
        'Имя пользователя должно содержать минимум 3 символа.';
      usernameInput.focus();
      return;
    }

    saving = true;
    saveButton.disabled = true;
    saveButton.textContent = 'Сохраняем...';
    errorText.textContent = '';

    try {
      const result = await updateProfile(
        username,
        displayName,
        bio
      );

      const updatedUser = {
        ...user,
        username: result.username,
        display_name: result.display_name,
        bio: result.bio
      };

      setUser(updatedUser);
      overlay.remove();

      renderProfileScreen(
        container,
        updatedUser,
        onLogout
      );
    } catch (error) {
      console.error(
        'Rebunar: ошибка сохранения профиля:',
        error
      );

      errorText.textContent =
        error.message || 'Не удалось сохранить профиль';

      saving = false;
      saveButton.disabled = false;
      saveButton.textContent = 'Сохранить';
    }
  });

  displayNameInput.focus();
}

function openAvatarEditor(container, file, user, onLogout) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    alert('Выберите фотографию в формате JPG, PNG или WebP.');
    return;
  }

  if (file.size > 15 * 1024 * 1024) {
    alert('Размер исходной фотографии не должен превышать 15 МБ.');
    return;
  }

  const imageUrl = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    createCropEditor(container, image, imageUrl, user, onLogout);
  };

  image.onerror = () => {
    URL.revokeObjectURL(imageUrl);
    alert('Не удалось открыть эту фотографию.');
  };

  image.src = imageUrl;
}

function createCropEditor(container, image, imageUrl, user, onLogout) {
  const stageSize = 260;
  const baseScale = Math.max(
    stageSize / image.naturalWidth,
    stageSize / image.naturalHeight
  );

  let zoom = 1;
  let offsetX = 0;
  let offsetY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let dragging = false;
  let saving = false;

  const overlay = document.createElement('div');
  overlay.className = 'avatar-editor-overlay';

  overlay.innerHTML = `
    <div class="avatar-editor" role="dialog" aria-modal="true"
      aria-labelledby="avatar-editor-title">
      <div class="avatar-editor-heading">
        <h2 id="avatar-editor-title">Настройка аватара</h2>
        <button class="avatar-editor-close" type="button"
          aria-label="Закрыть">×</button>
      </div>

      <div class="avatar-editor-stage">
        <img class="avatar-editor-image" alt="Предпросмотр аватара">
      </div>

      <p class="avatar-editor-hint">
        Перемещайте фото пальцем, чтобы выбрать нужную область
      </p>

      <label class="avatar-editor-zoom">
        <span>Масштаб</span>
        <input class="avatar-editor-range" type="range"
          min="1" max="3" step="0.01" value="1">
      </label>

      <p class="avatar-editor-error" aria-live="polite"></p>

      <div class="avatar-editor-actions">
        <button class="avatar-editor-cancel" type="button">Отмена</button>
        <button class="avatar-editor-save" type="button">Сохранить</button>
      </div>
    </div>
  `;

  container.appendChild(overlay);

  const stage = overlay.querySelector('.avatar-editor-stage');
  const preview = overlay.querySelector('.avatar-editor-image');
  const range = overlay.querySelector('.avatar-editor-range');
  const saveButton = overlay.querySelector('.avatar-editor-save');
  const errorText = overlay.querySelector('.avatar-editor-error');

  preview.src = image.src;

  function clampPosition() {
    const width = image.naturalWidth * baseScale * zoom;
    const height = image.naturalHeight * baseScale * zoom;

    const maxX = Math.max(0, (width - stageSize) / 2);
    const maxY = Math.max(0, (height - stageSize) / 2);

    offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
    offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
  }

  function updatePreview() {
    clampPosition();

    const width = image.naturalWidth * baseScale * zoom;
    const height = image.naturalHeight * baseScale * zoom;

    preview.style.width = `${width}px`;
    preview.style.height = `${height}px`;
    preview.style.transform =
      `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  }

  function closeEditor() {
    if (saving) return;
    overlay.remove();
    URL.revokeObjectURL(imageUrl);
  }

  overlay.querySelector('.avatar-editor-close')
    .addEventListener('click', closeEditor);

  overlay.querySelector('.avatar-editor-cancel')
    .addEventListener('click', closeEditor);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeEditor();
  });

  range.addEventListener('input', () => {
    zoom = Number(range.value);
    updatePreview();
  });

  stage.addEventListener('pointerdown', (event) => {
    dragging = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener('pointermove', (event) => {
    if (!dragging) return;

    offsetX += event.clientX - pointerX;
    offsetY += event.clientY - pointerY;

    pointerX = event.clientX;
    pointerY = event.clientY;

    updatePreview();
  });

  stage.addEventListener('pointerup', () => {
    dragging = false;
  });

  stage.addEventListener('pointercancel', () => {
    dragging = false;
  });

  saveButton.addEventListener('click', async () => {
    if (saving) return;

    saving = true;
    saveButton.disabled = true;
    saveButton.textContent = 'Сохраняем...';
    errorText.textContent = '';

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;

      const context = canvas.getContext('2d');
      if (!context) throw new Error('Не удалось подготовить изображение');

      const factor = 512 / stageSize;
      const width = image.naturalWidth * baseScale * zoom * factor;
      const height = image.naturalHeight * baseScale * zoom * factor;
      const x = (stageSize / 2 + offsetX) * factor - width / 2;
      const y = (stageSize / 2 + offsetY) * factor - height / 2;

      context.drawImage(image, x, y, width, height);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          result => result
            ? resolve(result)
            : reject(new Error('Не удалось обработать фотографию')),
          'image/jpeg',
          0.9
        );
      });

      const result = await uploadAvatar(blob);

      if (!result.avatar) {
        throw new Error('Сервер не вернул адрес аватара');
      }

      // Merge with the latest session state: frame selection can update it
      // while the avatar editor is open, so the older profile snapshot must
      // not overwrite equipped_frame or other newer account fields.
      const latestUser = getUser() || user;
      const updatedUser = { ...latestUser, avatar: result.avatar };
      setUser(updatedUser);
      overlay.remove();
      URL.revokeObjectURL(imageUrl);

      renderProfileScreen(container, updatedUser, onLogout);
    } catch (error) {
      console.error('Rebunar: ошибка сохранения аватара:', error);
      errorText.textContent = error.message || 'Не удалось сохранить аватар';
      saving = false;
      saveButton.disabled = false;
      saveButton.textContent = 'Сохранить';
    }
  });

  updatePreview();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

async function copyProfileText(value) {
  if(navigator.clipboard?.writeText&&window.isSecureContext) return navigator.clipboard.writeText(value);
  const field=document.createElement('textarea');field.value=value;field.setAttribute('readonly','');
  field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();
  const copied=document.execCommand('copy');field.remove();if(!copied)throw new Error('Clipboard copy failed');
}
function showProfileToast(container,message) {
  let toast=container.querySelector('.profile-toast');
  if(!toast){toast=document.createElement('div');toast.className='profile-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');container.appendChild(toast);}
  toast.textContent=message;toast.classList.add('is-visible');clearTimeout(toast._hideTimer);
  toast._hideTimer=setTimeout(()=>toast.classList.remove('is-visible'),2400);
}
