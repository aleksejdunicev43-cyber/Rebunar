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

function chapterDisplayTitle(chapter) {
  return String(chapter?.title || '').replace(/^\s*Глава\s*\d+\s*[.·:—-]?\s*/i, '').trim();
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
    const toolbar = node('div', 'reader-catalog-toolbar');
    const search = node('input', 'reader-catalog-search');
    search.type = 'search';
    search.placeholder = 'Поиск по названию или автору';
    search.setAttribute('aria-label', 'Поиск по каталогу');
    toolbar.append(search);
    panel.append(toolbar);
    if (!works.length) {
      const empty = node('div', 'reader-empty-state');
      empty.append(node('span', 'reader-empty-kicker', 'REBUNAR'));
      empty.append(node('h3', '', 'Скоро здесь появятся истории'));
      empty.append(node('p', '', key === 'novels' ? 'Мы готовим первые новеллы. Совсем скоро здесь можно будет выбрать историю и продолжить чтение в любое время.' : 'Мы готовим первые вебтуны. Скоро здесь появятся вертикальные истории, созданные специально для чтения с телефона.'));
      panel.append(empty);
      return;
    }
    const grid = node('div', 'reader-work-grid');
    works.forEach(work => {
      const isNovel = key === 'novels';
      const card = button('', 'reader-work-card' + (isNovel ? ' reader-work-card-novel' : ''), () => openWork(work.id));
      card.setAttribute('aria-label', work.title);
      card.dataset.search = [work.title, work.author, work.description].filter(Boolean).join(' ').toLocaleLowerCase('ru');
      if (work.cover_url) {
        const cover = node('img', 'reader-work-cover' + (isNovel ? ' reader-work-cover-novel' : ''));
        cover.src = work.cover_url;
        cover.alt = 'Обложка: ' + work.title;
        cover.loading = 'lazy';
        card.append(cover);
      } else card.append(node('div', 'reader-work-cover reader-work-cover-empty', 'REBUNAR'));
      const info = node('span', 'reader-work-info');
      info.append(node('strong', '', work.title));
      info.append(node('small', '', 'Автор: ' + (work.author || 'Rebunar')));
      if (work.description) info.append(node('span', 'reader-work-description', work.description));
      info.append(node('span', 'reader-work-meta', isNovel ? 'НОВЕЛЛА' : 'ВЕБТУН'));
      card.append(info);
      grid.append(card);
    });
    panel.append(grid);
    search.addEventListener('input', () => {
      const query = search.value.trim().toLocaleLowerCase('ru');
      grid.querySelectorAll('.reader-work-card').forEach(card => {
        card.hidden = Boolean(query) && !card.dataset.search.includes(query);
      });
    });
  } catch (error) {
    panel.replaceChildren(node('p', 'reader-feedback is-error', error.message));
  }
}

