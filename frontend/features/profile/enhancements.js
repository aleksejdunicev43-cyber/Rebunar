/**
 * REBUNAR — PROFILE STATUS / ACHIEVEMENTS
 * Визуальный слой будущей системы достижений.
 */

export function enhanceProfileScreen(container, user) {
  const details = container.querySelector('.profile-details');
  if (!details || details.querySelector('.profile-status-card')) return;

  const status = user?.bio?.trim()
    ? 'Активен в Rebunar'
    : 'Новый участник Rebunar';

  const card = document.createElement('div');
  card.className = 'profile-status-card';
  card.innerHTML = `
    <div class="profile-feature-heading">
      <div>
        <span class="profile-feature-kicker">Статус</span>
        <strong>${escapeHTML(status)}</strong>
      </div>
      <span class="profile-status-dot" aria-hidden="true"></span>
    </div>
    <p>Твой профиль — часть твоего статуса в экосистеме Rebunar.</p>
  `;
  details.appendChild(card);

  const achievements = document.createElement('div');
  achievements.className = 'profile-achievements-card';
  achievements.innerHTML = `
    <div class="profile-feature-heading">
      <div>
        <span class="profile-feature-kicker">Достижения</span>
        <strong>Твои знаки Rebunar</strong>
      </div>
      <span class="profile-achievements-count">1</span>
    </div>

    <div class="profile-achievement-list">
      <div class="profile-achievement is-unlocked">
        <span class="profile-achievement-icon">★</span>
        <div>
          <strong>Первый пользователь</strong>
          <small>ID #1 · историческое достижение</small>
        </div>
      </div>
      <div class="profile-achievement is-locked">
        <span class="profile-achievement-icon">◇</span>
        <div>
          <strong>Активный участник</strong>
          <small>Будет открыто за активность</small>
        </div>
      </div>
      <div class="profile-achievement is-locked">
        <span class="profile-achievement-icon">⬡</span>
        <div>
          <strong>Игровой профиль</strong>
          <small>Будет открыто после настройки профиля</small>
        </div>
      </div>
    </div>

    <div class="profile-customization-hint">
      Рамки аватара, значки и оформление профиля появятся здесь позже.
    </div>
  `;
  details.appendChild(achievements);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>\"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '\"': '&quot;',
    "'": '&#039;'
  })[character]);
}
