/**
 * REBUNAR — NAVIGATION
 * Управление кнопками навигации.
 */

export function initNavigation(root, navigate, subscribeToRoute) {
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-route]');

    if (!button || !root.contains(button)) {
      return;
    }

    const path = button.dataset.route;

    if (path) {
      navigate(path);
    }
  });

  function updateActiveRoute(route) {
    root.querySelectorAll('[data-route]').forEach(button => {
      const isActive = button.dataset.route === route.path;

      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  const unsubscribe = subscribeToRoute(updateActiveRoute);

  return {
    destroy() {
      unsubscribe();
    }
  };
}