async function loadLibrary(panel, openWork) {
  panel.replaceChildren(node('p', 'reader-loading', 'Загружаем библиотеку…'));
  try {
    const works = await api.get('/reader/library');
    panel.replaceChildren();
    if (!works.length) {
      const empty = node('div', 'reader-empty-state');
      empty.append(node('span', 'reader-empty-kicker', 'REBUNAR / LIBRARY'));
      empty.append(node('h3', '', 'Библиотека пока пуста'));
      empty.append(node('p', '', 'Добавляй понравившиеся новеллы и вебтуны в библиотеку — они будут собраны здесь.'));
      panel.append(empty);
      return;
    }
    const toolbar = node('div', 'reader-catalog-toolbar');
    const search = node('input', 'reader-catalog-search');
    search.type = 'search';
    search.placeholder = 'Поиск в моей библиотеке';
    search.setAttribute('aria-label', 'Поиск в моей библиотеке');
    toolbar.append(search);
    panel.append(toolbar);
    const grid = node('div', 'reader-work-grid');
    works.forEach(work => {
      const isNovel = work.category === 'novel';
      const card = button('', 'reader-work-card' + (isNovel ? ' reader-work-card-novel' : ''), () => openWork(work.id));
      card.setAttribute('aria-label', work.title);
      card.dataset.search = [work.title, work.author, work.description].filter(Boolean).join(' ').toLocaleLowerCase('ru');
      if (work.cover_url) {
        const cover = node('img', 'reader-work-cover' + (isNovel ? ' reader-work-cover-novel' : ''));
        cover.src = work.cover_url;
        cover.alt = 'Обложка: ' + work.title;
        cover.loading = 'lazy';
        card.append(cover);
      } else card.append(node('div', 'reader-work-cover reader-work-cover-empty', 'REBUNAR'));
      const info = node('span', 'reader-work-info');
      info.append(node('strong', '', work.title));
      info.append(node('small', '', 'Автор: ' + (work.author || 'Rebunar')));
      if (work.description) info.append(node('span', 'reader-work-description', work.description));
      info.append(node('span', 'reader-work-meta', isNovel ? 'НОВЕЛЛА' : 'ВЕБТУН'));
      card.append(info);
      grid.append(card);
    });
    panel.append(grid);
    search.addEventListener('input', () => {
      const query = search.value.trim().toLocaleLowerCase('ru');
      grid.querySelectorAll('.reader-work-card').forEach(card => {
        card.hidden = Boolean(query) && !card.dataset.search.includes(query);
      });
    });
  } catch (error) {
    panel.replaceChildren(node('p', 'reader-feedback is-error', error.message));
  }
}
async function showPublicWork(panel, workId, back) {
  const screen = panel.closest('.reader-screen');
  screen?.classList.remove('reader-reading-mode');
  screen?.classList.add('reader-detail-mode');
  panel.replaceChildren(node('p', 'reader-loading', 'Открываем произведение…'));
  try {
    const [work, chapters, catalog, library] = await Promise.all([
      api.get('/reader/works/' + workId),
      api.get('/reader/works/' + workId + '/chapters'),
      api.get('/reader/works?category=' + (panel.closest('.reader-screen')?.querySelector('[data-reader-tab="webtoons"].is-active') ? 'webtoon' : 'novel')).catch(() => []),
      api.get('/reader/library').catch(() => [])
    ]);
    panel.replaceChildren();
    const detail = node('section', 'reader-work-detail');
    const top = node('div', 'reader-detail-top');
    top.append(button('← К каталогу', 'reader-back-button', () => {
      screen?.classList.remove('reader-detail-mode');
      back();
    }));
    detail.append(top);
    const hero = node('div', 'reader-detail-hero');
    if (work.cover_url) {
      const art = node('div', 'reader-detail-art');
      const img = node('img', 'reader-detail-cover');
      img.src = work.cover_url; img.alt = 'Обложка: ' + work.title; img.loading = 'eager';
      art.append(img);
      hero.append(art);
    }
    const info = node('div', 'reader-detail-info');
    info.append(node('span', 'reader-eyebrow', work.category === 'novel' ? 'REBUNAR / НОВЕЛЛА' : 'REBUNAR / ВЕБТУН'));
    info.append(node('h2', '', work.title));
    info.append(node('small', '', 'Автор: ' + (work.author || 'Не указан')));
    let isSaved = library.some(item => String(item.id) === String(workId));
    const libraryButton = button(
      isSaved ? 'Убрать из библиотеки' : 'Добавить в библиотеку',
      'reader-secondary-button',
      async () => {
        libraryButton.disabled = true;
        try {
          if (isSaved) {
            await api.delete('/reader/works/' + workId + '/library');
          } else {
            await api.post('/reader/works/' + workId + '/library', {});
          }
          isSaved = !isSaved;
          libraryButton.textContent = isSaved ? 'Убрать из библиотеки' : 'Добавить в библиотеку';
          libraryButton.setAttribute('aria-pressed', String(isSaved));
        } catch (error) {
          window.alert(error.message);
        } finally {
          libraryButton.disabled = false;
        }
      }
    );
    libraryButton.setAttribute('aria-pressed', String(isSaved));
    info.append(libraryButton);
    hero.append(info);
    detail.append(hero);
    const tabBar = node('div', 'reader-work-tabs');
    tabBar.setAttribute('role', 'tablist');
    tabBar.setAttribute('aria-label', 'Разделы произведения');
    const content = node('div', 'reader-work-tab-content');
    const descriptionTab = button('Описание', 'reader-work-tab is-active', () => activateTab('description'));
    const chaptersTab = button('Главы', 'reader-work-tab', () => activateTab('chapters'));
    descriptionTab.setAttribute('role', 'tab');
    chaptersTab.setAttribute('role', 'tab');
    descriptionTab.setAttribute('aria-selected', 'true');
    chaptersTab.setAttribute('aria-selected', 'false');
    tabBar.append(descriptionTab, chaptersTab);
    detail.append(tabBar, content);
    function activateTab(name) {
      const isDescription = name === 'description';
      descriptionTab.classList.toggle('is-active', isDescription);
      chaptersTab.classList.toggle('is-active', !isDescription);
      descriptionTab.setAttribute('aria-selected', String(isDescription));
      chaptersTab.setAttribute('aria-selected', String(!isDescription));
      content.replaceChildren();
      if (isDescription) {
        content.append(node('p', 'reader-work-description', work.description || 'Описание пока не добавлено.'));
      } else if (!chapters.length) {
        content.append(node('p', 'reader-muted', 'Главы скоро появятся.'));
      } else {
        chapters.forEach(chapter => content.append(button(
          'Глава ' + chapter.chapter_number + ' · ' + chapterDisplayTitle(chapter),
          'reader-chapter-link',
          () => showChapter(panel, chapter.id, () => showPublicWork(panel, workId, back))
        )));
      }
    }
    activateTab('description');
    const similar = catalog.filter(item => String(item.id) !== String(workId)).slice(0, 4);
    if (similar.length) {
      const section = node('section', 'reader-similar-section');
      section.append(node('h3', '', 'Похожие произведения'));
      const grid = node('div', 'reader-similar-grid');
      similar.forEach(item => {
        const card = button('', 'reader-similar-card', () => showPublicWork(panel, item.id, back));
        if (item.cover_url) {
          const image = node('img', 'reader-similar-cover');
          image.src = item.cover_url; image.alt = 'Обложка: ' + item.title; image.loading = 'lazy';
          card.append(image);
        }
        const copy = node('span', 'reader-similar-copy');
        copy.append(node('strong', '', item.title || 'Без названия'));
        copy.append(node('small', '', item.author || 'Автор не указан'));
        card.append(copy);
        grid.append(card);
      });
      section.append(grid);
      detail.append(section);
    }
    panel.append(detail);
  } catch (error) {
    screen?.classList.remove('reader-detail-mode');
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
    screen?.classList.remove('reader-detail-mode');
    screen?.classList.add('reader-reading-mode');
    panel.replaceChildren();

    const top = node('div', 'reader-detail-top reader-reading-top');
    top.append(node('span', 'reader-eyebrow', chapter.work_title));
    panel.append(top);
    panel.append(node('h2', 'reader-reading-title', chapterDisplayTitle(chapter)));

    const toolbar = node('div', 'reader-reading-toolbar');
    const listButton = button('☷', 'reader-toolbar-button reader-toolbar-icon', () => {
      const existing = panel.querySelector('.reader-chapter-drawer');
      if (existing) {
        existing.remove();
        listButton.setAttribute('aria-expanded', 'false');
        return;
      }
      const drawer = node('div', 'reader-chapter-drawer');
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-label', 'Список глав');
      chapters.forEach(item => {
        const itemProgress = progress.find(p => p.chapter_id === item.id);
        const readMark = itemProgress?.is_read ? '✓ Прочитана' : '○ Не прочитана';
        const favoriteMark = itemProgress?.is_favorite ? '♥ В избранном' : '♡ Не в избранном';
        const label = 'Глава ' + item.chapter_number + ' · ' + chapterDisplayTitle(item) + '   ' + readMark + '   ' + favoriteMark;
        drawer.append(button(label, 'reader-drawer-chapter' + (item.id === chapterId ? ' is-current' : ''), () => showChapter(panel, item.id, back)));
      });
      panel.append(drawer);
      listButton.setAttribute('aria-expanded', 'true');
    });
    listButton.setAttribute('aria-label', 'Открыть список глав');
    listButton.title = 'Главы';
    listButton.setAttribute('aria-expanded', 'false');
    toolbar.append(listButton);

    const returnButton = button('↩', 'reader-toolbar-button reader-toolbar-icon', back);
    returnButton.setAttribute('aria-label', 'Вернуться к произведению');
    returnButton.title = 'К произведению';
    toolbar.append(returnButton);

    const previousButton = button('‹', 'reader-toolbar-button reader-toolbar-icon reader-toolbar-arrow', () => {
      if (index > 0) showChapter(panel, chapters[index - 1].id, back);
    });
    previousButton.disabled = index <= 0;
    previousButton.setAttribute('aria-label', 'Предыдущая глава');
    previousButton.title = 'Предыдущая глава';
    toolbar.append(previousButton);

    const nextButton = button('›', 'reader-toolbar-button reader-toolbar-icon reader-toolbar-arrow', () => {
      if (index >= 0 && index < chapters.length - 1) showChapter(panel, chapters[index + 1].id, back);
    });
    nextButton.disabled = index < 0 || index >= chapters.length - 1;
    nextButton.setAttribute('aria-label', 'Следующая глава');
    nextButton.title = 'Следующая глава';
    toolbar.append(nextButton);

    const favoriteButton = button(state.is_favorite ? '♥' : '♡', 'reader-toolbar-button reader-toolbar-icon reader-favorite-button' + (state.is_favorite ? ' is-active' : ''), async () => {
      try {
        const updated = await api.post('/reader/chapters/' + chapterId + '/progress', { is_favorite: !state.is_favorite });
        state.is_favorite = updated.is_favorite;
        favoriteButton.textContent = state.is_favorite ? '♥' : '♡';
        favoriteButton.setAttribute('aria-label', state.is_favorite ? 'Убрать из избранного' : 'Добавить в избранное');
        favoriteButton.title = state.is_favorite ? 'Убрать из избранного' : 'В избранное';
        favoriteButton.classList.toggle('is-active', state.is_favorite);
      } catch (error) { window.alert(error.message); }
    });
    favoriteButton.setAttribute('aria-label', state.is_favorite ? 'Убрать из избранного' : 'Добавить в избранное');
    favoriteButton.title = state.is_favorite ? 'Убрать из избранного' : 'В избранное';
    toolbar.append(favoriteButton);

    const readButton = button(state.is_read ? '✓' : '○', 'reader-toolbar-button reader-toolbar-icon reader-read-button' + (state.is_read ? ' is-active' : ''), async () => {
      try {
        const updated = await api.post('/reader/chapters/' + chapterId + '/progress', { is_read: !state.is_read });
        state.is_read = updated.is_read;
        readButton.textContent = state.is_read ? '✓' : '○';
        readButton.setAttribute('aria-label', state.is_read ? 'Отметить непрочитанной' : 'Отметить прочитанной');
        readButton.title = state.is_read ? 'Отметить непрочитанной' : 'Отметить прочитанной';
        readButton.classList.toggle('is-active', state.is_read);
      } catch (error) { window.alert(error.message); }
    });
    readButton.setAttribute('aria-label', state.is_read ? 'Отметить непрочитанной' : 'Отметить прочитанной');
    readButton.title = state.is_read ? 'Отметить непрочитанной' : 'Отметить прочитанной';
    toolbar.append(readButton);
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
    panel.append(toolbar);
    const scrollArea = panel.closest('#screen-outlet');
    if (scrollArea) scrollArea.scrollTop = 0;
  } catch (error) {
    panel.replaceChildren(node('p', 'reader-feedback is-error', error.message));
  }
}

