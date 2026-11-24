/**
 * REBUNAR — SETTINGS
 * Центральный раздел настроек приложения.
 */

import { changePassword } from '../profile/api.js';
import { getUser } from '../auth/session.js';
import { openCreatorChoice } from '../profile/view.js';
import { navigate } from '../../app/router.js';
import { getLinkedMatrixAccount, beginMatrixConnection, removeMatrixConnection } from '../../infrastructure/matrix/connection.js';

export function renderSettingsScreen(outlet) {
  outlet.innerHTML = `
    <section class="screen settings-screen">
      <div class="settings-heading">
        <button class="settings-breadcrumb" type="button" data-route="profile"
          aria-label="Вернуться в профиль" title="Вернуться в профиль">
          <span class="settings-breadcrumb-arrow" aria-hidden="true">↩</span>
          <span class="settings-eyebrow">REBUNAR / CONTROL</span>
        </button>
        <h1>Настройки</h1>
        <p>Управление аккаунтом и приложением</p>
      </div>

      <div class="settings-section">
        <h2>Создание</h2>
        <p>Инструменты для авторов и разработчиков</p>
      </div>
      <div class="settings-list">
        <button class="settings-item" type="button" data-action="creator">
          <span class="settings-icon">✦</span>
          <span class="settings-item-content">
            <strong>Кабинет автора</strong>
            <small>Создание новелл, вебтунов и других историй</small>
          </span>
          <span class="settings-arrow">›</span>
        </button>
      </div>

      <div class="settings-section">
        <h2>Аккаунт</h2>
        <p>Личные данные и защита учётной записи</p>
      </div>
      <div class="settings-list">
        <button class="settings-item" type="button" data-action="edit-profile">
          <span class="settings-icon">✎</span>
          <span class="settings-item-content">
            <strong>Изменить профиль</strong>
            <small>Имя, аватар и описание «О себе»</small>
          </span>
          <span class="settings-arrow">›</span>
        </button>

        <button class="settings-item" type="button" data-action="security">
          <span class="settings-icon">◇</span>
          <span class="settings-item-content">
            <strong>Безопасность</strong>
            <small>Пароль и защита аккаунта</small>
          </span>
          <span class="settings-arrow">›</span>
        </button>

        <div class="settings-item settings-item-disabled" aria-disabled="true">
          <span class="settings-icon">◇</span>
          <span class="settings-item-content">
            <strong>Приватность</strong>
            <small>Управление видимостью профиля и данных · будет добавлено</small>
          </span>
          <span class="settings-status">СКОРО</span>
        </div>

        <div class="settings-item settings-item-disabled" aria-disabled="true">
          <span class="settings-icon">♢</span>
          <span class="settings-item-content">
            <strong>Уведомления</strong>
            <small>Настройки оповещений · будут добавлены</small>
          </span>
          <span class="settings-status">СКОРО</span>
        </div>

        <div class="settings-item settings-item-disabled" aria-disabled="true">
          <span class="settings-icon">?</span>
          <span class="settings-item-content">
            <strong>Помощь и поддержка</strong>
            <small>Справка и связь с командой Rebunar · будет добавлено</small>
          </span>
          <span class="settings-status">СКОРО</span>
        </div>

        <button class="settings-item" type="button" data-action="matrix">
          <span class="settings-icon settings-icon-matrix">
            <img src="https://upload.wikimedia.org/wikipedia/commons/7/7c/Matrix_icon.svg"
              alt="Официальный символ Matrix" width="26" height="30" loading="lazy">
          </span>
          <span class="settings-item-content">
            <strong>Matrix и E2EE</strong>
            <small>Защищённые сообщения и сквозное шифрование</small>
          </span>
          <span class="settings-arrow">›</span>
        </button>

        <button class="settings-item" type="button" data-route="statistics">
          <span class="settings-icon">▥</span>
          <span class="settings-item-content">
            <strong>Статистика Rebunar</strong>
            <small>Регистрации и активность платформы</small>
          </span>
          <span class="settings-arrow">›</span>
        </button>

      </div>
    </section>
  `;

  outlet.querySelector('[data-action="creator"]')
    .addEventListener('click', () => openCreatorChoice(outlet));

  outlet.querySelector('[data-action="edit-profile"]')
    .addEventListener('click', () => {
      navigate('profile', { editProfile: true });
    });

  outlet.querySelector('[data-action="security"]')
    .addEventListener('click', () => {
      openSecurityEditor(outlet);
    });

  outlet.querySelector('[data-action="matrix"]')
    .addEventListener('click', () => {
      openMatrixEditor(outlet);
    });
}


