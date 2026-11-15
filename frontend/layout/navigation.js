/**
 * REBUNAR — NAVIGATION
 * Управление кнопками навигации.
 */

export function initNavigation(root, navigate, subscribeToRoute) {
  root.addEventListener('click', event => {
    const moreToggle = event.target.closest('.mobile-more-toggle');
    const moreMenu = root.querySelector('.mobile-more-menu');
    if (moreToggle && root.contains(moreToggle)) {
      const isOpen = moreToggle.getAttribute('aria-expanded') === 'true';
      moreToggle.setAttribute('aria-expanded', String(!isOpen));
      moreMenu.hidden = isOpen;
      return;
    }

    const button = event.target.closest('[data-route]');

    if (!button || !root.contains(button)) {
      if (moreMenu && !moreMenu.hidden && !event.target.closest('.mobile-more-menu')) {
        moreMenu.hidden = true;
        root.querySelector('.mobile-more-toggle')?.setAttribute('aria-expanded', 'false');
      }
      return;
    }

    const path = button.dataset.route;
    if (moreMenu) moreMenu.hidden = true;
    root.querySelector('.mobile-more-toggle')?.setAttribute('aria-expanded', 'false');

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
    const moreToggle = root.querySelector('.mobile-more-toggle');
    const hasSecondaryActive = ['favorites', 'creators'].includes(route.path);
    moreToggle?.classList.toggle('is-active', hasSecondaryActive);
  }

  const unsubscribe = subscribeToRoute(updateActiveRoute);

  return {
    destroy() {
      unsubscribe();
    }
  };
}
