import { RoomEvent, MatrixEventEvent } from 'matrix-js-sdk';
import { getMatrixClient, isMatrixSyncReady } from './client.js';

function requireClient() {
  const client = getMatrixClient();

  if (!client || !isMatrixSyncReady()) {
    throw new Error('Matrix ещё не подключён или не завершил синхронизацию.');
  }

  return client;
}

function mapEvent(event) {
  const encrypted = event.isEncrypted();

  if (encrypted && event.isDecryptionFailure()) {
    return {
      id: event.getId(),
      sender: event.getSender(),
      body: 'Не удалось расшифровать это сообщение.',
      timestamp: event.getTs(),
      status: 'DECRYPTION_FAILED'
    };
  }

  const content = encrypted
    ? event.getClearContent()
    : event.getContent();

  if (!content || content.msgtype !== 'm.text') {
    return null;
  }

  if (!encrypted && event.getType() !== 'm.room.message') {
    return null;
  }

  if (typeof content.body !== 'string') {
    return null;
  }

  return {
    id: event.getId(),
    sender: event.getSender(),
    body: content.body,
    timestamp: event.getTs(),
    status: event.status || 'SENT'
  };
}

export function getMatrixRooms() {
  return requireClient()
    .getRooms()
    .filter(room => room.getMyMembership() === 'join')
    .map(room => ({
      id: room.roomId,
      name: room.name || room.roomId,
      unreadCount: room.getUnreadNotificationCount(),
      lastActivity: room.getLastActiveTimestamp()
    }))
    .sort((a, b) => b.lastActivity - a.lastActivity);
}

export function getMatrixRoomMessages(roomId) {
  const client = requireClient();
  const room = client.getRoom(roomId);

  if (!room || room.getMyMembership() !== 'join') {
    throw new Error('Комната не найдена или пользователь не состоит в ней.');
  }

  return room
    .getLiveTimeline()
    .getEvents()
    .map(mapEvent)
    .filter(Boolean);
}

export async function sendMatrixMessage(roomId, body) {
  const client = requireClient();
  const room = client.getRoom(roomId);
  const message = String(body || '').trim();

  if (!room || room.getMyMembership() !== 'join') {
    throw new Error('Комната не найдена или пользователь не состоит в ней.');
  }

  if (!message) {
    throw new Error('Нельзя отправить пустое сообщение.');
  }

  return client.sendMessage(roomId, {
    msgtype: 'm.text',
    body: message
  });
}

export function subscribeToMatrixMessages(roomId, callback) {
  const client = requireClient();

  if (typeof callback !== 'function') {
    throw new TypeError('Для подписки нужен callback.');
  }

  const room = client.getRoom(roomId);

  if (!room || room.getMyMembership() !== 'join') {
    throw new Error('Комната не найдена или пользователь не состоит в ней.');
  }

  const publishEvent = event => {
    const message = mapEvent(event);

    if (message) {
      callback(message);
    }
  };

  const onTimeline = (event, eventRoom, toStartOfTimeline, removed) => {
    if (eventRoom?.roomId !== roomId || toStartOfTimeline || removed) {
      return;
    }

    // Зашифрованные события получаем после расшифровки
    // через MatrixEventEvent.Decrypted на клиенте.
    if (event.isEncrypted()) {
      return;
    }

    publishEvent(event);
  };

  const onDecrypted = event => {
    if (event.getRoomId() !== roomId) {
      return;
    }

    publishEvent(event);
  };

  client.on(RoomEvent.Timeline, onTimeline);
  client.on(MatrixEventEvent.Decrypted, onDecrypted);

  return () => {
    client.removeListener(RoomEvent.Timeline, onTimeline);
    client.removeListener(MatrixEventEvent.Decrypted, onDecrypted);
  };
}

const historyRequests = new Map();

export async function loadOlderMatrixMessages(roomId, limit = 30) {
  const client = requireClient();
  const room = client.getRoom(roomId);

  if (!room || room.getMyMembership() !== 'join') {
    throw new Error('Комната не найдена или пользователь не состоит в ней.');
  }

  if (historyRequests.has(roomId)) {
    return historyRequests.get(roomId);
  }

  const request = (async () => {
    const timeline = room.getLiveTimeline();

    return client.paginateEventTimeline(timeline, {
      backwards: true,
      limit: Math.max(1, Math.min(Number(limit) || 30, 100))
    });
  })();

  historyRequests.set(roomId, request);

  try {
    return await request;
  } finally {
    historyRequests.delete(roomId);
  }
}
