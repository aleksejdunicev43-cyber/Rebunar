/**
 * REBUNAR — AUTH SESSION
 * Центральное состояние пользовательской сессии.
 */

import { getCurrentUser } from './api.js';

let currentUser = null;
let initialized = false;
const listeners = new Set();

export function getUser() {
  return currentUser;
}

export function isAuthenticated() {
  return Boolean(currentUser);
}

export function isAuthInitialized() {
  return initialized;
}

export function subscribeToAuth(listener) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach(listener => listener(currentUser));
}

export async function initializeAuth() {
  try {
    const result = await getCurrentUser();

    currentUser = result.logged_in ? result : null;
  } catch (error) {
    console.error('Rebunar: ошибка проверки авторизации:', error);
    currentUser = null;
  } finally {
    initialized = true;
    notify();
  }

  return currentUser;
}

export function setUser(user) {
  currentUser = user;
  initialized = true;
  notify();
}

export function clearUser() {
  currentUser = null;
  initialized = true;
  notify();
}
