/**
 * REBUNAR — HOME SCREEN
 * Главная страница приложения.
 */

export function renderHomeScreen(outlet) {
  outlet.innerHTML = `
    <section class="screen home-screen">
      <div class="home-intro">
        <span class="home-eyebrow">REBUNAR / COMMUNITY</span>
        <h1>Добро пожаловать в Rebunar</h1>
        <p>Игры, сообщества и люди — в одном пространстве.</p>
      </div>
    </section>
  `;
}
