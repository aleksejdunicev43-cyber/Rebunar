/**
 * REBUNAR — GAMES SCREEN
 * Первая версия игровой витрины и будущей игровой экономики.
 */

export function renderGamesScreen(outlet) {
  outlet.innerHTML = `
    <section class="screen games-screen">
      <div class="games-hero">
        <span class="games-eyebrow">REBUNAR / GAMES</span>
        <h1>Игры</h1>
        <p>Небольшие игры, квесты, достижения и лидерские таблицы — основа будущей игровой экосистемы Rebunar.</p>
      </div>

      <div class="games-grid">
        <article class="game-card game-card-featured">
          <div class="game-card-art">⚔</div>
          <div class="game-card-body">
            <span class="game-card-kicker">СКОРО</span>
            <h2>Rebunar: Первый квест</h2>
            <p>Текстовая RPG с выбором действий, развитием персонажа и таблицей лидеров.</p>
            <button type="button" class="game-primary-button" disabled>Скоро доступно</button>
          </div>
        </article>

        <article class="game-card">
          <div class="game-card-art">◆</div>
          <div class="game-card-body">
            <span class="game-card-kicker">СИСТЕМА</span>
            <h2>Достижения</h2>
            <p>Играй, выполняй задания и открывай знаки, которые отображаются в профиле.</p>
            <span class="game-status-label">Готовим систему</span>
          </div>
        </article>

        <article class="game-card">
          <div class="game-card-art">◈</div>
          <div class="game-card-body">
            <span class="game-card-kicker">БУДУЩЕЕ</span>
            <h2>Косметика</h2>
            <p>Рамки, значки, фоны и другие визуальные предметы без преимущества в силе.</p>
            <span class="game-status-label">Без Pay-to-Win</span>
          </div>
        </article>
      </div>

      <section class="games-economy-card">
        <div>
          <span class="games-card-kicker">БУДУЩАЯ ЭКОНОМИКА</span>
          <h2>Играй бесплатно. Украшай профиль по желанию.</h2>
          <p>Игровая валюта и цифровые предметы появятся только после готовности базовой игры и аудитории. Бесплатный прогресс останется полноценным.</p>
        </div>
        <div class="games-economy-roadmap">
          <span>Игра</span><b>→</b><span>Достижения</span><b>→</b><span>Косметика</span><b>→</b><span>Магазин</span>
        </div>
      </section>

      <section class="games-leaderboard-preview">
        <div>
          <span class="games-card-kicker">ЛИДЕРЫ</span>
          <h2>Таблица лидеров</h2>
        </div>
        <div class="leaderboard-empty">
          <span class="leaderboard-rank">—</span>
          <div>
            <strong>Первые результаты появятся после запуска игры</strong>
            <small>Место в рейтинге будет связано с игровым профилем пользователя.</small>
          </div>
        </div>
      </section>
    </section>
  `;
}
