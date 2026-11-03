import './collection-button.css';

export function initProfileCollectionButton(container) {
  const heading = container.querySelector('.profile-heading');
  const collection = container.querySelector('.profile-frame-collection');
  const settings = container.querySelector('.profile-settings-button');
  if (!heading || !collection || !settings || heading.querySelector('.profile-collection-button')) return;

  let actions = heading.querySelector('.profile-heading-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'profile-heading-actions';
    settings.replaceWith(actions);
    actions.appendChild(settings);
  }

  const button = document.createElement('button');
  button.className = 'profile-collection-button';
  button.type = 'button';
  button.setAttribute('aria-label', 'Коллекция рамок');
  button.title = 'Коллекция рамок';
  button.innerHTML = '<span class="profile-collection-icon" aria-hidden="true">▤</span><span>Коллекция</span>';
  actions.appendChild(button);

  collection.hidden = true;

  button.addEventListener('click', () => {
    if (container.querySelector('.profile-collection-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'profile-collection-overlay';
    overlay.innerHTML = '<div class="profile-collection-dialog" role="dialog" aria-modal="true" aria-label="Коллекция рамок"><div class="profile-collection-dialog-head"><div><span>КОЛЛЕКЦИЯ</span><strong>Рамки аватара</strong></div><button class="profile-collection-close" type="button" aria-label="Закрыть">×</button></div></div>';
    container.appendChild(overlay);

    const dialog = overlay.querySelector('.profile-collection-dialog');
    collection.hidden = false;
    dialog.appendChild(collection);

    const close = () => {
      const customization = container.querySelector('.profile-customization-card');
      if (customization) {
        customization.appendChild(collection);
        collection.hidden = true;
      }
      overlay.remove();
    };

    overlay.querySelector('.profile-collection-close').addEventListener('click', close);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close();
    });
    document.addEventListener('keydown', function onKey(event) {
      if (event.key === 'Escape') {
        document.removeEventListener('keydown', onKey);
        close();
      }
    });
  });
}
