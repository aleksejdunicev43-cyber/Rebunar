import { createClient } from 'matrix-js-sdk';

export async function verifyMatrixCredentials({
  baseUrl,
  userId,
  accessToken,
  deviceId
}) {
  if (!baseUrl || !accessToken) {
    throw new Error('Не хватает данных авторизации Matrix.');
  }

  const client = createClient({
    baseUrl,
    accessToken
  });

  try {
    const identity = await client.whoami();

    if (identity.is_guest) {
      throw new Error('Гостевой Matrix-аккаунт нельзя привязать.');
    }

    if (!identity.user_id || identity.user_id !== userId) {
      throw new Error('Matrix ID не совпадает с подтверждённым аккаунтом.');
    }

    if (deviceId && identity.device_id !== deviceId) {
      throw new Error('ID устройства Matrix не совпадает.');
    }

    return {
      userId: identity.user_id,
      deviceId: identity.device_id || deviceId || null
    };
  } finally {
    await client.stopClient();
  }
}
let matrixClient = null;
let syncReady = false;
let initializationPromise = null;

export function getMatrixClient() {
  return matrixClient;
}

export function isMatrixSyncReady() {
  return syncReady;
}

export async function initializeMatrix({
  baseUrl,
  userId,
  accessToken,
  deviceId
}) {
  if (initializationPromise) {
    return initializationPromise;
  }

  if (!baseUrl || !userId || !accessToken || !deviceId) {
    throw new Error('Для подключения Matrix не хватает параметров авторизации.');
  }

  initializationPromise = (async () => {
    const client = createClient({
      baseUrl,
      userId,
      accessToken,
      deviceId
    });

    const cryptoDatabasePrefix =
      'rebunar-' +
      encodeURIComponent(userId) +
      '-' +
      encodeURIComponent(deviceId);

    await client.initRustCrypto({ cryptoDatabasePrefix });

    matrixClient = client;

    const syncPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Matrix не завершил начальную синхронизацию за 90 секунд.'));
      }, 90000);

      const cleanup = () => {
        clearTimeout(timeout);
        client.removeListener('sync', onSync);
      };

      const onSync = (state, previousState, data) => {
        if (state === 'PREPARED' || state === 'SYNCING') {
          cleanup();
          syncReady = true;
          resolve();
        } else if (state === 'ERROR') {
          const error = data?.error;
          const message = error?.message || 'Ошибка синхронизации Matrix';
          cleanup();
          reject(new Error(message));
        }
      };

      client.on('sync', onSync);
    });

    try {
      await client.startClient({ initialSyncLimit: 20 });
      await syncPromise;
      return client;
    } catch (error) {
      syncReady = false;
      matrixClient = null;
      await client.stopClient();
      throw error;
    }
  })();

  try {
    return await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

export async function disconnectMatrix() {
  const client = matrixClient;

  matrixClient = null;
  syncReady = false;
  initializationPromise = null;

  if (client) {
    await client.stopClient();
  }
}

