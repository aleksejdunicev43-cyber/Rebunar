/**
 * REBUNAR — USER PRESENCE
 * Обновление активности авторизованного пользователя.
 */

import { api } from '../../shared/api/client.js';

let heartbeatTimer = null;

async function sendHeartbeat() {
  try {
    await api.post('/presence/heartbeat', {});
  } catch (error) {
    console.warn('Rebunar: не удалось обновить активность:', error.message);
  }
}

export function startPresence() {
  if (heartbeatTimer !== null) return;

  sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, 60_000);
}

export function stopPresence() {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
