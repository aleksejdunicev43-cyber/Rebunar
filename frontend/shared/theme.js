const THEME_STORAGE_KEY = 'rebunar-theme';

export const THEMES = {
  emerald: {
    name: 'Яркий изумруд',
    description: 'Насыщенный зелёный, сбалансированный и приятный для глаз.'
  },
  neon: {
    name: 'Неон',
    description: 'Максимум яркости и насыщенные светящиеся оттенки.'
  },
  forest: {
    name: 'Лесной',
    description: 'Природные оттенки зелёного, спокойный и стильный вид.'
  },
  mint: {
    name: 'Мятный',
    description: 'Светлый зелёный с холодным подтоном, ощущение чистоты и простора.'
  },
  darkGreen: {
    name: 'Тёмный зелёный',
    description: 'Глубокий зелёный фон, элегантный и современный стиль.'
  },
  cyberNeon: {
    name: 'Кибер-неон',
    description: 'Футуристичный интерфейс с неоновыми зелёными и бирюзовыми акцентами.'
  }
};

export const DEFAULT_THEME = 'emerald';

export function getThemes() {
  return THEMES;
}

export function getTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);

  if (Object.hasOwn(THEMES, saved)) {
    return saved;
  }

  localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME);
  return DEFAULT_THEME;
}

export function applyTheme(theme) {
  const selected = Object.hasOwn(THEMES, theme)
    ? theme
    : DEFAULT_THEME;

  document.documentElement.dataset.theme = selected;
  localStorage.setItem(THEME_STORAGE_KEY, selected);

  return selected;
}

export function initializeTheme() {
  applyTheme(getTheme());
}