async function renderStudio(panel, refreshLanding) {
  panel.replaceChildren();
  const header = node('div', 'reader-studio-heading');
  header.append(node('div', '', ''));
  header.firstChild.append(node('span', 'reader-eyebrow', 'REBUNAR / CREATOR STUDIO'));
  header.firstChild.append(node('h2', '', 'Моя студия'));
  header.firstChild.append(node('p', '', 'Управляй произведениями и главами.'));
  header.append(button('← Назад в Reader', 'reader-back-button', refreshLanding));
  panel.append(header);

  const form = node('form', 'reader-create-form');
  form.append(node('h3', '', 'Новое произведение'));
  const type = node('select', 'reader-field');
  type.name = 'category';
  [['novel','Новелла'],['webtoon','Вебтун']].forEach(([value,label]) => {
    const option = node('option','',label); option.value = value; type.append(option);
  });
  const title = node('input', 'reader-field'); title.placeholder = 'Название произведения'; title.maxLength = 160; title.required = true;
  const description = node('textarea', 'reader-field'); description.placeholder = 'Краткое описание'; description.maxLength = 3000; description.rows = 3;
  const cover = node('input', 'reader-field'); cover.type = 'file'; cover.accept = 'image/jpeg,image/png,image/webp'; cover.required = true;
  const coverLabel = node('label','reader-upload-label','Обложка произведения (JPG, PNG или WebP, до 8 МБ)');
  coverLabel.append(cover);
  const feedback = node('p','reader-feedback'); feedback.hidden = true;
  const submit = node('button','reader-primary-button','Создать черновик');
  submit.type = 'submit';
  form.append(type,title,description,coverLabel,feedback,submit);
  form.addEventListener('submit', async event => {
    event.preventDefault(); submit.disabled = true; message(feedback,'Создаём произведение…');
    let createdId = null;
    try {
      const created = await api.post('/reader/works',{category:type.value,title:title.value,description:description.value});
      createdId = created.id;
      const data = new FormData(); data.append('image',cover.files[0]);
      await api.upload('/reader/works/' + created.id + '/cover',data);
      message(feedback,'Черновик создан. Теперь добавь первую главу.');
      title.value=''; description.value=''; cover.value='';
      await loadStudioWorks(worksList, panel, refreshLanding);
    } catch(error) {
      message(feedback,error.message,true);
      if (createdId) await loadStudioWorks(worksList, panel, refreshLanding);
    }
    finally { submit.disabled=false; }
  });
  panel.append(form);
  const worksList = node('div','reader-studio-works');
  worksList.append(node('h3','','Мои произведения'));
  panel.append(worksList);
  await loadStudioWorks(worksList,panel,refreshLanding);
}

