/**
 * REBUNAR — READER
 * Каталог новелл и вебтунов + открытая студия автора.
 */
import { api } from '../../shared/api/client.js';
import { navigate } from '../../app/router.js';

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
      empty.append(node('p', '', 'Стань первым автором — опубликуй свою историю в Rebunar.'));
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
    panel.replaceChildren(button('← Назад к произведению', 'reader-back-button', back));
    panel.append(node('span', 'reader-eyebrow', chapter.work_title));
    panel.append(node('h2', 'reader-reading-title', chapter.title));
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

async function renderStudio(panel, refreshLanding) {
  panel.replaceChildren();
  const header = node('div', 'reader-studio-heading');
  header.append(node('div', '', ''));
  header.firstChild.append(node('span', 'reader-eyebrow', 'REBUNAR / CREATOR STUDIO'));
  header.firstChild.append(node('h2', '', 'Моя студия'));
  header.firstChild.append(node('p', '', 'Создавай произведения, добавляй главы и публикуй их для читателей.'));
  header.append(button('← В Reader', 'reader-back-button', refreshLanding));
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
    try {
      const created = await api.post('/reader/works',{category:type.value,title:title.value,description:description.value});
      const data = new FormData(); data.append('image',cover.files[0]);
      await api.upload('/reader/works/' + created.id + '/cover',data);
      message(feedback,'Черновик создан. Теперь добавь первую главу.');
      title.value=''; description.value=''; cover.value='';
      await loadStudioWorks(worksList, panel, refreshLanding);
    } catch(error) { message(feedback,error.message,true); }
    finally { submit.disabled=false; }
  });
  panel.append(form);
  const worksList = node('div','reader-studio-works');
  worksList.append(node('h3','','Мои произведения'));
  panel.append(worksList);
  await loadStudioWorks(worksList,panel,refreshLanding);
}

async function loadStudioWorks(list,panel,refreshLanding) {
  try {
    const works = await api.get('/reader/studio/works');
    list.replaceChildren(node('h3','','Мои произведения'));
    if (!works.length) list.append(node('p','reader-muted','Пока нет произведений. Создай первое выше.'));
    works.forEach(work => {
      const item = node('section','reader-studio-work');
      const title = node('div','reader-studio-work-title');
      title.append(node('strong','',work.title));
      title.append(node('span','reader-status-tag',work.status === 'published' ? 'Опубликовано' : 'Черновик'));
      item.append(title);
      item.append(node('p','reader-muted',work.category === 'novel' ? 'Новелла' : 'Вебтун'));
      const actions = node('div','reader-studio-actions');
      actions.append(button('Добавить главу','reader-secondary-button',() => renderChapterEditor(item,work,refreshLanding)));
      if (work.status === 'draft') actions.append(button('Опубликовать произведение','reader-primary-button',async () => {
        try { await api.post('/reader/works/'+work.id+'/publish',{}); await loadStudioWorks(list,panel,refreshLanding); }
        catch(error) { window.alert(error.message); }
      }));
      item.append(actions); list.append(item);
    });
  } catch(error) { list.append(node('p','reader-feedback is-error',error.message)); }
}

