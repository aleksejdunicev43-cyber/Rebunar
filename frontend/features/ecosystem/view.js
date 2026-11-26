/**
 * REBUNAR — ECOSYSTEM SECTIONS
 * Honest structural placeholders for future platform areas.
 */
import { navigate } from '../../app/router.js';

const sections = {
  store: {
    eyebrow: 'REBUNAR / APP STORE',
    title: 'Магазин приложений',
    description: 'Добавляй веб-приложения на главный экран Rebunar. Это ярлыки-ссылки: они не занимают память телефона и открывают оригинальные сайты.',
    apps: [
      {
        id: 'pinterest',
        name: 'Pinterest',
        category: 'Идеи и вдохновение',
        description: 'Сохраняй идеи, изображения, подборки и вдохновение в своих коллекциях.',
        url: 'https://www.pinterest.com/',
        icon: 'P',
        color: '#bd081c'
      }
    ]
  },
  studio: {
    eyebrow: 'REBUNAR / СОЗДАНИЕ ИГР',
    title: 'Rebunar Studio',
    subtitle: 'Студия создания игр',
    description: 'Рабочее пространство для создания игр с визуальным редактором и специализированными ИИ-инструментами.',
    status: 'СТУДИЯ — БУДУЩИЙ ЭТАП РАЗВИТИЯ',
    cards: [
      ['Создание по описанию', 'Опиши идею игры обычными словами и постепенно преврати её в рабочий проект.'],
      ['Редактор проекта', 'Сцены, объекты, логика, предпросмотр и история изменений.'],
      ['ИИ-инструменты', 'Помощь с кодом, игровыми механиками, графикой и анимацией.']
    ]
  },
  creators: {
    eyebrow: 'REBUNAR / ТВОРЧЕСТВО',
    title: 'Творчество',
    description: 'Пространство для авторов манхвы, вебтунов, анимации, музыки и других цифровых работ.',
    status: 'ТВОРЧЕСКИЕ ИНСТРУМЕНТЫ — В ПЛАНАХ',
    cards: [
      ['Манхва и вебтуны', 'Публикация глав, серии, страницы авторов и чтение работ.'],
      ['Анимация и графика', 'Инструменты подготовки визуальных материалов и коротких анимаций.'],
      ['Работы авторов', 'Портфолио, подписки на авторов и поддержка понравившихся проектов.']
    ]
  },
  mail: {
    eyebrow: 'REBUNAR / ПОЧТА',
    title: 'Почта Rebunar',
    description: 'Отдельный ящик для важных писем от платформы: новости, события, подарки, награды и сообщения администрации.',
    status: 'ПОЧТОВЫЙ ЯЩИК — КАРКАС РАЗДЕЛА',
    cards: [
      ['Письма платформы', 'Важные сообщения и объявления Rebunar.'],
      ['События и награды', 'Приглашения, подарки и уведомления о внутриигровых событиях.'],
      ['История', 'Письма остаются в ящике, чтобы к ним можно было вернуться.']
    ]
  },
  search: {
    eyebrow: 'REBUNAR / ПОИСК',
    title: 'Поиск',
    description: 'Единый поиск по играм, сообществам, пользователям и творческим работам Rebunar.',
    status: 'ПОИСК БУДЕТ РАСШИРЕН',
    cards: [
      ['Игры и проекты', 'Поиск игр, жанров и разработчиков.'],
      ['Люди и сообщества', 'Поиск авторов, игроков и тематических сообществ.'],
      ['Творчество', 'Поиск манхвы, вебтунов, анимации и других публикаций.']
    ]
  },
  notifications: {
    eyebrow: 'REBUNAR / АКТИВНОСТЬ',
    title: 'Уведомления',
    description: 'Здесь будут собраны быстрые события, требующие внимания: реакции, ответы, упоминания, приглашения и новые сообщения.',
    status: 'ЦЕНТР УВЕДОМЛЕНИЙ — КАРКАС РАЗДЕЛА',
    cards: [
      ['Общение', 'Новые сообщения, ответы и упоминания.'],
      ['Сообщества', 'Приглашения и события в сообществах.'],
      ['Активность', 'Реакции и изменения, связанные с твоими проектами.']
    ]
  }
};

