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
      // Fixed coordinates are relative to the visible viewport. Do not resize
      // the app shell or scroll the document: only the composer is repositioned.
      const bounds = composer.getBoundingClientRect();
      composer.classList.add('keyboard-floated');
      composer.style.left = `${Math.round(bounds.left)}px`;
      composer.style.width = `${Math.round(bounds.width)}px`;
      composer.style.top = `${Math.round(visibleTop + visibleHeight - bounds.height)}px`;
    } else {
      composer?.classList.remove('keyboard-floated');
      if (composer) {
        composer.style.removeProperty('left');
        composer.style.removeProperty('width');
        composer.style.removeProperty('top');
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