function renderWorkEditor(container,work,list,panel,refreshLanding) {
  container.querySelector('.reader-work-editor')?.remove();
  const form = node('form','reader-chapter-editor reader-work-editor');
  form.append(node('h4','','Редактировать произведение'));
  const title = node('input','reader-field');
  title.value = work.title || '';
  title.maxLength = 160;
  title.required = true;
  title.setAttribute('aria-label','Название произведения');
  const description = node('textarea','reader-field');
  description.value = work.description || '';
  description.maxLength = 3000;
  description.rows = 4;
  description.setAttribute('aria-label','Описание произведения');
  const feedback = node('p','reader-feedback');
  feedback.hidden = true;
  const save = node('button','reader-primary-button','Сохранить изменения');
  save.type = 'submit';
  form.append(title,description,feedback,save);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    save.disabled = true;
    message(feedback,'Сохраняем изменения…');
    try {
      await api.put('/reader/works/'+work.id,{title:title.value,description:description.value});
      message(feedback,'Изменения сохранены.');
      await loadStudioWorks(list,panel,refreshLanding);
    } catch(error) {
      message(feedback,error.message,true);
    } finally {
      save.disabled = false;
    }
  });
  container.append(form);
}

async function renderChapterEditForm(container,work,chapter,list,panel,refreshLanding) {
  container.querySelector('.reader-chapter-editor')?.remove();
  const form = node('form','reader-chapter-editor');
  form.append(node('h4','','Редактировать главу '+chapter.chapter_number));
  const feedback = node('p','reader-feedback');
  feedback.hidden = true;
  const title = node('input','reader-field');
  title.placeholder = 'Название главы';
  title.maxLength = 160;
  title.required = true;
  const content = work.category === 'novel' ? node('textarea','reader-field') : null;
  if (content) {
    content.placeholder = 'Текст главы…';
    content.rows = 14;
    content.maxLength = 200000;
  } else {
    form.append(node('p','reader-muted','Страницы вебтуна останутся без изменений. Здесь можно изменить только название главы.'));
  }
  const save = node('button','reader-primary-button','Сохранить изменения');
  save.type = 'submit';
  form.append(title);
  if (content) form.append(content);
  form.append(feedback,save);
  container.append(form);
  message(feedback,'Загружаем главу…');
  save.disabled = true;
  try {
    const details = await api.get('/reader/studio/chapters/'+chapter.id);
    title.value = details.title || '';
    if (content) content.value = details.content || '';
    message(feedback,'');
  } catch(error) {
    message(feedback,error.message,true);
    return;
  } finally {
    save.disabled = false;
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    save.disabled = true;
    message(feedback,'Сохраняем изменения…');
    try {
      await api.put('/reader/chapters/'+chapter.id,{title:title.value,content:content?.value||''});
      message(feedback,'Изменения сохранены. Статус публикации не изменён.');
      await loadStudioWorks(list,panel,refreshLanding);
    } catch(error) {
      message(feedback,error.message,true);
    } finally {
      save.disabled = false;
    }
  });
}

