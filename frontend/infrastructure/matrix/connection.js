/**
 * REBUNAR — MATRIX CONNECTION
 * Координация SSO, привязки аккаунта и E2EE.
 */

import {
  startMatrixSso,
  consumeMatrixSsoCallback,
  exchangeMatrixSsoToken
} from './sso.js';

import {
  getMatrixStatus,
  linkMatrixAccount,
  unlinkMatrixAccount
} from './api.js';

import {
  initializeMatrix,
  disconnectMatrix
} from './client.js';

const MATRIX_HOMESERVER = 'https://matrix.org';

export function beginMatrixConnection() {
  startMatrixSso();
}

export async function completeMatrixConnection() {
  const loginToken = consumeMatrixSsoCallback();

  if (!loginToken) return null;

  const credentials = await exchangeMatrixSsoToken(loginToken);

  const linkedAccount = await linkMatrixAccount({
    accessToken: credentials.accessToken,
    matrixUserId: credentials.userId,
    deviceId: credentials.deviceId
  });

  try {
    await initializeMatrix({
      baseUrl: MATRIX_HOMESERVER,
      userId: credentials.userId,
      accessToken: credentials.accessToken,
      deviceId: credentials.deviceId
    });
  } catch (error) {
    throw new Error(
      'Аккаунт Matrix привязан, но E2EE не удалось запустить: ' +
      error.message
    );
  }

  return {
    userId: linkedAccount.matrix_user_id,
    deviceId: linkedAccount.device_id
  };
}

export function getLinkedMatrixAccount() {
  return getMatrixStatus();
}

export async function removeMatrixConnection() {
  await unlinkMatrixAccount();
  await disconnectMatrix();
}
