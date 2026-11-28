/**
 * Keep the mobile app shell aligned with the visible viewport when the
 * Android/iOS software keyboard opens. The bottom navigation is hidden while
 * an editor is active so the message composer can sit directly above keyboard.
 */
export function initKeyboardLayout(root) {
  const shell = root.querySelector('.app-shell');
  if (!shell) return () => {};

  const viewport = window.visualViewport;
  const editableSelector = 'input:not([type="hidden"]):not([type="file"]), textarea, [contenteditable="true"]';
  const getHeight = () => Math.min(
    window.innerHeight || Number.POSITIVE_INFINITY,
    viewport?.height || Number.POSITIVE_INFINITY
  );

  let maximumHeight = getHeight();
  let editorFocused = false;
  let keyboardWasOpen = false;

  function sync() {
    const height = getHeight();
    if (!editorFocused) maximumHeight = Math.max(maximumHeight, height);

    const keyboardOpen = editorFocused && maximumHeight - height > 90;
    shell.classList.toggle('keyboard-open', keyboardOpen);
    shell.classList.toggle('keyboard-open-messages', keyboardOpen && Boolean(shell.querySelector('.messages-screen')));

    if (keyboardOpen) {
      shell.style.setProperty('--rb-viewport-height', `${Math.round(height)}px`);
    } else {
      shell.style.removeProperty('--rb-viewport-height');
    }

    if (keyboardOpen && !keyboardWasOpen) {
      document.activeElement?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
    keyboardWasOpen = keyboardOpen;
  }

  function onFocusIn(event) {
    editorFocused = Boolean(event.target?.matches?.(editableSelector));
    sync();
  }

  function onFocusOut() {
    window.setTimeout(() => {
      editorFocused = Boolean(document.activeElement?.matches?.(editableSelector));
      sync();
    }, 80);
  }

  function onOrientationChange() {
    if (!editorFocused) {
      window.setTimeout(() => {
        maximumHeight = getHeight();
        sync();
      }, 250);
    }
  }

  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', onOrientationChange);
  viewport?.addEventListener('resize', sync);
  viewport?.addEventListener('scroll', sync);

  return () => {
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    window.removeEventListener('resize', sync);
    window.removeEventListener('orientationchange', onOrientationChange);
    viewport?.removeEventListener('resize', sync);
    viewport?.removeEventListener('scroll', sync);
    shell.classList.remove('keyboard-open', 'keyboard-open-messages');
    shell.style.removeProperty('--rb-viewport-height');
  };
}