async function renderWebtoonPagesEditor(container,chapter) {
  container.querySelector('.reader-webtoon-pages-editor')?.remove();
  const editor=node('section','reader-webtoon-pages-editor');
  const heading=node('div','reader-webtoon-pages-heading');
  heading.append(node('h4','','Страницы вебтуна'));
  const addInput=node('input','reader-field');
  addInput.type='file'; addInput.accept='image/jpeg,image/png,image/webp'; addInput.multiple=true; addInput.hidden=true;
  const addButton=button('Добавить страницу','reader-primary-button',()=>addInput.click());
  addInput.addEventListener('change',async()=>{
    const selected=[...addInput.files];
    if(!selected.length)return;
    addButton.disabled=true;
    try {
      for(let i=0;i<selected.length;i++) {
        message(feedback,'Добавляем страницу '+(i+1)+' из '+selected.length+'…');
        const data=new FormData(); data.append('image',selected[i]);
        await api.upload('/reader/chapters/'+chapter.id+'/pages/add',data);
      }
      message(feedback,'Добавлено страниц: '+selected.length);
      await loadPages();
    } catch(error) {
      message(feedback,error.message,true);
      await loadPages();
    } finally {
      addInput.value='';
      addButton.disabled=false;
    }
  });
  heading.append(addButton,addInput);
  editor.append(heading);
  const feedback=node('p','reader-feedback'); feedback.hidden=true;
  const pagesList=node('div','reader-webtoon-page-list');
  editor.append(feedback,pagesList);
  container.append(editor);

  const loadPages=async()=>{
    pagesList.replaceChildren(node('p','reader-muted','Загружаем страницы…'));
    try {
      const pages=await api.get('/reader/studio/chapters/'+chapter.id+'/pages');
      pagesList.replaceChildren();
      if(!pages.length) {
        pagesList.append(node('p','reader-muted','В этой главе пока нет страниц.'));
        return;
      }
      pages.forEach((page,index)=>{
        const row=node('div','reader-webtoon-page-row');
        const preview=node('img','reader-webtoon-page-preview');
        preview.src=page.image_url;
        preview.alt='Страница '+page.page_number;
        preview.loading='lazy';
        const info=node('div','reader-webtoon-page-info');
        info.append(node('strong','','Страница '+page.page_number));
        info.append(node('small','','Порядок отображения в главе'));
        const actions=node('div','reader-webtoon-page-actions');
        const moveUp=button('↑','reader-secondary-button',async()=>{
          const ids=pages.map(item=>item.id);
          [ids[index-1],ids[index]]=[ids[index],ids[index-1]];
          await reorder(ids,moveUp);
        });
        moveUp.disabled=index===0;
        moveUp.title='Переместить выше';
        const moveDown=button('↓','reader-secondary-button',async()=>{
          const ids=pages.map(item=>item.id);
          [ids[index],ids[index+1]]=[ids[index+1],ids[index]];
          await reorder(ids,moveDown);
        });
        moveDown.disabled=index===pages.length-1;
        moveDown.title='Переместить ниже';
        const replace=button('Заменить','reader-secondary-button',()=>{
          const input=node('input','reader-field');
          input.type='file'; input.accept='image/jpeg,image/png,image/webp';
          input.hidden=true;
          input.addEventListener('change',async()=>{
            if(!input.files?.[0])return;
            const data=new FormData(); data.append('image',input.files[0]);
            replace.disabled=true;
            message(feedback,'Заменяем страницу '+page.page_number+'…');
            try {
              await api.upload('/reader/pages/'+page.id+'/replace',data);
              message(feedback,'Страница заменена.');
              await loadPages();
            } catch(error) {
              message(feedback,error.message,true);
              replace.disabled=false;
            }
          });
          row.append(input);
          input.click();
        });
        const remove=button('Удалить','reader-danger-button reader-danger-button-small',async()=>{
          if(!window.confirm('Удалить страницу '+page.page_number+'? Остальные страницы сохранятся, их номера обновятся.'))return;
          remove.disabled=true;
          try {
            await api.delete('/reader/pages/'+page.id);
            message(feedback,'Страница удалена.');
            await loadPages();
          } catch(error) {
            message(feedback,error.message,true);
            remove.disabled=false;
          }
        });
        remove.disabled=pages.length<=1;
        actions.append(moveUp,moveDown,replace,remove);
        row.append(preview,info,actions);
        pagesList.append(row);
      });
    } catch(error) {
      pagesList.replaceChildren(node('p','reader-feedback is-error',error.message));
    }
  };
  const reorder=async(ids,control)=>{
    if(control)control.disabled=true;
    message(feedback,'Сохраняем порядок страниц…');
    try {
      await api.put('/reader/chapters/'+chapter.id+'/pages/order',{page_ids:ids});
      message(feedback,'Порядок страниц сохранён.');
      await loadPages();
    } catch(error) {
      message(feedback,error.message,true);
      if(control)control.disabled=false;
    }
  };
  await loadPages();
}

