/**
 * REBUNAR — AUTH API
 * Запросы авторизации и текущего пользователя.
 */

import { api } from '../../shared/api/client.js';

export function getCurrentUser() {
  return api.get('/me');
}

export function login(username, password) {
  return api.post('/login', { username, password });
}

export function register(username, password) {
  return api.post('/register', { username, password });
}

export function logout() {
  return api.post('/logout', {});
}
