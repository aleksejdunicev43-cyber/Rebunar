/**
 * REBUNAR — APPLICATION SHELL
 * Общая оболочка интерфейса.
 */

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
            <button type="button" data-route="messages">Сообщения</button>

          <button type="button" data-route="settings">Настройки</button>
          </nav>
        </aside>

        <main class="main-content">
          <div id="screen-outlet"></div>
        </main>

        <aside class="context-panel" id="context-panel">
        </aside>

      </div>

      <nav class="mobile-navigation">
        <button type="button" data-route="home">Главная</button>
        <button type="button" data-route="games">Игры</button>
        <button type="button" data-route="communities">Сообщества</button>
        <button type="button" data-route="messages">Сообщения</button>

          <button type="button" data-route="settings">Настройки</button>
      </nav>

    </div>
  `;

  return {
    outlet: root.querySelector('#screen-outlet'),
    contextPanel: root.querySelector('#context-panel')
  };
}
