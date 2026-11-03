const THEME_STORAGE_PREFIX = 'rebunar.profile.theme.';

export const THEMES = {
  steel: {
    name: 'Steel & Blood',
    description: 'Стальной интерфейс с кроваво-красными акцентами.'
  },
  cyber: {
    name: 'Cyberpunk',
    description: 'Холодный тёмный интерфейс с неоновыми бирюзовыми акцентами.'
  },
  sakura: {
    name: 'Anime: Sakura',
    description: 'Тёмная аниме-эстетика с розовыми и цветочными оттенками.'
  },
  fantasy: {
    name: 'Dark Fantasy',
    description: 'Тёмное фэнтези с мистическим золотом и бронзой.'
  }
};

export const DEFAULT_THEME = 'steel';

function storageKey(userId) {
  return THEME_STORAGE_PREFIX + (userId ?? 'guest');
}

export function getThemes() {
  return THEMES;
}

export function getTheme(userId = 'guest') {
  try {
    const saved = localStorage.getItem(storageKey(userId));
    if (Object.hasOwn(THEMES, saved)) return saved;
  } catch {}
  return DEFAULT_THEME;
}

export function applyTheme(theme, userId = 'guest') {
  const selected = Object.hasOwn(THEMES, theme) ? theme : DEFAULT_THEME;
  document.documentElement.dataset.theme = selected;
  try {
    localStorage.setItem(storageKey(userId), selected);
  } catch {}
  return selected;
}

export function initializeTheme(user) {
  return applyTheme(getTheme(user?.id ?? 'guest'), user?.id ?? 'guest');
}
