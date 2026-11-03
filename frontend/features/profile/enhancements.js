/**
 * REBUNAR — PROFILE STATUS / XP / ACHIEVEMENTS / CUSTOMIZATION
 */
import { getTheme, applyTheme as applyAppTheme } from '../../shared/theme.js';
export function enhanceProfileScreen(container, user) {
  const details = container.querySelector('.profile-details');
  const profileCard = container.querySelector('.profile-card');
  if (!details || !profileCard || details.querySelector('.profile-status-card')) return;

  const themes = {
    steel: { name: 'Steel & Blood', description: 'Стальной игровой стиль с алым свечением' },
    cyber: { name: 'Cyberpunk', description: 'Неон, цифровая сетка и ночной город' },
    sakura: { name: 'Anime: Sakura', description: 'Аниме-эстетика, розовый свет и сакура' },
    fantasy: { name: 'Dark Fantasy', description: 'Тёмное фэнтези, руны и мистическое золото' }
  };
  let selectedTheme = getTheme(user?.id ?? 'guest');

  const screen = container.querySelector('.profile-screen');
  if (screen) screen.dataset.profileTheme = selectedTheme;

  const cover = document.createElement('div');
  cover.className = 'profile-cover';
  cover.dataset.theme = selectedTheme;
  cover.innerHTML = '<span class="profile-cover-mark">REBUNAR</span><span class="profile-cover-caption">ТВОЯ ИСТОРИЯ. ТВОЙ МИР.</span>';
  profileCard.insertBefore(cover, profileCard.firstChild);

  const applyTheme = theme => {
    if (!themes[theme]) return;
    selectedTheme = theme;
    cover.dataset.theme = theme;
    if (screen) screen.dataset.profileTheme = theme;
    applyAppTheme(theme, user?.id ?? 'guest');
    const card = container.querySelector('.profile-customization-card');
    card?.querySelectorAll('[data-profile-theme]').forEach(button => {
      const active = button.dataset.profileTheme === theme;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  const status = user?.bio?.trim() ? 'Активен в Rebunar' : 'Новый участник Rebunar';
  const statusCard = document.createElement('div');
  statusCard.className = 'profile-status-card';
  statusCard.innerHTML = `<div class="profile-feature-heading"><div><span class="profile-feature-kicker">Статус</span><strong>${escapeHTML(status)}</strong></div><span class="profile-status-dot" aria-hidden="true"></span></div><p>Твой профиль — часть твоего статуса в экосистеме Rebunar.</p>`;
  details.appendChild(statusCard);

  const xp = document.createElement('section');
  xp.className = 'profile-xp-card';
  xp.innerHTML = '<div class="profile-feature-heading"><div><span class="profile-feature-kicker">Игровой профиль</span><strong>Уровень 1</strong></div><span class="profile-xp-value">0 / 100 XP</span></div><div class="profile-xp-track" role="progressbar" aria-label="Опыт до следующего уровня" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="profile-xp-fill"></span></div><p>Система опыта готовится. Начисление XP появится вместе с игровыми действиями.</p>';
  details.appendChild(xp);

  const isFounder = Number(user?.id) === 1;
  const achievements = document.createElement('section');
  achievements.className = 'profile-achievements-card';
  achievements.innerHTML = `
    <div class="profile-feature-heading"><div><span class="profile-feature-kicker">Достижения</span><strong>Твои знаки Rebunar</strong></div><span class="profile-achievements-count">${isFounder ? '1' : '0'}</span></div>
    <div class="profile-achievement-list">
      ${isFounder ? '<button class="profile-achievement is-unlocked profile-achievement-button" type="button" data-achievement="founder"><span class="profile-achievement-icon">★</span><span class="profile-achievement-copy"><strong>Первый пользователь</strong><small>ID #1 · историческое достижение</small></span><span class="profile-achievement-open" aria-hidden="true">›</span></button>' : '<div class="profile-achievement is-locked"><span class="profile-achievement-icon">◇</span><span><strong>Первый пользователь</strong><small>Историческое достижение · ID #1</small></span></div>'}
      <div class="profile-achievement is-locked"><span class="profile-achievement-icon">⬡</span><span><strong>Активный участник</strong><small>Будет открыто за активность</small></span></div>
      <div class="profile-achievement is-locked"><span class="profile-achievement-icon">◇</span><span><strong>Игровой профиль</strong><small>После запуска игровой системы</small></span></div>
    </div>`;
  details.appendChild(achievements);
  if (isFounder) achievements.querySelector('[data-achievement="founder"]')?.addEventListener('click', () => openFounderAchievement(container));

  const customization = document.createElement('section');
  customization.className = 'profile-customization-card';
  customization.innerHTML = `
    <div class="profile-feature-heading"><div><span class="profile-feature-kicker">Персонализация</span><strong>Оформление профиля</strong></div><span class="profile-customization-symbol">✦</span></div>
    <p class="profile-customization-description">Одна тема для всего Rebunar: фон, панели, кнопки, навигация и акценты меняются одновременно.</p>
    <div class="profile-theme-options" aria-label="Темы оформления">
      ${Object.entries(themes).map(([key, theme]) => `<button type="button" class="profile-theme-option${key === selectedTheme ? ' is-selected' : ''}" data-profile-theme="${key}" aria-pressed="${key === selectedTheme}" title="${theme.description}"><span class="profile-theme-swatch theme-${key}"></span><span>${theme.name}</span>${key === selectedTheme ? '<span class="profile-theme-check">✓</span>' : ''}</button>`).join('')}
    </div>
    <div class="profile-locked-customization" aria-label="Будущие возможности персонализации"><button class="profile-locked-option" type="button" disabled aria-disabled="true"><span aria-hidden="true">🔒</span> Загрузить свой арт</button><button class="profile-locked-option" type="button" disabled aria-disabled="true"><span aria-hidden="true">🔒</span> Авторская аниме-обложка</button></div>`;
  details.appendChild(customization);
  customization.querySelectorAll('[data-profile-theme]').forEach(button => {
    button.addEventListener('click', () => {
      applyTheme(button.dataset.profileTheme);
      customization.querySelectorAll('[data-profile-theme]').forEach(item => {
        const active = item.dataset.profileTheme === selectedTheme;
        item.classList.toggle('is-selected', active);
        item.setAttribute('aria-pressed', String(active));
        const check = item.querySelector('.profile-theme-check');
        if (active && !check) item.insertAdjacentHTML('beforeend', '<span class="profile-theme-check">✓</span>');
        if (!active) check?.remove();
      });
    });
  });
}

function openFounderAchievement(container) {
  if (container.querySelector('.profile-achievement-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'profile-achievement-overlay';
  overlay.innerHTML = '<section class="profile-achievement-modal" role="dialog" aria-modal="true" aria-labelledby="founder-achievement-title"><button class="profile-achievement-close" type="button" aria-label="Закрыть">×</button><div class="profile-achievement-emblem" aria-hidden="true">★</div><span class="profile-feature-kicker">ИСТОРИЧЕСКОЕ ДОСТИЖЕНИЕ · ID #1</span><h2 id="founder-achievement-title">Первый пользователь</h2><p>Вы стояли у истоков экосистемы Rebunar. Ваш аккаунт стал первым шагом к созданию пространства для игроков, авторов и поклонников историй.</p><div class="profile-achievement-rarity">ОСНОВАТЕЛЬ СООБЩЕСТВА</div><button class="profile-achievement-share" type="button">Поделиться достижением</button></section>';
  container.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.profile-achievement-close').addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  overlay.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  overlay.querySelector('.profile-achievement-share').addEventListener('click', async event => {
    const textToShare = 'Я получил достижение «Первый пользователь» в Rebunar — я стоял у истоков экосистемы!';
    try {
      if (navigator.share) await navigator.share({ title: 'Моё достижение Rebunar', text: textToShare, url: location.origin });
      else { await copyText(textToShare); showProfileToast(container, 'Текст достижения скопирован'); }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        try { await copyText(textToShare); showProfileToast(container, 'Текст достижения скопирован'); }
        catch { showProfileToast(container, 'Не удалось поделиться достижением'); }
      }
    }
    event.currentTarget.blur();
  });
}
async function copyText(value) {
  if (navigator.clipboard?.writeText && window.isSecureContext) return navigator.clipboard.writeText(value);
  const field = document.createElement('textarea'); field.value = value; field.setAttribute('readonly', '');
  field.style.position = 'fixed'; field.style.opacity = '0'; document.body.appendChild(field); field.select();
  const copied = document.execCommand('copy'); field.remove(); if (!copied) throw new Error('Clipboard copy failed');
}
function showProfileToast(container, message) {
  let toast = container.querySelector('.profile-toast');
  if (!toast) { toast = document.createElement('div'); toast.className = 'profile-toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); container.appendChild(toast); }
  toast.textContent = message; toast.classList.add('is-visible'); clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}
