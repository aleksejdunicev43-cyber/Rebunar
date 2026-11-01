/**
 * REBUNAR — PROFILE VIEW
 */

import { uploadAvatar, updateProfile } from './api.js';
import { setUser } from '../auth/session.js';

export function renderProfileScreen(container, user, onLogout) {
  const avatar = user.avatar
    ? `<img class="profile-avatar-image" src="${escapeHTML(user.avatar)}" alt="Аватар">`
    : `<div class="profile-avatar-placeholder">R</div>`;

  const displayName = user.display_name || user.username || 'Пользователь';
  const username = user.username || '—';
  const hasUserId = user.id !== undefined && user.id !== null;
  const userId = hasUserId ? String(user.id) : '—';
  const bio = user.bio || 'Пока нет описания профиля.';

  container.innerHTML = `
    <section class="screen profile-screen">
      <div class="profile-heading">
        <button class="screen-back" type="button" data-route="home"
          aria-label="На главную" title="На главную">
          <span aria-hidden="true">⤺</span>
        </button>
        <div class="profile-heading-main">
          <h1>Профиль</h1>
          <span class="profile-status">Публичный профиль</span>
        </div>

        <button class="profile-settings-button" type="button"
          data-route="settings" aria-label="Настройки"
          title="Настройки">
          <span class="profile-settings-gear" aria-hidden="true">⚙</span>
        </button>
      </div>

      <div class="profile-card">
        <button class="profile-avatar profile-avatar-button"
          type="button" aria-label="Аватар профиля">
          ${avatar}
        </button>

        <input class="profile-avatar-input" type="file"
          accept="image/jpeg,image/png,image/webp" hidden>

        <div class="profile-account-id">
          <span>ID: ${escapeHTML(userId)}</span>
          <button class="profile-copy-id" type="button"
            aria-label="Скопировать ID" title="Скопировать ID"
            ${hasUserId ? '' : 'disabled'}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="8" y="8" width="12" height="12" rx="2"></rect>
              <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"></path>
            </svg>
          </button>
        </div>

        <div class="profile-identity">
          <h2>${escapeHTML(displayName)}</h2>
          <p class="profile-username">@${escapeHTML(username)}</p>
        </div>

        <div class="profile-details">
          <div class="profile-bio">
            <span>О себе</span>
            <p>${escapeHTML(bio)}</p>
          </div>
        </div>

        <button class="profile-edit" type="button">
          Редактировать профиль
        </button>

        <button class="profile-logout" type="button">
          Выйти из аккаунта
        </button>
      </div>
    </section>
  `;

  container.querySelector('.profile-edit')
    .addEventListener('click', () => {
      openProfileEditor(container, user, onLogout);
    });

  container.querySelector('.profile-logout')
    .addEventListener('click', onLogout);

  container.querySelector('.profile-copy-id')
    .addEventListener('click', async (event) => {
      const button = event.currentTarget;

      try {
        await navigator.clipboard.writeText(userId);
        button.textContent = '✓';
        button.setAttribute('aria-label', 'ID скопирован');
        button.title = 'ID скопирован';
      } catch (error) {
        console.warn('Rebunar: не удалось скопировать ID:', error);
        button.title = 'Не удалось скопировать ID';
      }
    });

  const avatarButton = container.querySelector('.profile-avatar-button');
  const fileInput = container.querySelector('.profile-avatar-input');

  avatarButton.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) openAvatarEditor(container, file, user, onLogout);
    fileInput.value = '';
  });
}


function openProfileEditor(container, user, onLogout) {
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

      setUser({ ...user, avatar: result.avatar });
      overlay.remove();
      URL.revokeObjectURL(imageUrl);

      renderProfileScreen(container, { ...user, avatar: result.avatar },
        onLogout);
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
