// Theme management utility for instant, zero-lag Dark/Light mode switching
export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'nexen_theme';

/**
 * Returns the currently active theme from localStorage or system preference.
 */
export function getInitialTheme(): ThemeMode {
  try {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/**
 * Applies the theme directly to <html> element with zero-lag transition suppression.
 * Disabling CSS transitions during the class swap prevents hundreds of elements
 * from triggering simultaneous expensive layout & paint recalculations.
 */
export function applyTheme(theme: ThemeMode, disableTransitions = true): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (disableTransitions) {
    // Add temporary class that forces `transition: none !important` across all elements
    root.classList.add('no-transitions');
  }

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.warn('Could not save theme to localStorage:', e);
  }

  if (disableTransitions) {
    // Force a DOM style flush so the class application takes effect instantly without transition
    window.getComputedStyle(root).opacity;

    // Remove the transition suppressor on the next microtask/animation frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('no-transitions');
      });
    });
  }
}
