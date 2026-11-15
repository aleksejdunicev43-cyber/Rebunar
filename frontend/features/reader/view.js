/**
 * REBUNAR — READER
 * Каталог новелл и вебтунов + открытая студия автора.
 */
import { api } from '../../shared/api/client.js';

const categories = {
  novels: { title: 'Новеллы', description: 'Текстовые истории, которые читают глава за главой.', type: 'novel' },
  webtoons: { title: 'Вебтуны', description: 'Вертикальные истории в картинках — удобно читать с телефона.', type: 'webtoon' }
};

function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function message(target, text, error = false) {
  target.textContent = text;
  target.classList.toggle('is-error', error);
  target.hidden = !text;
}

function button(text, className, action) {
  const el = node('button', className, text);
  el.type = 'button';
  el.addEventListener('click', action);
  return el;
}

async function loadCatalog(panel, key, openWork) {
  panel.replaceChildren(node('p', 'reader-loading', 'Загружаем каталог…'));
  try {
    const works = await api.get('/reader/works?category=' + categories[key].type);
    panel.replaceChildren();
    if (!works.length) {
      const empty = node('div', 'reader-empty-state');
      empty.append(node('span', 'reader-empty-icon', key === 'novels' ? '📖' : '▥'));
      empty.append(node('h3', '', 'Пока здесь тихо'));
      empty.append(node('p', '', 'Здесь пока нет произведений.'));
      panel.append(empty);
      return;
    }
    const grid = node('div', 'reader-work-grid');
    works.forEach(work => {
      const card = button('', 'reader-work-card', () => openWork(work.id));
      if (work.cover_url) {
        const cover = node('img', 'reader-work-cover');
        cover.src = work.cover_url;
        cover.alt = 'Обложка: ' + work.title;
        cover.loading = 'lazy';
        card.append(cover);
      } else card.append(node('div', 'reader-work-cover reader-work-cover-empty', 'REBUNAR'));
      const info = node('span', 'reader-work-info');
      info.append(node('strong', '', work.title));
      info.append(node('small', '', 'Автор: ' + work.author));
      if (work.description) info.append(node('span', 'reader-work-description', work.description));
      card.append(info);
      grid.append(card);
    });
    panel.append(grid);
  } catch (error) {
    panel.replaceChildren(node('p', 'reader-feedback is-error', error.message));
  }
}

async function showPublicWork(panel, workId, back) {
  panel.closest('.reader-screen')?.classList.remove('reader-reading-mode');
  panel.replaceChildren(node('p', 'reader-loading', 'Открываем произведение…'));
  try {
    const [work, chapters] = await Promise.all([
      api.get('/reader/works/' + workId),
      api.get('/reader/works/' + workId + '/chapters')
    ]);
    panel.replaceChildren();
    const top = node('div', 'reader-detail-top');
    top.append(button('← К каталогу', 'reader-back-button', back));
    panel.append(top);
    const heading = node('div', 'reader-detail-heading');
    if (work.cover_url) {
      const img = node('img', 'reader-detail-cover');
      img.src = work.cover_url; img.alt = 'Обложка: ' + work.title;
      heading.append(img);
    }
    const info = node('div', 'reader-detail-info');
    info.append(node('span', 'reader-eyebrow', work.category === 'novel' ? 'НОВЕЛЛА' : 'ВЕБТУН'));
    info.append(node('h2', '', work.title));
    info.append(node('p', '', work.description || 'Описание пока не добавлено.'));
    info.append(node('small', '', 'Автор: ' + work.author));
    heading.append(info); panel.append(heading);
    panel.append(node('h3', 'reader-chapters-title', 'Главы'));
    if (!chapters.length) panel.append(node('p', 'reader-muted', 'Главы скоро появятся.'));
    chapters.forEach(chapter => panel.append(button(
      'Глава ' + chapter.chapter_number + ' · ' + chapter.title,
      'reader-chapter-link',
      () => showChapter(panel, chapter.id, () => showPublicWork(panel, workId, back))
    )));
  } catch (error) {
    panel.replaceChildren(node('p', 'reader-feedback is-error', error.message));
  }
}

