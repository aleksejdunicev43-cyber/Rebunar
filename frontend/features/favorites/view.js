/**
 * REBUNAR — FAVORITES / PERSONAL NOTES
 */

export function renderFavoritesScreen(container) {
  container.innerHTML = `
    <section class="screen favorites-screen">
      <div class="favorites-heading">
        <div>
          <h1>Избранное</h1>
          <p>Личные заметки, изображения, вебтуны и полезные фрагменты.</p>
        </div>
      </div>

      <div class="favorites-card">
        <textarea class="favorites-note-input" rows="4"
          placeholder="Записать заметку..."></textarea>

        <div class="favorites-compose-bar">
          <div class="favorites-attach-group">
            <button class="favorites-attach-button" type="button"
              data-attach="image" aria-label="Прикрепить изображение" title="Изображение">
              <span aria-hidden="true">📎</span>
              <span>Медиа</span>
            </button>
            <button class="favorites-attach-button" type="button"
              data-attach="link" aria-label="Добавить ссылку" title="Ссылка">
              <span aria-hidden="true">🔗</span>
              <span>Ссылка</span>
            </button>
            <button class="favorites-attach-button" type="button"
              data-attach="code" aria-label="Добавить код" title="Код">
              <span aria-hidden="true">&lt;/&gt;</span>
              <span>Код</span>
            </button>
          </div>
          <button class="favorites-save-button" type="button">Сохранить</button>
        </div>

        <input class="favorites-image-input" type="file"
          accept="image/jpeg,image/png,image/webp,image/gif" hidden>
        <p class="favorites-attach-status" aria-live="polite"></p>
      </div>

      <div class="favorites-empty">
        <span class="favorites-empty-icon">✦</span>
        <strong>Твоё личное пространство</strong>
        <p>Сохраняй сюда то, что хочешь не потерять: арты, скриншоты, ссылки на вебтуны и полезный код.</p>
      </div>
    </section>
  `;

  const input = container.querySelector('.favorites-note-input');
  const imageInput = container.querySelector('.favorites-image-input');
  const status = container.querySelector('.favorites-attach-status');

  container.querySelectorAll('.favorites-attach-button').forEach(button => {
    button.addEventListener('click', () => {
      const type = button.dataset.attach;
      if (type === 'image') {
        imageInput.click();
        return;
      }
      if (type === 'link') {
        input.focus();
        input.placeholder = 'Вставь ссылку на аниме, вебтун или сайт...';
        return;
      }
      input.focus();
      input.placeholder = 'Вставь фрагмент кода...';
    });
  });

  imageInput.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    status.textContent = `Выбрано изображение: ${file.name}`;
    input.focus();
    imageInput.value = '';
  });

  container.querySelector('.favorites-save-button').addEventListener('click', () => {
    const text = input.value.trim();
    status.textContent = text
      ? 'Заметка готова к сохранению. Хранилище подключим следующим этапом.'
      : 'Сначала добавь текст или вложение.';
  });
}
