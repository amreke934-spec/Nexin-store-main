/**
 * Comprehensive Zoom Disabler for Web & Mobile
 * Prevents:
 * 1. iOS Safari Pinch-to-zoom (gesturestart, gesturechange, gestureend)
 * 2. Multi-touch pinch zoom (touchmove with >= 2 fingers)
 * 3. Double-tap to zoom on mobile
 * 4. Desktop mouse wheel zoom (Ctrl/Cmd + Wheel)
 * 5. Desktop keyboard zoom shortcuts (Ctrl/Cmd + '+' / '-' / '=' / '0')
 */
export function initZoomPrevention(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 1. Block Safari iOS gesture events (Pinch-to-zoom)
  const blockEvent = (e: Event) => {
    e.preventDefault();
  };

  document.addEventListener('gesturestart', blockEvent, { passive: false });
  document.addEventListener('gesturechange', blockEvent, { passive: false });
  document.addEventListener('gestureend', blockEvent, { passive: false });

  // 2. Block Multi-touch pinch zoom
  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // 3. Block double-tap to zoom
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        const target = e.target as HTMLElement | null;
        const isInputField =
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable);

        if (!isInputField) {
          e.preventDefault();
        }
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );

  // 4. Block desktop Ctrl/Cmd + Mouse Wheel zoom
  window.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // 5. Block Ctrl/Cmd + Plus/Minus/Zero keyboard zoom shortcuts
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === '+' ||
          e.key === '-' ||
          e.key === '=' ||
          e.key === '_' ||
          e.key === '0' ||
          e.keyCode === 187 ||
          e.keyCode === 189 ||
          e.keyCode === 107 ||
          e.keyCode === 109 ||
          e.keyCode === 48 ||
          e.keyCode === 96)
      ) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
}
