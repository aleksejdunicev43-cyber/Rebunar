/**
 * REBUNAR — APPLICATION SHELL
 * Общая оболочка интерфейса.
 */

const chatIcon = `
  <svg class="nav-icon" viewBox="0 0 24 24"
       width="23" height="23" fill="none"
       stroke="currentColor" stroke-width="1.9"
       stroke-linecap="round" stroke-linejoin="round"
       aria-hidden="true">
    <path d="M20 11.5a8.4 8.4 0 0 1-.9 3.8
      8.5 8.5 0 0 1-7.6 4.7
      8.4 8.4 0 0 1-3.8-.9L3 21l1.9-4.7
      A8.4 8.4 0 0 1 4 12.5
      8.5 8.5 0 0 1 8.7 4.9
      8.4 8.4 0 0 1 12.5 4h.5
      a8.5 8.5 0 0 1 7 7.5z"/>
  </svg>
`;

function settingsButton() {
  return `
    <button type="button" class="nav-settings" data-route="settings">
      <svg class="nav-settings-icon" viewBox="0 0 24 24"
           width="19" height="19" fill="none"
           stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round"
           aria-hidden="true">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.56-1.03H6v-2.4h.84A1.7 1.7 0 0 0 8.4 10a1.7 1.7 0 0 0-.34-1.88L8 8.06l1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12.67 5.2V5h2.4v.2a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.56 1.03h.2v2.4h-.2A1.7 1.7 0 0 0 19.4 15z"/>
      </svg>
      <span>Настройки</span>
    </button>
  `;
}

function chatButton() {
  return `
    <button type="button" class="nav-chat" data-route="messages">
      ${chatIcon}
      <span>Чаты</span>
    </button>
  `;
}

export function createShell(root) {
  root.innerHTML = `
    <div class="app-shell">

      <header class="app-header">
        <a class="app-logo" href="#home">REBUNAR</a>

        <div class="header-actions">
          <button type="button" data-route="search">Поиск</button>
          <button type="button" data-route="notifications">Уведомления</button>
          <button type="button" data-route="composer">Создать</button>
        </div>
      </header>

      <div class="app-layout">

        <aside class="sidebar">
          <nav class="main-navigation">
            <button type="button" data-route="home">Главная</button>
            <button type="button" data-route="games">Игры</button>
            <button type="button" data-route="communities">Сообщества</button>
            ${chatButton()}
            ${settingsButton()}
          </nav>
        </aside>

        <main class="main-content">
          <div id="screen-outlet"></div>
        </main>

        <aside class="context-panel" id="context-panel"></aside>

      </div>

      <nav class="mobile-navigation">
        <button type="button" data-route="home">Главная</button>
        <button type="button" data-route="games">Игры</button>
        <button type="button" data-route="communities">Сообщества</button>
        ${chatButton()}
        ${settingsButton()}
      </nav>

    </div>
  `;

  return {
    outlet: root.querySelector('#screen-outlet'),
    contextPanel: root.querySelector('#context-panel')
  };
}
