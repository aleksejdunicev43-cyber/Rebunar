
(function () {
  const previousScreen = window.showScreen;

  function renderRebunarHome() {
    const main = document.querySelector('main');
    if (!main) return;

    main.innerHTML = `
      <div class="rb-home">
        <section class="rb-hero">
          <div class="rb-brand">◈ Rebunar</div>
          <p class="rb-subtitle">Твой мир в интернете</p>
          <h2>Найди что угодно</h2>
          <form class="rb-search" action="https://yandex.ru/search/" method="get">
            <input type="search" name="text" placeholder="Поиск в Яндексе..." required>
            <button type="submit">Найти</button>
          </form>
        </section>

        <section>
          <h2>Открой свой мир</h2>
          <div class="rb-grid">
            <button class="rb-tile" type="button" data-section="Аниме">
              <span>🌙</span><b>Аниме и манга</b>
            </button>
            <button class="rb-tile" type="button" data-section="Игры">
              <span>🎮</span><b>Игры</b>
            </button>
            <button class="rb-tile" type="button" data-section="Сообщества">
              <span>👥</span><b>Сообщества</b>
            </button>
            <button class="rb-tile" type="button" data-section="Сообщества">
              <span>✨</span><b>Найти единомышленников</b>
            </button>
          </div>
        </section>

        <section>
          <h2>Поиск по Rebunar</h2>
          <input id="webSearch" class="rb-local-search"
            placeholder="Найти публикации и сообщества...">
          <p id="searchStatus"></p>
        </section>

        <section>
          <h2>Сообщества</h2>
          <div id="communityList"><p>Загружаю сообщества...</p></div>
        </section>

        <section>
          <h2>Лента</h2>
          <div id="feedPosts"><p>Загружаю публикации...</p></div>
        </section>
      </div>`;

    main.querySelectorAll('[data-section]').forEach(button => {
      button.addEventListener('click', () => {
        const section = button.dataset.section;
        if (section === 'Аниме') {
          previousScreen('Сообщества');
        } else {
          previousScreen(section);
        }
      });
    });

    const search = document.getElementById('webSearch');
    search.addEventListener('input', function () {
      const query = this.value.toLowerCase();
      document.querySelectorAll(
        '#feedPosts .feed-item, #communityList .feed-item'
      ).forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(query)
          ? '' : 'none';
      });
    });

    if (typeof window.loadHomeCommunities === 'function') {
      window.loadHomeCommunities();
    }
    if (typeof window.renderRebunarPosts === 'function') {
      window.renderRebunarPosts();
    }
  }

  window.showScreen = function (name) {
    if (String(name).includes('Главная')) {
      renderRebunarHome();
    } else {
      previousScreen(name);
    }
  };

  renderRebunarHome();
})();