async function openMatrixEditor(outlet) {
  const overlay = document.createElement('div');
  overlay.className = 'security-editor-overlay';

  overlay.innerHTML = `
    <div class="security-editor" role="dialog" aria-modal="true">
      <div class="security-editor-heading">
        <h2>Matrix и E2EE</h2>
        <button class="security-editor-close" type="button" aria-label="Закрыть">×</button>
      </div>

      <p class="security-editor-description">
        Дополнительное подключение сторонней системы Matrix для сквозного шифрования.
        <strong class="matrix-optional-note">Важно: для обычных личных чатов Rebunar Matrix не нужен. Ты можешь искать пользователей и переписываться прямо здесь.</strong>
        <span class="matrix-optional-note">При подключении откроется официальный вход Matrix во внешнем браузере — это отдельная авторизация, а не вход в Rebunar. Если ты просто хочешь общаться в Rebunar, ничего подключать не нужно.</span>
        <span class="matrix-trademark-note">
          Matrix — товарный знак The Matrix.org Foundation. Rebunar не связан с Foundation.
          <a href="https://matrix.org/" target="_blank" rel="noopener noreferrer">matrix.org</a>
        </span>
      </p>

      <div class="matrix-editor-status">Проверка подключения...</div>
      <p class="security-editor-error matrix-editor-error" role="alert"></p>

      <div class="security-editor-actions matrix-editor-actions">
        <button class="security-editor-save matrix-editor-connect" type="button">
          Подключить Matrix (дополнительно)
        </button>
        <button class="security-editor-cancel matrix-editor-disconnect" type="button">
          Отвязать аккаунт
        </button>
      </div>
    </div>
  `;

  outlet.appendChild(overlay);

  const status = overlay.querySelector('.matrix-editor-status');
  const error = overlay.querySelector('.matrix-editor-error');
  const connectButton = overlay.querySelector('.matrix-editor-connect');
  const disconnectButton = overlay.querySelector('.matrix-editor-disconnect');

  function closeEditor() {
    overlay.remove();
  }

  overlay.querySelector('.security-editor-close')
    .addEventListener('click', closeEditor);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeEditor();
  });

  async function refreshStatus() {
    status.textContent = 'Проверка подключения...';
    error.textContent = '';
    disconnectButton.hidden = true;

    try {
      const account = await getLinkedMatrixAccount();

      if (account.linked) {
        status.textContent = 'Подключён: ' + account.matrix_user_id;
        connectButton.hidden = false;
        connectButton.textContent = 'Переподключить Matrix';
        disconnectButton.hidden = false;
      } else {
        status.textContent = 'Matrix не подключён';
        connectButton.hidden = false;
        connectButton.textContent = 'Подключить Matrix (дополнительно)';
        disconnectButton.hidden = true;
      }
    } catch (err) {
      status.textContent = 'Не удалось проверить подключение';
      error.textContent = err.message;
      connectButton.hidden = false;
    }
  }

  connectButton.addEventListener('click', () => {
    error.textContent = '';

    try {
      beginMatrixConnection();
    } catch (err) {
      error.textContent = err.message;
    }
  });

  disconnectButton.addEventListener('click', async () => {
    disconnectButton.disabled = true;
    error.textContent = '';

    try {
      await removeMatrixConnection();
      await refreshStatus();
    } catch (err) {
      error.textContent = err.message;
    } finally {
      disconnectButton.disabled = false;
    }
  });

  await refreshStatus();
}

