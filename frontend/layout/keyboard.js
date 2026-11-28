/**
 * Keep the app shell anchored to the currently available browser height.
 * Android resizes the content viewport when the software keyboard opens;
 * the chat composer then stays in normal flex layout at the bottom edge.
 */
export function initKeyboardLayout(root) {
  const shell = root.querySelector('.app-shell');
  if (!shell) return () => {};

  const viewport = window.visualViewport;
  const editableSelector = 'input:not([type="hidden"]):not([type="file"]), textarea, [contenteditable="true"]';
  let baselineHeight = window.innerHeight;
  let editor = null;
  let composer = null;

  function setShellHeight() {
    const currentHeight = window.innerHeight;
    shell.style.setProperty('--rb-shell-height', `${Math.round(currentHeight)}px`);
    // Keep the unoccluded height as the reference while an editor is focused.
    if (!editor) baselineHeight = currentHeight;
  }

  function sync() {
    const visibleHeight = viewport?.height ?? window.innerHeight;
    const visibleTop = viewport?.offsetTop ?? 0;
    const keyboardOpen = Boolean(
      editor && composer && (
        baselineHeight - window.innerHeight > 90 ||
        baselineHeight - (visibleTop + visibleHeight) > 90
      )
    );

    shell.classList.toggle('keyboard-compose-open', keyboardOpen);

    // Never position the composer with a second, manually calculated keyboard
    // inset. With resizes-content the available viewport already ends above
    // the keyboard, so normal flex layout places the composer at that edge.
    if (composer) {
      composer.classList.remove('keyboard-floated');
      composer.style.removeProperty('position');
      composer.style.removeProperty('left');
      composer.style.removeProperty('width');
      composer.style.removeProperty('top');
      composer.style.removeProperty('bottom');
    }
  }

  function onFocusIn(event) {
    const target = event.target;
    editor = target?.matches?.(editableSelector) ? target : null;
    composer = editor?.closest?.('.messages-compose, .messages-favorite-compose') || null;
    setShellHeight();
    sync();
  }

  function onFocusOut() {
    window.setTimeout(() => {
      const target = document.activeElement;
      editor = target?.matches?.(editableSelector) ? target : null;
      composer = editor?.closest?.('.messages-compose, .messages-favorite-compose') || null;
      setShellHeight();
      sync();
    }, 100);
  }

  function onResize() {
    setShellHeight();
    sync();
  }

  function onOrientationChange() {
    window.setTimeout(() => {
      baselineHeight = window.innerHeight;
      setShellHeight();
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