export function renderEcosystemScreen(outlet, key) {
  const section = sections[key];
  if (!section) return;
  if (key === 'store') {
    const customAppsKey = 'rebunar-home-custom-apps-v1';
    const apps = [
      { id: 'pinterest', name: 'Pinterest', category: 'Фото и дизайн', description: 'Идеи, изображения и вдохновение', url: 'https://www.pinterest.com/', icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="#E60023"/><path d="M32.8 10.5c-12.1 0-18.2 8.7-18.2 16 0 4.4 1.7 8.3 5.4 9.8.6.3 1.2 0 1.4-.7l.6-2.4c.2-.7.1-1-.4-1.6-1.1-1.3-1.8-3-1.8-5.4 0-7 5.2-13.2 13.6-13.2 7.4 0 11.5 4.5 11.5 10.5 0 7.9-3.5 14.6-8.8 14.6-2.9 0-5.1-2.4-4.4-5.4.8-3.6 2.4-7.5 2.4-10.1 0-2.3-1.2-4.2-3.7-4.2-2.9 0-5.2 3-5.2 7.1 0 2.6.9 4.4.9 4.4l-3.6 15.3c-1.1 4.5-.2 10.1-.1 10.7.1.4.6.5.9.2.4-.5 4.2-5.1 5.5-9.5.4-1.2 2.1-8.4 2.1-8.4 1 1.9 3.9 3.6 7 3.6 9.2 0 15.5-8.4 15.5-19.7 0-8.5-7.2-16.4-18.6-16.4z" fill="#fff"/></svg>' },
      { id: 'chatgpt', name: 'ChatGPT', category: 'Искусственный интеллект', description: 'Официальный ИИ-помощник OpenAI', url: 'https://chatgpt.com/', icon: '<span class="store-chatgpt-mark" aria-hidden="true"><svg viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#102923"/><path d="M32 13.5a11 11 0 0 1 10.7 8.5 10.8 10.8 0 0 1 8.1 13.8 10.8 10.8 0 0 1-5.1 13.4 11 11 0 0 1-19.1 2.2 10.8 10.8 0 0 1-13.2-8.8 10.8 10.8 0 0 1 3.1-14 11 11 0 0 1 15.5-13.1Z" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="m23 22 18 10-18 10m18-20L23 32l18 10" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' }
    ];
    const readInstalled = () => {
      try {
        const value = JSON.parse(localStorage.getItem(customAppsKey) || '[]');
        return Array.isArray(value) ? value : [];
      } catch { return []; }
    };
    const isInstalled = app => readInstalled().some(item => item.id === app.id);
    const saveApp = app => {
      const installed = readInstalled();
      if (!installed.some(item => item.id === app.id)) {
        installed.push({ id: app.id, name: app.name, icon: app.id === 'pinterest' ? 'P' : 'ChatGPT', color: app.id === 'pinterest' ? '#bd081c' : '#102923', url: app.url });
        try { localStorage.setItem(customAppsKey, JSON.stringify(installed)); }
        catch { return false; }
      }
      window.dispatchEvent(new CustomEvent('rebunar-home-app-added', { detail: app }));
      return true;
    };
    const openApp = app => {
      if (window.AndroidBrowser?.open) window.AndroidBrowser.open(app.url, app.name);
      else window.open(app.url, '_blank', 'noopener,noreferrer');
    };
    const renderStoreHome = (query = '', category = 'all') => {
      const installedCount = apps.length;
      outlet.innerHTML = `
        <section class="screen ecosystem-screen ecosystem-store-screen ecosystem-store-v2">
          <header class="store-topline"><div class="store-brand"><span class="store-brand-mark">R</span><span>Магазин <b>Rebunar</b></span></div><span class="store-topline-label">ПРИЛОЖЕНИЯ</span></header>
          <div class="store-search-wrap"><span class="store-search-symbol" aria-hidden="true">⌕</span><input class="store-search" type="search" placeholder="Поиск приложений" value="${query.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" aria-label="Поиск приложений"><span class="store-search-shortcut" aria-hidden="true">⌕</span></div>
          <section class="store-welcome"><span class="store-welcome-kicker">REBUNAR STORE</span><h1>Найди то, что<br>вдохновляет.</h1><p>Приложения и сервисы, собранные в одном месте.</p><div class="store-welcome-orbit store-welcome-orbit-one"></div><div class="store-welcome-orbit store-welcome-orbit-two"></div><span class="store-welcome-star">✦</span></section>
          <nav class="store-categories" aria-label="Категории магазина">
            <button type="button" class="store-category ${category === 'all' ? 'is-active' : ''}" data-store-category="all">Все</button>
            <button type="button" class="store-category ${category === 'ideas' ? 'is-active' : ''}" data-store-category="ideas">Идеи</button>
            <button type="button" class="store-category ${category === 'photo' ? 'is-active' : ''}" data-store-category="photo">Фото</button>
            <button type="button" class="store-category ${category === 'ai' ? 'is-active' : ''}" data-store-category="ai">ИИ</button>
          </nav>
          <div class="store-section-heading"><div><span class="store-section-kicker">В КАТАЛОГЕ</span><h2>Приложения</h2></div><span class="store-result-count" data-store-count>02 приложения</span></div>
          <div class="store-app-list" data-store-list></div>
          <p class="store-footnote">В каталоге представлены веб-приложения. Добавь ярлык на главный экран и открывай сервис внутри Rebunar.</p>
        </section>`;
      const search = outlet.querySelector('.store-search');
      const list = outlet.querySelector('[data-store-list]');
      const count = outlet.querySelector('[data-store-count]');
      const draw = () => {
        const q = search.value.trim().toLocaleLowerCase();
        const filtered = apps.filter(app => {
          const categoryMatch = category === 'all' || (category === 'ideas' && app.id === 'pinterest') || (category === 'photo' && app.id === 'pinterest') || (category === 'ai' && app.id === 'chatgpt');
          return categoryMatch && (!q || [app.name, app.category, app.description, app.id].some(value => value.toLocaleLowerCase().includes(q)));
        });
        list.innerHTML = filtered.map(app => `<button type="button" class="store-app-row" data-store-open="${app.id}"><span class="store-app-icon">${app.icon}</span><span class="store-app-copy"><strong>${app.name}</strong><small>${app.description}</small><em>${app.category}</em></span><span class="store-app-chevron" aria-hidden="true">›</span></button>`).join('');
        count.textContent = filtered.length + (filtered.length === 1 ? ' приложение' : ' приложения');
        if (!filtered.length) list.innerHTML = '<p class="store-footnote">Ничего не найдено.</p>';
        list.querySelectorAll('[data-store-open]').forEach(button => button.addEventListener('click', () => renderDetails(apps.find(app => app.id === button.dataset.storeOpen))));
      };
      search.addEventListener('input', draw);
      outlet.querySelectorAll('[data-store-category]').forEach(button => button.addEventListener('click', () => {
        category = button.dataset.storeCategory;
        outlet.querySelectorAll('[data-store-category]').forEach(item => item.classList.toggle('is-active', item === button));
        draw();
      }));
      draw();
    };
    const renderDetails = app => {
      if (!app) return;
      const chatgpt = app.id === 'chatgpt';
      const installed = isInstalled(app);
      const features = chatgpt
        ? ['Общаться с ИИ и задавать вопросы на естественном языке.', 'Помогать с текстами, идеями, учёбой и повседневными задачами.', 'Работать с поддерживаемыми файлами и изображениями на сайте ChatGPT.']
        : ['Находить идеи для творчества, интерьера, стиля и проектов.', 'Сохранять понравившиеся изображения и подборки.', 'Создавать собственные тематические коллекции.'];
      outlet.innerHTML = `
        <section class="screen ecosystem-screen ecosystem-store-screen ecosystem-store-v2 store-detail-screen">
          <button type="button" class="store-back" data-store-back><span aria-hidden="true">‹</span> Магазин</button>
          <div class="store-detail-head"><span class="store-detail-icon">${app.icon}</span><div class="store-detail-title"><span class="store-section-kicker">ПРИЛОЖЕНИЕ · ${app.category.toLocaleUpperCase()}</span><h1>${app.name}</h1><p>${app.description}</p></div></div>
          <div class="store-detail-actions"><button type="button" class="store-primary-action" data-store-launch>Открыть</button><button type="button" class="store-secondary-action" data-store-add ${installed ? 'disabled' : ''}>${installed ? 'Добавлено на главный экран' : 'Добавить на главный экран'}</button></div>
          <div class="store-preview-panel ${chatgpt ? 'store-chatgpt-preview' : ''}"><div class="store-preview-art store-preview-art-one"><span>${chatgpt ? 'ChatGPT' : 'Идеи'}</span><b>${chatgpt ? 'ОБЩАЙСЯ<br>С ИИ' : 'СОБИРАЙ<br>ВДОХНОВЕНИЕ'}</b></div><div class="store-preview-art store-preview-art-two"><span>${chatgpt ? 'Помощник' : 'Коллекции'}</span><b>${chatgpt ? 'ИДЕИ<br>И ОТВЕТЫ' : 'ТВОЙ<br>ВИЗУАЛЬНЫЙ<br>МИР'}</b></div><div class="store-preview-art store-preview-art-three"><span>${chatgpt ? 'OpenAI' : 'Открывай'}</span><b>${chatgpt ? 'ОДИН СЕРВИС<br>МНОГО ВОЗМОЖНОСТЕЙ' : 'НОВОЕ<br>КАЖДЫЙ ДЕНЬ'}</b></div></div>
          <section class="store-detail-section"><h2>О приложении</h2><p>${chatgpt ? 'ChatGPT — официальный ИИ-сервис OpenAI. Он помогает отвечать на вопросы, формулировать идеи, работать с текстами и решать самые разные задачи. В Rebunar открывается сайт chatgpt.com.' : 'Pinterest — сервис для поиска и сохранения визуальных идей. Находи изображения, подборки и вдохновение, а понравившееся собирай в собственные коллекции.'}</p></section>
          <section class="store-detail-section"><h2>Что можно делать</h2><ul class="store-feature-list">${features.map(feature => `<li><span>✦</span> ${feature}</li>`).join('')}</ul></section>
          <section class="store-detail-section store-info-section"><h2>Информация</h2><div><span>Тип</span><b>Веб-приложение</b></div><div><span>Разработчик</span><b>${chatgpt ? 'OpenAI' : 'Pinterest'}</b></div><div><span>Открытие</span><b>Официальный сайт ${app.name}</b></div></section>
          <p class="store-footnote">Rebunar добавляет ярлык на главный экран. Сам сервис работает на официальном сайте и может требовать входа в аккаунт.</p>
        </section>`;
      outlet.querySelector('[data-store-back]')?.addEventListener('click', () => renderStoreHome());
      outlet.querySelector('[data-store-launch]')?.addEventListener('click', () => openApp(app));
      outlet.querySelector('[data-store-add]')?.addEventListener('click', event => {
        if (!saveApp(app)) { event.currentTarget.textContent = 'Не удалось добавить'; return; }
        event.currentTarget.textContent = 'Добавлено на главный экран';
        event.currentTarget.disabled = true;
      });
    };
    renderStoreHome();
    return;
  }
  outlet.innerHTML = `
    <section class="screen ecosystem-screen ecosystem-screen--${key}">
      <header class="ecosystem-hero">
        <span class="ecosystem-eyebrow">${section.eyebrow}</span>
        <h1>${section.title}</h1>
        ${section.subtitle ? `<h2 class="ecosystem-subtitle">${section.subtitle}</h2>` : ''}
        <p>${section.description}</p>
        <span class="ecosystem-status">${section.status}</span>
      </header>
      ${key === 'search' ? '<button class="ecosystem-users-link" type="button" data-open-users><span>♙</span><span><strong>Все пользователи</strong><small>Найти участников и открыть их профили</small></span><span aria-hidden="true">›</span></button>' : ''}
      ${key === 'notifications' ? '<button class="ecosystem-users-link" type="button" data-open-mail><span>✉</span><span><strong>Почта Rebunar</strong><small>Письма платформы, новости и награды</small></span><span aria-hidden="true">›</span></button>' : ''}
      <div class="ecosystem-card-grid">
        ${section.cards.map(([title, description], index) => `
          <article class="ecosystem-card">
            <span class="ecosystem-card-index">0${index + 1}</span>
            <h2>${title}</h2>
            <p>${description}</p>
          </article>
        `).join('')}
      </div>
      <p class="ecosystem-footnote">Это структура будущего раздела. Функции будут подключаться постепенно — без кнопок, которые пока ничего не делают.</p>
    </section>
  `;
  outlet.querySelector('[data-open-users]')?.addEventListener('click', () => navigate('users'));
  outlet.querySelector('[data-open-mail]')?.addEventListener('click', () => navigate('mail'));
}
