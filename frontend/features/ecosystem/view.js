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
    const pinterest = section.apps[0];
    const getInstalled = () => {
      try {
        const value = JSON.parse(localStorage.getItem(customAppsKey) || '[]');
        return Array.isArray(value) && value.some(app => app.id === pinterest.id);
      } catch { return false; }
    };
    const savePinterest = () => {
      let apps = [];
      try { apps = JSON.parse(localStorage.getItem(customAppsKey) || '[]'); } catch {}
      if (!Array.isArray(apps)) apps = [];
      if (!apps.some(app => app.id === pinterest.id)) {
        apps.push({ id: pinterest.id, name: pinterest.name, icon: pinterest.icon, color: pinterest.color, url: pinterest.url });
        try { localStorage.setItem(customAppsKey, JSON.stringify(apps)); }
        catch { return false; }
      }
      window.dispatchEvent(new CustomEvent('rebunar-home-app-added', { detail: pinterest }));
      return true;
    };
    const openPinterest = () => {
      if (window.AndroidBrowser?.open) window.AndroidBrowser.open(pinterest.url, pinterest.name);
      else window.open(pinterest.url, '_blank', 'noopener,noreferrer');
    };
    const icon = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="#E60023"/><path d="M32.8 10.5c-12.1 0-18.2 8.7-18.2 16 0 4.4 1.7 8.3 5.4 9.8.6.3 1.2 0 1.4-.7l.6-2.4c.2-.7.1-1-.4-1.6-1.1-1.3-1.8-3-1.8-5.4 0-7 5.2-13.2 13.6-13.2 7.4 0 11.5 4.5 11.5 10.5 0 7.9-3.5 14.6-8.8 14.6-2.9 0-5.1-2.4-4.4-5.4.8-3.6 2.4-7.5 2.4-10.1 0-2.3-1.2-4.2-3.7-4.2-2.9 0-5.2 3-5.2 7.1 0 2.6.9 4.4.9 4.4l-3.6 15.3c-1.1 4.5-.2 10.1-.1 10.7.1.4.6.5.9.2.4-.5 4.2-5.1 5.5-9.5.4-1.2 2.1-8.4 2.1-8.4 1 1.9 3.9 3.6 7 3.6 9.2 0 15.5-8.4 15.5-19.7 0-8.5-7.2-16.4-18.6-16.4z" fill="#fff"/></svg>';
    const renderStoreHome = (query = '') => {
      const installed = getInstalled();
      outlet.innerHTML = `
        <section class="screen ecosystem-screen ecosystem-store-screen ecosystem-store-v2">
          <header class="store-topline">
            <div class="store-brand"><span class="store-brand-mark">R</span><span>Магазин <b>Rebunar</b></span></div>
            <span class="store-topline-label">ПРИЛОЖЕНИЯ</span>
          </header>
          <div class="store-search-wrap">
            <span class="store-search-symbol" aria-hidden="true">⌕</span>
            <input class="store-search" type="search" placeholder="Поиск приложений" value="${query.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" aria-label="Поиск приложений">
            <span class="store-search-shortcut" aria-hidden="true">⌕</span>
          </div>
          <section class="store-welcome">
            <span class="store-welcome-kicker">REBUNAR STORE</span>
            <h1>Найди то, что<br>вдохновляет.</h1>
            <p>Приложения и сервисы, собранные в одном месте.</p>
            <div class="store-welcome-orbit store-welcome-orbit-one"></div>
            <div class="store-welcome-orbit store-welcome-orbit-two"></div>
            <span class="store-welcome-star">✦</span>
          </section>
          <nav class="store-categories" aria-label="Категории магазина">
            <button type="button" class="store-category is-active" data-store-category="all">Все</button>
            <button type="button" class="store-category" data-store-category="ideas">Идеи</button>
            <button type="button" class="store-category" data-store-category="photo">Фото</button>
            <button type="button" class="store-category" data-store-category="design">Дизайн</button>
          </nav>
          <div class="store-section-heading">
            <div><span class="store-section-kicker">В КАТАЛОГЕ</span><h2>Приложения</h2></div>
            <span class="store-result-count" data-store-count>01 приложение</span>
          </div>
          <div class="store-app-list" data-store-list>
            <button type="button" class="store-app-row" data-store-open="pinterest">
              <span class="store-app-icon">${icon}</span>
              <span class="store-app-copy"><strong>Pinterest</strong><small>Идеи, изображения и вдохновение</small><em>Фото и дизайн</em></span>
              <span class="store-app-chevron" aria-hidden="true">›</span>
            </button>
          </div>
          <p class="store-footnote">Пока в каталоге доступен Pinterest. Новые приложения будут появляться здесь постепенно.</p>
        </section>
      `;
      const search = outlet.querySelector('.store-search');
      const list = outlet.querySelector('[data-store-list]');
      const count = outlet.querySelector('[data-store-count]');
      const filter = () => {
        const value = search.value.trim().toLocaleLowerCase();
        const matches = !value || ['pinterest', 'идеи', 'изображения', 'вдохновение', 'фото', 'дизайн'].some(word => word.includes(value) || value.includes(word));
        list.hidden = !matches;
        count.textContent = matches ? '01 приложение' : 'Ничего не найдено';
      };
      search.addEventListener('input', filter);
      outlet.querySelectorAll('[data-store-category]').forEach(button => button.addEventListener('click', () => {
        outlet.querySelectorAll('[data-store-category]').forEach(item => item.classList.toggle('is-active', item === button));
        search.value = button.dataset.storeCategory === 'all' ? '' : button.textContent;
        filter();
      }));
      outlet.querySelector('[data-store-open="pinterest"]')?.addEventListener('click', renderPinterestDetails);
    };
    const renderPinterestDetails = () => {
      const installed = getInstalled();
      outlet.innerHTML = `
        <section class="screen ecosystem-screen ecosystem-store-screen ecosystem-store-v2 store-detail-screen">
          <button type="button" class="store-back" data-store-back><span aria-hidden="true">‹</span> Магазин</button>
          <div class="store-detail-head">
            <span class="store-detail-icon">${icon}</span>
            <div class="store-detail-title"><span class="store-section-kicker">ПРИЛОЖЕНИЕ · ФОТО И ДИЗАЙН</span><h1>Pinterest</h1><p>Идеи и вдохновение</p></div>
          </div>
          <div class="store-detail-actions">
            <button type="button" class="store-primary-action" data-store-launch>Открыть</button>
            <button type="button" class="store-secondary-action" data-store-add ${installed ? 'disabled' : ''}>${installed ? 'Добавлено на главный экран' : 'Добавить на главный экран'}</button>
          </div>
          <div class="store-preview-panel">
            <div class="store-preview-art store-preview-art-one"><span>Идеи</span><b>СОБИРАЙ<br>ВДОХНОВЕНИЕ</b></div>
            <div class="store-preview-art store-preview-art-two"><span>Коллекции</span><b>ТВОЙ<br>ВИЗУАЛЬНЫЙ<br>МИР</b></div>
            <div class="store-preview-art store-preview-art-three"><span>Открывай</span><b>НОВОЕ<br>КАЖДЫЙ ДЕНЬ</b></div>
          </div>
          <section class="store-detail-section">
            <h2>О приложении</h2>
            <p>Pinterest — сервис для поиска и сохранения визуальных идей. Находи изображения, подборки и вдохновение, а понравившееся собирай в собственные коллекции.</p>
          </section>
          <section class="store-detail-section">
            <h2>Что можно делать</h2>
            <ul class="store-feature-list">
              <li><span>✦</span> Находить идеи для творчества, интерьера, стиля и проектов.</li>
              <li><span>▧</span> Сохранять понравившиеся изображения и подборки.</li>
              <li><span>◎</span> Создавать собственные тематические коллекции.</li>
            </ul>
          </section>
          <section class="store-detail-section store-info-section">
            <h2>Информация</h2>
            <div><span>Тип</span><b>Веб-приложение</b></div>
            <div><span>Разработчик</span><b>Pinterest</b></div>
            <div><span>Открытие</span><b>Официальный сайт Pinterest</b></div>
          </section>
          <p class="store-footnote">Rebunar добавляет ярлык на главный экран. Для работы Pinterest открывается его официальный сервис.</p>
        </section>
      `;
      outlet.querySelector('[data-store-back]')?.addEventListener('click', () => renderStoreHome());
      outlet.querySelector('[data-store-launch]')?.addEventListener('click', openPinterest);
      outlet.querySelector('[data-store-add]')?.addEventListener('click', event => {
        if (!savePinterest()) { event.currentTarget.textContent = 'Недостаточно памяти'; return; }
        event.currentTarget.textContent = 'Добавлено на главный экран';
        event.currentTarget.disabled = true;
      });
    };
    renderStoreHome();
    return;
  }
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
              <div class="ecosystem-app-icon" style="--ecosystem-app-color:${app.color}"><svg viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-label="Pinterest" style="display:block"><circle cx="32" cy="32" r="32" fill="#E60023"/><text x="32" y="47" text-anchor="middle" font-family="Georgia,serif" font-size="49" font-weight="bold" fill="#fff">P</text></svg></div>
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
      window.dispatchEvent(new CustomEvent('rebunar-home-app-added', { detail: app }));
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