async function showChapter(panel, chapterId, back) {
  panel.replaceChildren(node('p', 'reader-loading', 'Загружаем главу…'));
  try {
    const chapter = await api.get('/reader/chapters/' + chapterId);
    const [chapters, progress] = await Promise.all([
      api.get('/reader/works/' + chapter.work_id + '/chapters'),
      api.get('/reader/works/' + chapter.work_id + '/progress').catch(() => [])
    ]);
    const index = chapters.findIndex(item => item.id === chapterId);
    const state = progress.find(item => item.chapter_id === chapterId) || { is_read: false, is_favorite: false };
    const screen = panel.closest('.reader-screen');
    screen?.classList.add('reader-reading-mode');
    panel.replaceChildren();

    const top = node('div', 'reader-detail-top reader-reading-top');
    top.append(node('span', 'reader-eyebrow', chapter.work_title));
    panel.append(top);
    panel.append(node('h2', 'reader-reading-title', chapter.title));

    const toolbar = node('div', 'reader-reading-toolbar');
    const listButton = button('☷ Главы', 'reader-toolbar-button', () => {
      const existing = panel.querySelector('.reader-chapter-drawer');
      if (existing) { existing.remove(); return; }
      const drawer = node('div', 'reader-chapter-drawer');
      chapters.forEach(item => {
        const itemProgress = progress.find(p => p.chapter_id === item.id);
        const label = (itemProgress?.is_read ? '✓ ' : '') + 'Глава ' + item.chapter_number + ' · ' + item.title + (itemProgress?.is_favorite ? '  ♥' : '');
        drawer.append(button(label, 'reader-drawer-chapter' + (item.id === chapterId ? ' is-current' : ''), () => showChapter(panel, item.id, back)));
      });
      toolbar.after(drawer);
    });
    toolbar.append(listButton);
    toolbar.append(button('←', 'reader-toolbar-button reader-toolbar-arrow', () => {
      if (index > 0) showChapter(panel, chapters[index - 1].id, back);
    }));
    toolbar.append(button('→', 'reader-toolbar-button reader-toolbar-arrow', () => {
      if (index >= 0 && index < chapters.length - 1) showChapter(panel, chapters[index + 1].id, back);
    }));
    const favoriteButton = button(state.is_favorite ? '♥ В избранном' : '♡ В избранное', 'reader-toolbar-button reader-favorite-button' + (state.is_favorite ? ' is-active' : ''), async () => {
      try {
        const updated = await api.post('/reader/chapters/' + chapterId + '/progress', { is_favorite: !state.is_favorite });
        state.is_favorite = updated.is_favorite;
        favoriteButton.textContent = state.is_favorite ? '♥ В избранном' : '♡ В избранное';
        favoriteButton.classList.toggle('is-active', state.is_favorite);
      } catch (error) { window.alert(error.message); }
    });
    toolbar.append(favoriteButton);
    const readButton = button(state.is_read ? '✓ Прочитано' : '○ Прочитано', 'reader-toolbar-button reader-read-button' + (state.is_read ? ' is-active' : ''), async () => {
      try {
        const updated = await api.post('/reader/chapters/' + chapterId + '/progress', { is_read: !state.is_read });
        state.is_read = updated.is_read;
        readButton.textContent = state.is_read ? '✓ Прочитано' : '○ Прочитано';
        readButton.classList.toggle('is-active', state.is_read);
      } catch (error) { window.alert(error.message); }
    });
    toolbar.append(readButton);
    panel.append(toolbar);

    if (chapter.category === 'novel') {
      const text = node('article', 'reader-prose');
      text.textContent = chapter.content;
      panel.append(text);
    } else {
      const pages = node('div', 'reader-webtoon-pages');
      chapter.pages.forEach(url => {
        const img = node('img', '');
        img.src = url; img.alt = 'Страница вебтуна'; img.loading = 'lazy';
        pages.append(img);
      });
      panel.append(pages);
    }
  } catch (error) {
    panel.replaceChildren(node('p', 'reader-feedback is-error', error.message));
  }
}

