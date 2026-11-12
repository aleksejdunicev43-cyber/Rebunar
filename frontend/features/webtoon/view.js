import {
  createWebtoonChapter,
  createWebtoonWork,
  getWebtoonGenres,
  getWebtoonWork,
  getWebtoonWorks,
  publishWebtoonWork,
  getWebtoonChapter,
  uploadWebtoonPage,
  publishWebtoonChapter
} from './api.js';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

const formatNames = {
  webtoon: 'Вебтун',
  manhwa: 'Манхва',
  manga: 'Манга',
  manhua: 'Маньхуа',
  comic: 'Комикс'
};

const statusNames = {
  draft: 'Черновик',
  pending: 'На проверке',
  published: 'Опубликовано',
  hidden: 'Скрыто',
  rejected: 'Отклонено'
};

function message(container, text, kind = '') {
  const node = container.querySelector('.wt-message');
  if (node) {
    node.textContent = text;
    node.dataset.kind = kind;
  }
}

function renderWorkCards(container, works) {
  const list = container.querySelector('.wt-work-grid');
  if (!list) return;
  if (!works.length) {
    list.innerHTML = '<div class="wt-empty"><strong>Пока нет работ</strong><p>Создай первую серию или загляни позже — каталог будет пополняться.</p></div>';
    return;
  }
  list.innerHTML = works.map(work => `
    <button class="wt-work-card" type="button" data-work-id="${Number(work.id)}">
      <span class="wt-cover-placeholder" aria-hidden="true">R</span>
      <span class="wt-work-card-body">
        <span class="wt-work-format">${escapeHTML(formatNames[work.format] || 'Комикс')} · ${escapeHTML(statusNames[work.publication_status] || '')}</span>
        <strong>${escapeHTML(work.title)}</strong>
        <span class="wt-work-description">${escapeHTML(work.description || 'Описание пока не добавлено')}</span>
        <span class="wt-work-meta">${Number(work.chapter_count) || 0} глав · ${Number(work.views) || 0} просмотров</span>
      </span>
    </button>
  `).join('');
  list.querySelectorAll('[data-work-id]').forEach(button => {
    button.addEventListener('click', () => openWork(container, Number(button.dataset.workId)));
  });
}

async function loadCatalog(container) {
  try {
    const result = await getWebtoonWorks(container.querySelector('.wt-search')?.value || '');
    renderWorkCards(container, result.works || []);
    message(container, '');
  } catch (error) {
    renderWorkCards(container, []);
    message(container, error.message, 'error');
  }
}