async function loadStudioWorks(list,panel,refreshLanding) {
  try {
    const works = await api.get('/reader/studio/works');
    list.replaceChildren(node('h3','','Мои произведения'));
    if (!works.length) list.append(node('p','reader-muted','Пока нет произведений. Создай первое выше.'));
    for (const work of works) {
      const item = node('section','reader-studio-work');
      const title = node('div','reader-studio-work-title');
      title.append(node('strong','',work.title));
      title.append(node('span','reader-status-tag',work.status === 'published' ? 'Опубликовано' : 'Черновик'));
      item.append(title);
      item.append(node('p','reader-muted',work.category === 'novel' ? 'Новелла' : 'Вебтун'));
      const workActions = node('div','reader-studio-actions');
      workActions.append(button('Редактировать произведение','reader-secondary-button',() => renderWorkEditor(item,work,list,panel,refreshLanding)));
      workActions.append(button(
        work.cover_url ? 'Заменить обложку' : 'Загрузить обложку',
        'reader-secondary-button',
        () => {
          const input=node('input','reader-field');
          input.type='file';
          input.accept='image/jpeg,image/png,image/webp';
          input.addEventListener('change',async()=>{
            if(!input.files[0])return;
            const data=new FormData();
            data.append('image',input.files[0]);
            try {
              await api.upload('/reader/works/'+work.id+'/cover',data);
              await loadStudioWorks(list,panel,refreshLanding);
            } catch(error) {
              window.alert(error.message);
            }
          });
          input.click();
        }
      ));
      item.append(workActions);
      let studioChapters = [];
      let studioChaptersError = null;
      try {
        studioChapters = await api.get('/reader/studio/works/'+work.id+'/chapters');
      } catch (error) {
        studioChaptersError = error;
      }

      const publishedChapterCount = studioChapters.filter(chapter => chapter.status === 'published').length;
      const draftChapterCount = studioChapters.filter(chapter => chapter.status !== 'published').length;
      const hasCover = Boolean(work.cover_url);
      const hasPublishedChapter = publishedChapterCount > 0;
      const canPublishWork = hasCover && hasPublishedChapter && !studioChaptersError;

      const summary = node(
        'p',
        'reader-studio-summary',
        'Главы: ' + publishedChapterCount + ' опубликовано · ' + draftChapterCount + ' черновик' +
          (draftChapterCount === 1 ? '' : draftChapterCount > 1 && draftChapterCount < 5 ? 'а' : 'ов')
      );
      item.append(summary);

      if (work.status === 'draft') {
        const readiness = node('section', 'reader-publish-readiness');
        readiness.append(node('strong', '', 'Готовность к публикации'));
        const checklist = node('div', 'reader-publish-checklist');
        [
          [hasCover, 'Обложка произведения загружена'],
          [hasPublishedChapter, 'Есть хотя бы одна опубликованная глава']
        ].forEach(([complete, label]) => {
          const line = node('span', complete ? 'reader-publish-check reader-publish-check-done' : 'reader-publish-check', (complete ? '✓ ' : '○ ') + label);
          checklist.append(line);
        });
        if (studioChaptersError) {
          checklist.append(node('span', 'reader-publish-check reader-publish-check-warning', 'Не удалось проверить главы. Обнови студию.'));
        }
        readiness.append(checklist);
        item.append(readiness);
      }

      const actions = node('div','reader-studio-actions');
      actions.append(button('Добавить главу','reader-secondary-button',() => renderChapterEditor(item,work,refreshLanding,list,panel)));
      if (
        work.category === 'novel' &&
        work.title.trim().toLocaleLowerCase() === 'когда тьма пробуждается' &&
        studioChapters.some(chapter => chapter.chapter_number === 2)
      ) {
        actions.append(button('Обновить текст главы 2','reader-secondary-button',async event => {
          const confirmed = window.confirm('Заменить текст главы 2 расширенной версией из проекта? Текущее содержимое главы будет перезаписано. Статус публикации и прогресс чтения сохранятся.');
          if (!confirmed) return;
          const syncButton = event?.currentTarget;
          if (syncButton) syncButton.disabled = true;
          try {
            const updated = await api.post('/reader/works/'+work.id+'/sync-project-chapter',{});
            window.alert('Текст главы 2 обновлён. Статус публикации сохранён.');
            await loadStudioWorks(list,panel,refreshLanding);
          } catch(error) {
            window.alert(error.message);
            if (syncButton) syncButton.disabled = false;
          }
        }));
      }
      if (
        work.category === 'novel' &&
        work.title.trim().toLocaleLowerCase() === 'когда тьма пробуждается' &&
        !studioChapters.some(chapter => chapter.chapter_number === 2)
      ) {
        actions.append(button('Импортировать главу 2 из проекта','reader-secondary-button',async event => {
          const importButton = event?.currentTarget;
          if (importButton) importButton.disabled = true;
          try {
            const imported = await api.post('/reader/works/'+work.id+'/import-project-chapter',{chapter_number:2});
            window.alert('Глава '+imported.chapter_number+' «'+imported.title+'» импортирована как черновик. Проверь текст перед публикацией.');
            await loadStudioWorks(list,panel,refreshLanding);
          } catch(error) {
            window.alert(error.message);
            if (importButton) importButton.disabled = false;
          }
        }));
      }
      if (work.status === 'draft') {
        const publishWork = button('Опубликовать произведение','reader-primary-button',async () => {
          publishWork.disabled = true;
          try {
            await api.post('/reader/works/'+work.id+'/publish',{});
            await loadStudioWorks(list,panel,refreshLanding);
          } catch(error) {
            window.alert(error.message);
            publishWork.disabled = false;
          }
        });
        publishWork.disabled = !canPublishWork;
        publishWork.title = canPublishWork
          ? 'Опубликовать произведение'
          : 'Сначала загрузи обложку и опубликуй хотя бы одну главу';
        actions.append(publishWork);
      }
      actions.append(button('Удалить произведение','reader-danger-button',async () => {
        const confirmed = window.confirm('Удалить произведение «'+work.title+'» вместе со всеми главами и изображениями? Это действие нельзя отменить.');
        if (!confirmed) return;
        try {
          await api.delete('/reader/works/'+work.id);
          await loadStudioWorks(list,panel,refreshLanding);
        } catch(error) { window.alert(error.message); }
      }));
      item.append(actions);

      const chaptersBox = node('div','reader-studio-chapters');
      chaptersBox.append(node('h4','','Главы'));
      try {
        if (studioChaptersError) throw studioChaptersError;
        const chapters = studioChapters;
        if (!chapters.length) chaptersBox.append(node('p','reader-muted','Глав пока нет.'));
        chapters.forEach(chapter => {
          const row = node('div','reader-studio-chapter');
          const chapterInfo = node('div','reader-studio-chapter-info');
          chapterInfo.append(node('strong','', 'Глава '+chapter.chapter_number+' · '+chapterDisplayTitle(chapter)));
          chapterInfo.append(node('small','',chapter.status === 'published' ? 'Опубликована' : 'Черновик'));
          row.append(chapterInfo);
          const chapterActions = node('div','reader-studio-chapter-actions');
          chapterActions.append(button('Изменить','reader-secondary-button reader-danger-button-small',() => renderChapterEditForm(item,work,chapter,list,panel,refreshLanding)));
          if (work.category === 'webtoon') {
            chapterActions.append(button('Страницы','reader-secondary-button',() => renderWebtoonPagesEditor(item,chapter)));
          }
          if (chapter.status !== 'published') {
            chapterActions.append(button('Опубликовать','reader-primary-button reader-publish-chapter-button',async publishEvent => {
              const publishButton = publishEvent?.currentTarget;
              if (publishButton) publishButton.disabled = true;
              try {
                await api.post('/reader/chapters/'+chapter.id+'/publish',{});
                await loadStudioWorks(list,panel,refreshLanding);
              } catch(error) {
                window.alert(error.message);
                if (publishButton) publishButton.disabled = false;
              }
            }));
          }
          chapterActions.append(button('Удалить','reader-danger-button reader-danger-button-small',async () => {
            const confirmed = window.confirm('Удалить главу «'+chapter.title+'»? Это действие нельзя отменить.');
            if (!confirmed) return;
            try { await api.delete('/reader/chapters/'+chapter.id); await loadStudioWorks(list,panel,refreshLanding); }
            catch(error) { window.alert(error.message); }
          }));
          row.append(chapterActions);
          chaptersBox.append(row);
        });
      } catch(error) {
        chaptersBox.append(node('p','reader-feedback is-error',error.message));
      }
      item.append(chaptersBox);
      list.append(item);
    }
  } catch(error) { list.append(node('p','reader-feedback is-error',error.message)); }
}

