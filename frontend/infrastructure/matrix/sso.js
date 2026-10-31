/**
 * REBUNAR — MATRIX SSO
 * Официальная авторизация через Matrix SSO.
 */

import { createClient } from 'matrix-js-sdk';

const MATRIX_HOMESERVER = 'https://matrix.org';
const SSO_STATE_KEY = 'rebunar_matrix_sso_state';

function createSsoState() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);

  return Array.from(bytes, byte =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

export function startMatrixSso() {
  const state = createSsoState();

  sessionStorage.setItem(SSO_STATE_KEY, state);

  const redirectUrl = new URL(window.location.href);
  redirectUrl.search = '';
  redirectUrl.searchParams.set('state', state);

  const client = createClient({
    baseUrl: MATRIX_HOMESERVER
  });

  try {
    const ssoUrl = client.getSsoLoginUrl(redirectUrl.toString());
    window.location.assign(ssoUrl);
  } catch (error) {
    sessionStorage.removeItem(SSO_STATE_KEY);
    throw error;
  }
}

export function consumeMatrixSsoCallback() {
  const params = new URLSearchParams(window.location.search);
  const loginToken = params.get('loginToken');

  if (!loginToken) return null;

  const returnedState = params.get('state');
  const savedState = sessionStorage.getItem(SSO_STATE_KEY);

  sessionStorage.removeItem(SSO_STATE_KEY);

  // Удаляем одноразовый токен из адресной строки сразу.
  window.history.replaceState(
    {},
    document.title,
    window.location.pathname + window.location.hash
  );

  if (
    !savedState ||
    !returnedState ||
    savedState !== returnedState
  ) {
    throw new Error('Проверка Matrix SSO state не пройдена.');
  }

  return loginToken;
}

export async function exchangeMatrixSsoToken(loginToken) {
  if (!loginToken) {
    throw new Error('Matrix не передал одноразовый токен входа.');
  }

  const client = createClient({
    baseUrl: MATRIX_HOMESERVER
  });

  const login = await client.loginRequest({
    type: 'm.login.token',
    token: loginToken,
    initial_device_display_name: 'Rebunar'
  });

  if (!login.user_id || !login.access_token || !login.device_id) {
    throw new Error('Matrix вернул неполные данные авторизации.');
  }

  return {
    userId: login.user_id,
    accessToken: login.access_token,
    deviceId: login.device_id
  };
}
