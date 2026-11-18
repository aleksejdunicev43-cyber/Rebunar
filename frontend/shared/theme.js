const THEME_STORAGE_PREFIX = 'rebunar.profile.theme.v2.';

export const THEMES = {
  blackLabel: {
    name: 'Black Label',
    description: 'Исходное тёмное оформление Rebunar с изумрудными акцентами.'
  }
};

export const DEFAULT_THEME = 'blackLabel';

function storageKey(userId) {
  return THEME_STORAGE_PREFIX + (userId ?? 'guest');
}

export function getThemes() {
  return THEMES;
}

export function getTheme(userId = 'guest') {
  try {
    const saved = localStorage.getItem(storageKey(userId));
    if (saved === DEFAULT_THEME) return DEFAULT_THEME;
    // Any previously selected alternate theme now falls back to the sole
    // supported appearance, Black Label.
    localStorage.setItem(storageKey(userId), DEFAULT_THEME);
  } catch {}
  return DEFAULT_THEME;
}

export function applyTheme(theme, userId = 'guest') {
  document.documentElement.dataset.theme = DEFAULT_THEME;
  try {
    localStorage.setItem(storageKey(userId), DEFAULT_THEME);
  } catch {}
  return DEFAULT_THEME;
}

export function initializeTheme(user) {
  return applyTheme(DEFAULT_THEME, user?.id ?? 'guest');
}
