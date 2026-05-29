const THEME_KEY = 'localchat_theme';

export function getTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'light';
  } catch {
    return 'light';
  }
}

export function setTheme(mode) {
  localStorage.setItem(THEME_KEY, mode);
  document.documentElement.setAttribute('data-theme', mode);
}

export function toggleTheme() {
  const current = getTheme();
  const next = current === 'light' ? 'dark' : 'light';
  setTheme(next);
  return next;
}

export function initTheme() {
  const mode = getTheme();
  document.documentElement.setAttribute('data-theme', mode);
  return mode;
}