function renderChapterEditor(container,work,refreshLanding) {
  container.querySelector('.reader-chapter-editor')?.remove();
  const form = node('form','reader-chapter-editor');
  form.append(node('h4','','Новая глава'));
  const title = node('input','reader-field'); title.placeholder='Название главы'; title.required=true; title.maxLength=160;
  form.append(title);
  let content=null, pages=null;
  if (work.category === 'novel') {
    content=node('textarea','reader-field'); content.placeholder='Текст главы…'; content.rows=12; content.maxLength=200000; content.required=true;
    form.append(content);
  } else {
    const label=node('label','reader-upload-label','Страницы вебтуна (можно выбрать несколько; порядок — по именам файлов)');
    pages=node('input','reader-field'); pages.type='file'; pages.accept='image/jpeg,image/png,image/webp'; pages.multiple=true; pages.required=true;
    label.append(pages); form.append(label);
  }
  const feedback=node('p','reader-feedback'); feedback.hidden=true;
  const submit=node('button','reader-primary-button','Сохранить и опубликовать главу'); submit.type='submit';
  form.append(feedback,submit);
  form.addEventListener('submit',async event=>{
    event.preventDefault(); submit.disabled=true; message(feedback,'Сохраняем главу…');
    try {
      const chapter=await api.post('/reader/works/'+work.id+'/chapters',{title:title.value,content:content?.value||''});
      if (pages) {
        const selected=[...pages.files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
        for (let i=0;i<selected.length;i++) {
          message(feedback,'Загружаем страницу '+(i+1)+' из '+selected.length+'…');
          const data=new FormData(); data.append('image',selected[i]);
          await api.upload('/reader/chapters/'+chapter.id+'/pages',data);
        }
      }
      await api.post('/reader/chapters/'+chapter.id+'/publish',{});
      message(feedback,'Глава опубликована!');
      title.value=''; if(content) content.value=''; if(pages) pages.value='';
    } catch(error) { message(feedback,error.message,true); }
    finally { submit.disabled=false; }
  });
  container.append(form);
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
      <section class="reader-author-cta">
        <div><span class="reader-eyebrow">ТВОЯ ИСТОРИЯ МОЖЕТ НАЧАТЬСЯ ЗДЕСЬ</span><h2>Хочешь стать автором?</h2><p>Создавай произведения, загружай главы и находи своих читателей.</p></div>
        <button class="reader-author-button" type="button" id="reader-author-open">Стать автором</button>
      </section>
      <div class="reader-tabs" role="tablist" aria-label="Категории чтения">
        <button class="reader-tab" type="button" role="tab" data-reader-tab="novels" aria-selected="false"><span>Aa</span><span>Новеллы</span></button>
        <button class="reader-tab" type="button" role="tab" data-reader-tab="webtoons" aria-selected="false"><span>▤</span><span>Вебтуны</span></button>
      </div>
      <section class="reader-category-panel" id="reader-category-panel" aria-live="polite"></section>
      <footer class="reader-footer"><span>REBUNAR READER</span><p>Истории, к которым хочется возвращаться.</p></footer>
    </section>`;
  const panel=outlet.querySelector('#reader-category-panel');
  const tabs=[...outlet.querySelectorAll('[data-reader-tab]')];
  let active='novels';
  const activateCategory=key=>{
    if(!categories[key])return;
    active=key;
    tabs.forEach(tab=>{const on=tab.dataset.readerTab===key;tab.classList.toggle('is-active',on);tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;});
    panel.replaceChildren();
    const heading=node('div','reader-category-heading');
    heading.append(node('div','',''));
    heading.firstChild.append(node('span','reader-eyebrow',key==='novels'?'ТЕКСТОВЫЕ ИСТОРИИ':'ИСТОРИИ В КАРТИНКАХ'));
    heading.firstChild.append(node('h2','',categories[key].title));
    heading.firstChild.append(node('p','',categories[key].description));
    panel.append(heading);
    const catalog = node('div','reader-catalog-list');
    panel.append(catalog);
    loadCatalog(catalog,key,id=>showPublicWork(panel,id,()=>activateCategory(key)));
  };
  tabs.forEach(tab=>tab.addEventListener('click',()=>activateCategory(tab.dataset.readerTab)));
  const refreshLanding=()=>{outlet.querySelector('.reader-author-cta')?.scrollIntoView({behavior:'smooth',block:'start'});activateCategory(active);};
  outlet.querySelector('#reader-author-open').addEventListener('click',async()=>{
    const existingStudio=outlet.querySelector('.reader-studio-panel');
    if(existingStudio){existingStudio.scrollIntoView({behavior:'smooth',block:'start'});return;}
    try {
      const works=await api.get('/reader/studio/works');
      const cta=outlet.querySelector('.reader-author-cta');
      const studio=node('section','reader-studio-panel');
      cta.after(studio);
      outlet.querySelector('#reader-author-open').textContent=works.some(w=>w.status==='published')?'Моя студия':'Стать автором';
      await renderStudio(studio,refreshLanding);
      studio.scrollIntoView({behavior:'smooth',block:'start'});
    } catch(error) {
      window.alert(error.message==='Не удалось подключиться к серверу'?error.message:'Войди в аккаунт Rebunar, чтобы открыть студию автора.');
    }
  });
  activateCategory(initialCategory);
}
