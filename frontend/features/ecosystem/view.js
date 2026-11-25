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
    let installed = [];
    try { installed = JSON.parse(localStorage.getItem(customAppsKey) || '[]'); } catch {}
    const installedIds = new Set(Array.isArray(installed) ? installed.map(app => app.id) : []);
    outlet.innerHTML = `
      <section class="screen ecosystem-screen ecosystem-store-screen">
        <header class="ecosystem-hero">
          <span class="ecosystem-eyebrow">${section.eyebrow}</span>
          <h1>${section.title}</h1>
          <p>${section.description}</p>
          <span class="ecosystem-status">ВЕБ-ПРИЛОЖЕНИЯ · ЯРЛЫКИ НА ГЛАВНОМ ЭКРАНЕ</span>
        </header>
        <div class="ecosystem-store-toolbar">
          <div><strong>Каталог приложений</strong><small>Первое приложение для тестирования</small></div>
          <span class="ecosystem-store-count">01</span>
        </div>
        <div class="ecosystem-app-grid">
          ${section.apps.map(app => `
            <article class="ecosystem-app-card">
              <div class="ecosystem-app-icon" style="--ecosystem-app-color:${app.color}"><img src="https://www.pinterest.com/favicon.ico" alt="Pinterest" width="48" height="48"></div>
              <div class="ecosystem-app-info">
                <span class="ecosystem-app-category">${app.category}</span>
                <h2>${app.name}</h2>
                <p>${app.description}</p>
              </div>
              <button class="ecosystem-app-add" type="button" data-add-app="${app.id}" ${installedIds.has(app.id) ? 'disabled' : ''}>${installedIds.has(app.id) ? 'Добавлено' : 'Добавить на главный экран'}</button>
              <a class="ecosystem-app-preview" href="${app.url}" target="_blank" rel="noopener noreferrer">Открыть сайт ↗</a>
            </article>
          `).join('')}
        </div>
        <p class="ecosystem-store-note">Приложения открываются на своих официальных сайтах. Rebunar сохраняет только ярлык, а не устанавливает APK и не скачивает файлы.</p>
      </section>
    `;
    outlet.querySelectorAll('[data-open-app]').forEach(button => button.addEventListener('click', () => {
      const app = section.apps.find(item => item.id === button.dataset.openApp);
      if (!app) return;
      if (window.AndroidBrowser?.open) window.AndroidBrowser.open(app.url, app.name);
      else window.open(app.url, '_blank', 'noopener,noreferrer');
    }));
    outlet.querySelectorAll('[data-add-app]').forEach(button => button.addEventListener('click', () => {
      const app = section.apps.find(item => item.id === button.dataset.addApp);
      if (!app) return;
      let apps = [];
      try { apps = JSON.parse(localStorage.getItem(customAppsKey) || '[]'); } catch {}
      if (!Array.isArray(apps)) apps = [];
      if (!apps.some(item => item.id === app.id)) {
        apps.push({ id: app.id, name: app.name, icon: app.icon, color: app.color, url: app.url });
        try { localStorage.setItem(customAppsKey, JSON.stringify(apps)); }
        catch { button.textContent = 'Недостаточно памяти'; return; }
      }
      button.textContent = 'Добавлено';
      button.disabled = true;
    }));
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
