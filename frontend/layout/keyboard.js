/**
 * Keep the app shell stationary while the software keyboard is open.
 * Only the active message composer follows the visible viewport edge.
 */
export function initKeyboardLayout(root) {
  const shell = root.querySelector('.app-shell');
  if (!shell) return () => {};

  const viewport = window.visualViewport;
  const editableSelector = 'input:not([type="hidden"]):not([type="file"]), textarea, [contenteditable="true"]';
  let shellHeight = window.innerHeight;
  let editor = null;
  let composer = null;
  let keyboardWasOpen = false;

  function setShellHeight() {
    shellHeight = window.innerHeight;
    shell.style.setProperty('--rb-shell-height', `${Math.round(shellHeight)}px`);
  }

  function sync() {
    const visibleHeight = viewport?.height ?? window.innerHeight;
    const visibleTop = viewport?.offsetTop ?? 0;
    const keyboardOpen = Boolean(
      editor && composer && shellHeight - (visibleHeight + visibleTop) > 90
    );

    shell.classList.toggle('keyboard-compose-open', keyboardOpen);

    if (keyboardOpen) {
      // Some mobile browsers report a visual viewport that ends above the
      // actual IME edge. Use whichever viewport bottom is lower on screen,
      // so the composer sits directly against the keyboard in both resize and
      // overlay keyboard modes. Keep the app shell and document stationary.
      // Convert the visual viewport bottom into an inset from the layout
      // viewport. This is the important distinction on Android: the IME may
      // resize the visual viewport while fixed elements remain tied to layout.
      const bounds = composer.getBoundingClientRect();
      const keyboardInset = Math.max(0, window.innerHeight - (visibleTop + visibleHeight));
      composer.classList.add('keyboard-floated');
      composer.style.left = `${Math.round(bounds.left)}px`;
      composer.style.width = `${Math.round(bounds.width)}px`;
      composer.style.top = 'auto';
      composer.style.bottom = `${Math.round(keyboardInset)}px`;
    } else {
      composer?.classList.remove('keyboard-floated');
      if (composer) {
        composer.style.removeProperty('left');
        composer.style.removeProperty('width');
        composer.style.removeProperty('top');
        composer.style.removeProperty('bottom');
      }
    }

    keyboardWasOpen = keyboardOpen;
  }

  function onFocusIn(event) {
    const target = event.target;
    editor = target?.matches?.(editableSelector) ? target : null;
    composer = editor?.closest?.('.messages-compose, .messages-favorite-compose') || null;
    sync();
  }

  function onFocusOut() {
    window.setTimeout(() => {
      const target = document.activeElement;
      editor = target?.matches?.(editableSelector) ? target : null;
      composer = editor?.closest?.('.messages-compose, .messages-favorite-compose') || null;
      sync();
    }, 80);
  }

  function onResize() {
    if (!editor) setShellHeight();
    sync();
  }

  function onOrientationChange() {
    window.setTimeout(() => {
      if (!editor) setShellHeight();
      sync();
    }, 250);
  }

  setShellHeight();
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onOrientationChange);
  viewport?.addEventListener('resize', sync);
  viewport?.addEventListener('scroll', sync);

  return () => {
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onOrientationChange);
    viewport?.removeEventListener('resize', sync);
    viewport?.removeEventListener('scroll', sync);
    composer?.classList.remove('keyboard-floated');
    shell.classList.remove('keyboard-compose-open');
    shell.style.removeProperty('--rb-shell-height');
  };
}