async function openChapter(detail, chapterId) {
  const host = detail.querySelector('.wt-reader-host');
  host.innerHTML = '<p class="wt-loading">Открываем главу…</p>';
  try {
    const result = await getWebtoonChapter(chapterId);
    const chapter = result.chapter;
    host.replaceChildren();
    const reader = document.createElement('section'); reader.className = 'wt-reader';
    const heading = document.createElement('div'); heading.className = 'wt-reader-heading';
    const title = document.createElement('h3'); title.textContent = 'Глава ' + chapter.position + ' · ' + (chapter.title || 'Без названия');
    const close = document.createElement('button'); close.type = 'button'; close.className = 'wt-reader-close'; close.textContent = 'Закрыть';
    close.addEventListener('click', () => { host.replaceChildren(); });
    heading.append(title, close); reader.append(heading);
    if (!chapter.pages.length) { const empty = document.createElement('p'); empty.className = 'wt-empty'; empty.textContent = 'В этой главе пока нет страниц.'; reader.append(empty); }
    chapter.pages.forEach(page => { const img = document.createElement('img'); img.className = 'wt-reader-page'; img.src = page.url; img.alt = 'Страница ' + page.position; img.loading = 'lazy'; reader.append(img); });
    host.append(reader);
  } catch (error) { host.textContent = error.message; }
}
async function openWork(container, workId) {
  try {
    const result = await getWebtoonWork(workId);
    const work = result.work;
    const isOwner = Boolean(work.is_owner);
    container.querySelector('.wt-detail')?.remove();
    const detail = document.createElement('section');
    detail.className = 'wt-detail';
    detail.innerHTML = `
      <button type="button" class="wt-back">← К каталогу</button>
      <div class="wt-detail-heading">
        <span class="wt-work-format">${escapeHTML(formatNames[work.format] || 'Комикс')} · ${escapeHTML(statusNames[work.publication_status] || '')}</span>
        <h2>${escapeHTML(work.title)}</h2>
        <p>${escapeHTML(work.description || 'Описание пока не добавлено')}</p>
        <small>Автор: ${escapeHTML(work.display_name || work.username || 'Автор')}</small>
      </div>
      <div class="wt-chapter-heading"><h3>Главы</h3>${isOwner ? '<button type="button" class="wt-add-chapter">Добавить главу</button>' : ''}</div>
      <div class="wt-chapter-list">${(work.chapters || []).length ? work.chapters.map(chapter => '<div class="wt-chapter-row"><button type="button" class="wt-open-chapter" data-chapter-id="' + Number(chapter.id) + '">Глава ' + Number(chapter.position) + ' · ' + escapeHTML(chapter.title || 'Без названия') + '</button><span>' + escapeHTML(statusNames[chapter.publication_status] || '') + '</span>' + (isOwner ? '<label class="wt-page-upload">＋ Страница<input type="file" accept="image/jpeg,image/png,image/webp" data-upload-chapter="' + Number(chapter.id) + '" hidden></label>' : '') + (isOwner && chapter.publication_status !== 'published' ? '<button type="button" class="wt-publish-chapter" data-publish-chapter="' + Number(chapter.id) + '">Опубликовать главу</button>' : '') + '</div>').join('') : '<p class="wt-muted">Глав пока нет.</p>'}</div>
      ${isOwner && work.publication_status !== 'published' ? '<button type="button" class="wt-publish">Опубликовать серию</button>' : ''}
      <p class="wt-detail-message" aria-live="polite"></p>
    `;
    const outlet = container.querySelector('.wt-detail-host');
    outlet.replaceChildren(detail);
    detail.querySelector('.wt-back').addEventListener('click', () => detail.remove());
    detail.querySelectorAll('.wt-open-chapter').forEach(button => button.addEventListener('click', () => openChapter(detail, Number(button.dataset.chapterId))));
    detail.querySelectorAll('[data-upload-chapter]').forEach(input => input.addEventListener('change', async () => {
      const file = input.files?.[0]; if (!file) return;
      try { await uploadWebtoonPage(Number(input.dataset.uploadChapter), file); detail.querySelector('.wt-detail-message').textContent = 'Страница добавлена.'; }
      catch (error) { detail.querySelector('.wt-detail-message').textContent = error.message; }
      finally { input.value = ''; }
    }));
    detail.querySelectorAll('[data-publish-chapter]').forEach(button => button.addEventListener('click', async () => {
      try { await publishWebtoonChapter(Number(button.dataset.publishChapter)); await openWork(container, workId); }
      catch (error) { detail.querySelector('.wt-detail-message').textContent = error.message; }
    }));
    detail.querySelector('.wt-add-chapter')?.addEventListener('click', async () => {
      const position = Number(prompt('Номер главы:'));
      if (!Number.isInteger(position) || position < 1) return;
      const title = prompt('Название главы (можно оставить пустым):') || '';
      try {
        await createWebtoonChapter(workId, { position, title });
        await openWork(container, workId);
      } catch (error) {
        detail.querySelector('.wt-detail-message').textContent = error.message;
      }
    });
    detail.querySelector('.wt-publish')?.addEventListener('click', async () => {
      try {
        await publishWebtoonWork(workId);
        await openWork(container, workId);
        await loadCatalog(container);
      } catch (error) {
        detail.querySelector('.wt-detail-message').textContent = error.message;
      }
    });
  } catch (error) {
    message(container, error.message, 'error');
  }
}

