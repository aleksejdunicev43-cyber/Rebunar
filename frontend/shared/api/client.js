/**
 * REBUNAR — API CLIENT
 * Единая точка взаимодействия с сервером.
 */

const API_BASE = '/api';

async function request(path, options = {}) {
  const config = {
    method: options.method || 'GET',
    credentials: 'same-origin',
    headers: {
      ...options.headers
    }
  };

  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      config.body = options.body;
    } else {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(options.body);
    }
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, config);
  } catch {
    throw new Error('Не удалось подключиться к серверу');
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error('Сервер вернул некорректный ответ');
  }

  if (!response.ok) {
    throw new Error(data.error || `Ошибка сервера: ${response.status}`);
  }

  return data;
}

export const api = {
  get(path) {
    return request(path);
  },

  post(path, body) {
    return request(path, {
      method: 'POST',
      body
    });
  },

  upload(path, formData) {
    return request(path, {
      method: 'POST',
      body: formData
    });
  },

  delete(path) {
    return request(path, {
      method: 'DELETE'
    });
  }
};
