/**
 * REBUNAR — PROFILE STATUS / ACHIEVEMENTS / XP
 */
export function enhanceProfileScreen(container, user) {
  const details=container.querySelector('.profile-details');
  if(!details||details.querySelector('.profile-status-card')) return;
  const status=user?.bio?.trim()?'Активен в Rebunar':'Новый участник Rebunar';
  const card=document.createElement('div');
  card.className='profile-status-card';
  card.innerHTML=`<div class="profile-feature-heading"><div><span class="profile-feature-kicker">Статус</span><strong>${escapeHTML(status)}</strong></div><span class="profile-status-dot" aria-hidden="true"></span></div><p>Твой профиль — часть твоего статуса в экосистеме Rebunar.</p>`;
  details.appendChild(card);

  const xp=document.createElement('section');
  xp.className='profile-xp-card';
  xp.innerHTML=`<div class="profile-feature-heading"><div><span class="profile-feature-kicker">Игровой профиль</span><strong>Уровень 1</strong></div><span class="profile-xp-value">0 / 100 XP</span></div><div class="profile-xp-track" role="progressbar" aria-label="Опыт до следующего уровня" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="profile-xp-fill"></span></div><p>Система опыта готовится. Начисление XP появится вместе с игровыми действиями.</p>`;
  details.appendChild(xp);

  const isFounder=Number(user?.id)===1;
  const achievements=document.createElement('section');
  achievements.className='profile-achievements-card';
  achievements.innerHTML=`
    <div class="profile-feature-heading"><div><span class="profile-feature-kicker">Достижения</span><strong>Твои знаки Rebunar</strong></div><span class="profile-achievements-count">${isFounder?'1':'0'}</span></div>
    <div class="profile-achievement-list">
      ${isFounder?'<button class="profile-achievement is-unlocked profile-achievement-button" type="button" data-achievement="founder"><span class="profile-achievement-icon">★</span><span class="profile-achievement-copy"><strong>Первый пользователь</strong><small>ID #1 · историческое достижение</small></span><span class="profile-achievement-open" aria-hidden="true">›</span></button>':'<div class="profile-achievement is-locked"><span class="profile-achievement-icon">◇</span><span><strong>Первый пользователь</strong><small>Историческое достижение · ID #1</small></span></div>'}
      <div class="profile-achievement is-locked"><span class="profile-achievement-icon">⬡</span><span><strong>Активный участник</strong><small>Будет открыто за активность</small></span></div>
      <div class="profile-achievement is-locked"><span class="profile-achievement-icon">◇</span><span><strong>Игровой профиль</strong><small>Будет открыто после запуска игровой системы</small></span></div>
    </div>
    <div class="profile-customization-hint"><span>Оформление профиля</span><p>Фоны, градиенты и аниме-арты для визитки появятся в будущих обновлениях.</p><span class="profile-coming-soon">СКОРО</span></div>`;
  details.appendChild(achievements);
  if(isFounder) achievements.querySelector('[data-achievement="founder"]')?.addEventListener('click',()=>openFounderAchievement(container));
}
function openFounderAchievement(container) {
  if(container.querySelector('.profile-achievement-overlay')) return;
  const overlay=document.createElement('div');
  overlay.className='profile-achievement-overlay';
  overlay.innerHTML=`<section class="profile-achievement-modal" role="dialog" aria-modal="true" aria-labelledby="founder-achievement-title"><button class="profile-achievement-close" type="button" aria-label="Закрыть">×</button><div class="profile-achievement-emblem" aria-hidden="true">★</div><span class="profile-feature-kicker">ИСТОРИЧЕСКОЕ ДОСТИЖЕНИЕ · ID #1</span><h2 id="founder-achievement-title">Первый пользователь</h2><p>Вы стояли у истоков экосистемы Rebunar. Ваш аккаунт стал первым шагом к созданию пространства для игроков, авторов и поклонников историй.</p><div class="profile-achievement-rarity">ОСНОВАТЕЛЬ СООБЩЕСТВА</div><button class="profile-achievement-share" type="button">Поделиться достижением</button></section>`;
  container.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector('.profile-achievement-close').addEventListener('click',close);
  overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
  overlay.querySelector('.profile-achievement-share').addEventListener('click',async event=>{
    const textToShare='Я получил достижение «Первый пользователь» в Rebunar — я стоял у истоков экосистемы!';
    try {
      if(navigator.share) await navigator.share({title:'Моё достижение Rebunar',text:textToShare,url:location.origin});
      else {await copyText(textToShare);showProfileToast(container,'Текст достижения скопирован');}
    } catch(error) {
      if(error?.name!=='AbortError') {
        try {await copyText(textToShare);showProfileToast(container,'Текст достижения скопирован');}
        catch {showProfileToast(container,'Не удалось поделиться достижением');}
      }
    }
    event.currentTarget.blur();
  });
}
async function copyText(value) {
  if(navigator.clipboard?.writeText&&window.isSecureContext) return navigator.clipboard.writeText(value);
  const field=document.createElement('textarea');field.value=value;field.setAttribute('readonly','');
  field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();
  const copied=document.execCommand('copy');field.remove();if(!copied)throw new Error('Clipboard copy failed');
}
function showProfileToast(container,message) {
  let toast=container.querySelector('.profile-toast');
  if(!toast){toast=document.createElement('div');toast.className='profile-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');container.appendChild(toast);}
  toast.textContent=message;toast.classList.add('is-visible');clearTimeout(toast._hideTimer);
  toast._hideTimer=setTimeout(()=>toast.classList.remove('is-visible'),2400);
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character]));
}