export function renderWebtoonScreen(container) {
  container.innerHTML = `
    <section class="screen wt-screen">
      <header class="wt-hero">
        <span class="wt-eyebrow">REBUNAR / ЧИТАТЬ И СОЗДАВАТЬ</span>
        <h1>Webtoon</h1>
        <p>Истории, манхва, манга и вебтуны от авторов сообщества Rebunar.</p>
        <button type="button" class="wt-create-toggle">＋ Создать серию</button>
      </header>

      <section class="wt-create-panel" hidden>
        <h2>Новая серия</h2>
        <form class="wt-create-form">
          <label>Название<input name="title" maxlength="120" required placeholder="Название истории"></label>
          <label>Описание<textarea name="description" maxlength="4000" rows="3" placeholder="О чём эта история?"></textarea></label>
          <div class="wt-form-row">
            <label>Формат<select name="format"><option value="webtoon">Вебтун</option><option value="manhwa">Манхва</option><option value="manga">Манга</option><option value="manhua">Маньхуа</option><option value="comic">Комикс</option></select></label>
            <label>Статус<select name="serial_status"><option value="ongoing">Выходит</option><option value="completed">Завершён</option><option value="hiatus">На паузе</option></select></label>
          </div>
          <fieldset class="wt-genres"><legend>Жанры</legend><div class="wt-genre-list">Загрузка жанров…</div></fieldset>
          <div class="wt-form-actions"><button type="button" class="wt-cancel">Отмена</button><button type="submit">Создать черновик</button></div>
        </form>
      </section>

      <div class="wt-toolbar">
        <div><span class="wt-eyebrow">КАТАЛОГ REBUNAR</span><h2>Истории сообщества</h2></div>
        <input class="wt-search" type="search" placeholder="Найти историю…" aria-label="Поиск историй">
      </div>
      <p class="wt-message" aria-live="polite"></p>
      <div class="wt-work-grid"><div class="wt-loading">Загружаем каталог…</div></div>
      <div class="wt-detail-host"></div>
    </section>
  `;

  const panel = container.querySelector('.wt-create-panel');
  const form = container.querySelector('.wt-create-form');
  container.querySelector('.wt-create-toggle').addEventListener('click', () => { panel.hidden = !panel.hidden; });
  container.querySelector('.wt-cancel').addEventListener('click', () => { panel.hidden = true; form.reset(); });
  container.querySelector('.wt-search').addEventListener('input', () => {
    clearTimeout(container.__wtSearchTimer);
    container.__wtSearchTimer = setTimeout(() => loadCatalog(container), 250);
  });

  getWebtoonGenres().then(result => {
    container.querySelector('.wt-genre-list').innerHTML = (result.genres || []).map(genre => `
      <label class="wt-genre-option"><input type="checkbox" name="genres" value="${Number(genre.id)}"><span>${escapeHTML(genre.name)}</span></label>
    `).join('');
  }).catch(error => {
    container.querySelector('.wt-genre-list').textContent = error.message;
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    const data = new FormData(form);
    const genres = [...form.querySelectorAll('input[name="genres"]:checked')].map(input => Number(input.value));
    try {
      const result = await createWebtoonWork({
        title: data.get('title'),
        description: data.get('description'),
        format: data.get('format'),
        serial_status: data.get('serial_status'),
        genres
      });
      panel.hidden = true;
      form.reset();
      message(container, 'Черновик создан. Теперь можно добавить главы.', 'success');
      await loadCatalog(container);
      await openWork(container, result.work_id);
    } catch (error) {
      message(container, error.message, 'error');
    } finally {
      submit.disabled = false;
    }
  });

  loadCatalog(container);
}
