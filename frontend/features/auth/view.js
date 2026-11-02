/**
 * REBUNAR — AUTH VIEW
 * Экран входа и регистрации.
 */

import { login, register, getCurrentUser } from './api.js';
import { setUser } from './session.js';

export function renderAuthScreen(container, onSuccess = () => {}) {
  let mode = 'login';

  function render(message = '') {
    const isRegister = mode === 'register';

    container.innerHTML = `
      <section class="auth-screen">
        <div class="auth-card">
          <div class="auth-brand">REBUNAR</div>
          <h1>${isRegister ? 'Создание аккаунта' : 'С возвращением'}</h1>
          <p class="auth-description">
            ${isRegister
              ? 'Создай аккаунт и присоединяйся к сообществу.'
              : 'Войди в свой аккаунт Rebunar.'}
          </p>

          <form class="auth-form" autocomplete="off">
            <label for="auth-username">Логин</label>
            <input
              id="auth-username"
              name="rebunar_login"
              type="text"
              minlength="3"
              maxlength="50"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
              placeholder="Твой логин"
              required
            >

            <label for="auth-password">Пароль</label>
            <input
              id="auth-password"
              name="rebunar_password"
              type="password"
              minlength="4"
              autocomplete="new-password"
              placeholder="Твой пароль"
              required
            >

            <p class="auth-message" aria-live="polite"></p>

            <button class="auth-submit" type="submit">
              ${isRegister ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </form>

          <button class="auth-switch" type="button">
            ${isRegister
              ? 'Уже есть аккаунт? Войти'
              : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </section>
    `;

    const form = container.querySelector('.auth-form');
    const messageElement = container.querySelector('.auth-message');
    const switchButton = container.querySelector('.auth-switch');

    messageElement.textContent = message;

    switchButton.addEventListener('click', () => {
      mode = mode === 'login' ? 'register' : 'login';
      render();
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const username = form.elements.rebunar_login.value.trim();
      const password = form.elements.rebunar_password.value;
      const submitButton = form.querySelector('.auth-submit');

      submitButton.disabled = true;
      submitButton.textContent = 'Подождите...';
      messageElement.textContent = '';

      try {
        let user;

        if (mode === 'register') {
          await register(username, password);
          messageElement.textContent = 'Аккаунт создан. Выполняем вход...';
          user = await login(username, password);
        } else {
          user = await login(username, password);
        }

        const currentUser = await getCurrentUser();

        if (!currentUser?.logged_in) {
          throw new Error('Не удалось загрузить профиль после входа.');
        }

        setUser(currentUser);
        onSuccess(currentUser);
      } catch (error) {
        messageElement.textContent = error.message;
        submitButton.disabled = false;
        submitButton.textContent = isRegister
          ? 'Зарегистрироваться'
          : 'Войти';
      }
    });
  }

  render();
}
