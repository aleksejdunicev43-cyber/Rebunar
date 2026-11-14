/**
 * REBUNAR — READER
 * Единая точка входа в новеллы и вебтуны.
 */

const categories = {
  novels: {
    eyebrow: 'ТЕКСТОВЫЕ ИСТОРИИ',
    title: 'Новеллы',
    description: 'Истории, которые читают главу за главой. Здесь будут авторские произведения, серии и продолжение с того места, где ты остановился.',
    emptyTitle: 'Каталог новелл готовится',
    emptyDescription: 'Здесь появятся страницы произведений, главы, жанры и библиотека чтения. Первые авторские истории Rebunar тоже будут здесь.'
  },
  webtoons: {
    eyebrow: 'ИСТОРИИ В КАРТИНКАХ',
    title: 'Вебтуны',
    description: 'Вертикальные истории с иллюстрациями, которые удобно читать с телефона — от первой страницы до последней главы.',
    emptyTitle: 'Каталог вебтунов готовится',
    emptyDescription: 'Здесь появятся обложки серий, описания, главы и удобная вертикальная читалка.'
  }
};

function renderCategory(panel, key) {
  const category = categories[key];
  panel.innerHTML = `
    <div class="reader-category-heading">
      <div>
        <span class="reader-eyebrow">${category.eyebrow}</span>
        <h2>${category.title}</h2>
        <p>${category.description}</p>
      </div>
      <span class="reader-category-mark" aria-hidden="true">${key === 'novels' ? 'Aa' : '▤'}</span>
    </div>
    <div class="reader-empty-state">
      <span class="reader-empty-icon" aria-hidden="true">${key === 'novels' ? '📖' : '▥'}</span>
      <h3>${category.emptyTitle}</h3>
      <p>${category.emptyDescription}</p>
      <span class="reader-status">РАЗДЕЛ В РАЗРАБОТКЕ</span>
    </div>
  `;
}

export function renderReaderScreen(outlet, params = {}) {
  const initialCategory = Object.hasOwn(categories, params.category) ? params.category : 'novels';

  outlet.innerHTML = `
    <section class="screen reader-screen">
      <header class="reader-hero">
        <span class="reader-eyebrow">REBUNAR / ЧИТАТЬ</span>
        <h1>Reader</h1>
        <p>Открывай новые истории, знакомься с героями и возвращайся к любимым мирам.</p>
      </header>

      <div class="reader-tabs" role="tablist" aria-label="Категории чтения">
        <button class="reader-tab" type="button" role="tab" data-reader-tab="novels" aria-selected="false">
          <span aria-hidden="true">Aa</span>
          <span>Новеллы</span>
        </button>
        <button class="reader-tab" type="button" role="tab" data-reader-tab="webtoons" aria-selected="false">
          <span aria-hidden="true">▤</span>
          <span>Вебтуны</span>
        </button>
      </div>

      <section class="reader-category-panel" id="reader-category-panel" aria-live="polite"></section>

      <footer class="reader-footer">
        <span>REBUNAR READER</span>
        <p>Истории, к которым хочется возвращаться.</p>
      </footer>
    </section>
  `;

  const panel = outlet.querySelector('#reader-category-panel');
  const tabs = [...outlet.querySelectorAll('[data-reader-tab]')];

  function activateCategory(key) {
    if (!Object.hasOwn(categories, key)) return;
    tabs.forEach(tab => {
      const active = tab.dataset.readerTab === key;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    renderCategory(panel, key);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => activateCategory(tab.dataset.readerTab));
  });

  activateCategory(initialCategory);
}
