/**
 * REBUNAR — ROUTER
 * Единая система навигации приложения.
 */

const routes = new Map();
const listeners = new Set();

let currentRoute = null;

export function registerRoute(path, handler) {
  if (routes.has(path)) {
    throw new Error(`Маршрут уже зарегистрирован: ${path}`);
  }

  routes.set(path, handler);
}

export function navigate(path, params = {}) {
  const handler = routes.get(path);

  if (!handler) {
    console.error(`Маршрут не найден: ${path}`);
    return;
  }

  currentRoute = { path, params };

  window.history.pushState(currentRoute, '', `#${path}`);

  handler(params);

  listeners.forEach(listener => listener(currentRoute));
}

export function getCurrentRoute() {
  return currentRoute;
}

export function subscribeToRoute(listener) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export function initRouter(defaultPath = 'home') {
  window.addEventListener('popstate', event => {
    const state = event.state;

    if (!state || !routes.has(state.path)) {
      navigate(defaultPath);
      return;
    }

    currentRoute = state;
    routes.get(state.path)(state.params || {});

    listeners.forEach(listener => listener(currentRoute));
  });

  const initialPath = window.location.hash.replace(/^#\/?/, '');

  if (initialPath && routes.has(initialPath)) {
    currentRoute = { path: initialPath, params: {} };
    routes.get(initialPath)({});
  } else {
    navigate(defaultPath);
  }
}