function renderChapterEditor(container,work,refreshLanding,list,panel) {
  container.querySelector('.reader-chapter-editor')?.remove();
  const form = node('form','reader-chapter-editor');
  const heading = node('h4','','Новая глава');
  const fields = node('div','reader-chapter-editor-fields');
  const title = node('input','reader-field');
  title.placeholder='Название главы'; title.required=true; title.maxLength=160;
  fields.append(title);
  let content=null, pages=null;
  if (work.category === 'novel') {
    content=node('textarea','reader-field');
    content.placeholder='Текст главы…'; content.rows=12; content.maxLength=200000; content.required=true;
    fields.append(content);
  } else {
    const label=node('label','reader-upload-label','Страницы вебтуна (можно выбрать несколько; порядок — по именам файлов)');
    pages=node('input','reader-field');
    pages.type='file'; pages.accept='image/jpeg,image/png,image/webp'; pages.multiple=true;
    label.append(pages); fields.append(label);
  }

  const feedback=node('p','reader-feedback'); feedback.hidden=true;
  const save=node('button','reader-primary-button','Сохранить черновик и открыть предпросмотр');
  save.type='submit';
  const preview=node('section','reader-chapter-preview'); preview.hidden=true;
  form.append(heading,fields,feedback,save,preview);
  container.append(form);

  let chapterId=null;
  const uploadedFiles=new Set();
  let pageManagerOpen=false;

  const renderPreview=async()=>{
    message(feedback,'Загружаем сохранённую главу для предпросмотра…');
    try {
      const chapter=await api.get('/reader/studio/chapters/'+chapterId);
      let pageItems=[];
      if(work.category==='webtoon') {
        pageItems=await api.get('/reader/studio/chapters/'+chapterId+'/pages');
      }
      preview.replaceChildren();
      const previewHead=node('div','reader-chapter-preview-heading');
      previewHead.append(
        node('span','reader-status-tag','ЧЕРНОВИК'),
        node('h4','',chapter.title)
      );
      preview.append(previewHead);
      if(work.category==='novel') {
        const text=node('div','reader-chapter-preview-text',chapter.content||'');
        preview.append(text);
      } else {
        const pageSummary=node('p','reader-muted','Страниц: '+pageItems.length+' · порядок проверен');
        preview.append(pageSummary);
        const pageGrid=node('div','reader-chapter-preview-pages');
        pageItems.forEach(page=>{
          const figure=node('figure','reader-chapter-preview-page');
          const image=node('img');
          image.src=page.image_url;
          image.alt='Предпросмотр страницы '+page.page_number;
          image.loading='lazy';
          figure.append(image,node('figcaption','','Страница '+page.page_number));
          pageGrid.append(figure);
        });
        if(!pageItems.length) pageGrid.append(node('p','reader-feedback is-error','Пока нет загруженных страниц. Добавь хотя бы одну перед публикацией.'));
        preview.append(pageGrid);
      }
      const actions=node('div','reader-chapter-preview-actions');
      actions.append(button('Вернуться к редактированию','reader-secondary-button',()=>{
        preview.hidden=true;
        fields.hidden=false;
        save.hidden=false;
        save.textContent='Сохранить изменения и обновить предпросмотр';
        if(work.category==='webtoon'&&!pageManagerOpen) {
          pageManagerOpen=true;
          renderWebtoonPagesEditor(form,{id:chapterId});
        }
      }));
      const publish=button('Опубликовать главу','reader-primary-button',async()=>{
        publish.disabled=true;
        message(feedback,'Публикуем главу…');
        try {
          await api.post('/reader/chapters/'+chapterId+'/publish',{});
          message(feedback,'Глава опубликована.');
          await loadStudioWorks(list,panel,refreshLanding);
        } catch(error) {
          message(feedback,error.message,true);
          publish.disabled=false;
        }
      });
      publish.disabled=work.category==='webtoon'&&pageItems.length===0;
      actions.append(publish);
      preview.append(actions);
      form.querySelector('.reader-webtoon-pages-editor')?.remove();
      pageManagerOpen=false;
      fields.hidden=true;
      save.hidden=true;
      preview.hidden=false;
      message(feedback,'Черновик сохранён. Проверь содержимое перед публикацией.');
    } catch(error) {
      message(feedback,error.message,true);
    }
  };

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!title.value.trim()) {
      message(feedback,'Укажи название главы.',true);
      return;
    }
    if(work.category==='novel'&&!content.value.trim()) {
      message(feedback,'Добавь текст главы перед сохранением.',true);
      return;
    }
    const selected=pages?[...pages.files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})): [];
    if(work.category==='webtoon'&&!chapterId&&!selected.length) {
      message(feedback,'Выбери хотя бы одну страницу вебтуна.',true);
      return;
    }
    save.disabled=true;
    try {
      if(!chapterId) {
        message(feedback,'Создаём черновик…');
        const created=await api.post('/reader/works/'+work.id+'/chapters',{
          title:title.value,
          content:content?.value||''
        });
        chapterId=created.id;
      } else {
        message(feedback,'Сохраняем изменения…');
        await api.put('/reader/chapters/'+chapterId,{
          title:title.value,
          content:content?.value||''
        });
      }
      for(let i=0;i<selected.length;i++) {
        const file=selected[i];
        const key=[file.name,file.size,file.lastModified].join(':');
        if(uploadedFiles.has(key)) continue;
        message(feedback,'Загружаем страницу '+(i+1)+' из '+selected.length+'…');
        const data=new FormData(); data.append('image',file);
        await api.upload('/reader/chapters/'+chapterId+'/pages',data);
        uploadedFiles.add(key);
      }
      if(pages) pages.value='';
      await renderPreview();
    } catch(error) {
      message(feedback,error.message,true);
    } finally {
      save.disabled=false;
    }
  });
}