function openSecurityEditor(outlet) {
  const overlay = document.createElement('div');
  overlay.className = 'security-editor-overlay';

  overlay.innerHTML = `
    <div class="security-editor" role="dialog" aria-modal="true"
      aria-labelledby="security-editor-title">

      <div class="security-editor-heading">
        <h2 id="security-editor-title">Безопасность</h2>
        <button class="security-editor-close" type="button"
          aria-label="Закрыть">×</button>
      </div>

      <p class="security-editor-description">
        Измените пароль для входа в аккаунт Rebunar.
      </p>

      <div class="security-editor-fields">

        <label class="security-editor-field">
          <span>Текущий пароль</span>
          <input
            class="security-current-password"
            type="password"
            autocomplete="current-password"
            placeholder="Введите текущий пароль">
        </label>

        <label class="security-editor-field">
          <span>Новый пароль</span>
          <input
            class="security-new-password"
            type="password"
            autocomplete="new-password"
            minlength="4"
            placeholder="Минимум 4 символа">
        </label>

        <label class="security-editor-field">
          <span>Повтор нового пароля</span>
          <input
            class="security-confirm-password"
            type="password"
            autocomplete="new-password"
            minlength="4"
            placeholder="Повторите новый пароль">
        </label>

      </div>

      <p class="security-editor-error" aria-live="polite"></p>

      <div class="security-editor-actions">
        <button class="security-editor-cancel" type="button">
          Отмена
        </button>
        <button class="security-editor-save" type="button">
          Сохранить
        </button>
      </div>
    </div>
  `;

  outlet.appendChild(overlay);

  const currentInput =
    overlay.querySelector('.security-current-password');
  const newInput =
    overlay.querySelector('.security-new-password');
  const confirmInput =
    overlay.querySelector('.security-confirm-password');
  const errorText =
    overlay.querySelector('.security-editor-error');
  const saveButton =
    overlay.querySelector('.security-editor-save');

  let saving = false;

  function closeEditor() {
    if (saving) return;
    overlay.remove();
  }

  overlay.querySelector('.security-editor-close')
    .addEventListener('click', closeEditor);

  overlay.querySelector('.security-editor-cancel')
    .addEventListener('click', closeEditor);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeEditor();
  });

  saveButton.addEventListener('click', async () => {
    if (saving) return;

    const currentPassword = currentInput.value;
    const newPassword = newInput.value;
    const confirmPassword = confirmInput.value;

    errorText.textContent = '';

    if (!currentPassword) {
      errorText.textContent = 'Введите текущий пароль.';
      currentInput.focus();
      return;
    }

    if (newPassword.length < 4) {
      errorText.textContent =
        'Новый пароль должен содержать минимум 4 символа.';
      newInput.focus();
      return;
    }

    if (newPassword !== confirmPassword) {
      errorText.textContent =
        'Новые пароли не совпадают.';
      confirmInput.focus();
      return;
    }

    if (currentPassword === newPassword) {
      errorText.textContent =
        'Новый пароль должен отличаться от текущего.';
      newInput.focus();
      return;
    }

    saving = true;
    saveButton.disabled = true;
    saveButton.textContent = 'Сохраняем...';

    try {
      await changePassword(currentPassword, newPassword);

      currentInput.value = '';
      newInput.value = '';
      confirmInput.value = '';

      overlay.remove();

      alert('Пароль успешно изменён.');
    } catch (error) {
      console.error(
        'Rebunar: ошибка смены пароля:',
        error
      );

      errorText.textContent =
        error.message || 'Не удалось изменить пароль';

      saving = false;
      saveButton.disabled = false;
      saveButton.textContent = 'Сохранить';
    }
  });

  currentInput.focus();
}


