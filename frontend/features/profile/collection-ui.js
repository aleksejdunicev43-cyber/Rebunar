/**
 * REBUNAR — PROFILE FRAME COLLECTION UI
 * Коллекция рамок открывается отдельной панелью из профиля.
 */

function setupCollectionButton() {
  const screen = document.querySelector('.profile-screen');
  if (!screen) return;

  const actions = screen.querySelector('.profile-heading-actions');
  const collection = screen.querySelector('.profile-frame-collection');
  if (!actions || !collection || actions.querySelector('.profile-collection-button')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'profile-collection-button';
  button.setAttribute('aria-label', 'Коллекция рамок');
  button.title = 'Коллекция рамок';
  button.innerHTML = '<span aria-hidden="true">◈</span><span class="profile-heading-action-label">Коллекция</span>';
  actions.appendChild(button);

  button.addEventListener('click', () => openCollection(screen, collection));
}

function openCollection(screen, collection) {
  if (!collection || collection.dataset.collectionOpen === 'true') return;

  const parent = collection.parentElement;
  const overlay = document.createElement('div');
  overlay.className = 'profile-frame-collection-overlay';
  overlay.innerHTML = `
    <div class="profile-frame-collection-modal" role="dialog" aria-modal="true" aria-labelledby="profile-frame-collection-title">
      <div class="profile-frame-collection-modal-heading">
        <div>
          <span class="profile-feature-kicker">Коллекция</span>
          <h2 id="profile-frame-collection-title">Рамки аватара</h2>
        </div>
        <button class="profile-frame-collection-close" type="button" aria-label="Закрыть">×</button>
      </div>
    </div>
  `;

  screen.appendChild(overlay);
  const modal = overlay.querySelector('.profile-frame-collection-modal');
  modal.appendChild(collection);
  collection.dataset.collectionOpen = 'true';

  const close = () => {
    if (!overlay.isConnected) return;
    delete collection.dataset.collectionOpen;
    parent?.appendChild(collection);
    overlay.remove();
  };

  overlay.querySelector('.profile-frame-collection-close').addEventListener('click', close);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) close();
  });

  const onKey = event => {
    if (event.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('keydown', onKey);
}

if (typeof window !== 'undefined') {
  const start = () => {
    setupCollectionButton();
    const observer = new MutationObserver(setupCollectionButton);
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
}