export function renderReaderScreen(outlet, params = {}) {
  const initialCategory = params.category === 'library' ? 'library' : (Object.hasOwn(categories, params.category) ? params.category : 'novels');
  outlet.innerHTML = [
    '<section class="screen reader-screen">',
    '<header class="reader-hero reader-catalog-hero"><div class="reader-hero-copy"><span class="reader-eyebrow">REBUNAR / READER</span><h1>Что почитаем?</h1></div></header>',
    '<div class="reader-tabs" role="tablist" aria-label="Категории чтения">',
      '<button class="reader-tab" type="button" role="tab" data-reader-tab="novels" aria-selected="false"><span class="reader-tab-icon" aria-hidden="true">Aa</span><span class="reader-tab-copy"><strong>Новеллы</strong><small>Текстовые истории</small></span></button>',
      '<button class="reader-tab" type="button" role="tab" data-reader-tab="webtoons" aria-selected="false"><span class="reader-tab-icon" aria-hidden="true">▤</span><span class="reader-tab-copy"><strong>Вебтуны</strong><small>Истории в картинках</small></span></button>',
      '<button class="reader-tab" type="button" role="tab" data-reader-tab="library" aria-selected="false"><span class="reader-tab-icon" aria-hidden="true">♡</span><span class="reader-tab-copy"><strong>Библиотека</strong><small>Сохранённые истории</small></span></button>',
    '</div>',
    '<section class="reader-category-panel" id="reader-category-panel" aria-live="polite"></section>',
    '</section>'
  ].join('');
  const panel=outlet.querySelector('#reader-category-panel');
  const tabs=[...outlet.querySelectorAll('[data-reader-tab]')];
  let active='novels';
  const activateCategory=key=>{
    if(!categories[key] && key!=='library')return;
    outlet.querySelector('.reader-screen')?.classList.remove('reader-detail-mode','reader-reading-mode');
    active=key;
    tabs.forEach(tab=>{const on=tab.dataset.readerTab===key;tab.classList.toggle('is-active',on);tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;});
    panel.replaceChildren();
    const catalog=node('div','reader-catalog-list');
    panel.append(catalog);
    if(key==='library'){
      loadLibrary(catalog,id=>showPublicWork(panel,id,()=>activateCategory(key)));
      return;
    }
    loadCatalog(catalog,key,id=>showPublicWork(panel,id,()=>activateCategory(key)));
  };
  tabs.forEach(tab=>tab.addEventListener('click',()=>activateCategory(tab.dataset.readerTab)));
  const refreshLanding=()=>{
    outlet.querySelector('.reader-studio-panel')?.remove();
    outlet.querySelector('.reader-hero h1').textContent='Что почитаем?';
    outlet.querySelector('.reader-tabs').hidden=false;
    activateCategory(active);
    outlet.querySelector('.reader-tabs')?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  if(params.mode==='studio'){
    outlet.querySelector('.reader-hero h1').textContent='Студия автора';
    outlet.querySelector('.reader-tabs').hidden=true;
    const studio=node('section','reader-studio-panel');
    panel.append(studio);
    renderStudio(studio,refreshLanding);
  }else{
    activateCategory(initialCategory);
  }
}
