/**
 * REBUNAR — MATRIX API
 * Управление привязкой Matrix к аккаунту Rebunar.
 */

import { api } from '../../shared/api/client.js';

export function getMatrixStatus() {
  return api.get('/matrix/status');
}

export function linkMatrixAccount({ accessToken, matrixUserId, deviceId }) {
  return api.post('/matrix/link', {
    access_token: accessToken,
    matrix_user_id: matrixUserId,
    device_id: deviceId || null
  });
}

export function unlinkMatrixAccount() {
  return api.delete('/matrix/link');
}
