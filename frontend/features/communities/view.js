import { avatarMarkup } from '../../shared/avatar.js?v=avatar-system-20261104-1';
/**
 * REBUNAR — COMMUNITIES & CREATOR FEED
 * Реальная лента использует существующие /api/communities и /api/posts.
 */

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

const formatDate = value => {
  if (!value) return '';
  const date = new Date(value.includes?.('Z') ? value : value.replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
};

async function requestJSON(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос');
  return data;
}

export async function renderCommunitiesScreen(outlet) {
  outlet.innerHTML = `
    <section class="screen communities-screen">
      <header class="communities-hero">
        <span class="communities-eyebrow">REBUNAR / CREATORS</span>
        <h1>Сообщества</h1>
        <p>Работы авторов, идеи, новеллы и игровые проекты — в одном месте.</p>
      </header>
      <div class="communities-toolbar">
        <div class="communities-tabs" role="tablist" aria-label="Лента">
          <button class="community-tab is-active" data-feed="all">Все публикации</button>
          <button class="community-tab" data-feed="groups">Сообщества</button>
        </div>
        <button class="community-create-button" id="community-compose">＋ Опубликовать</button>
      </div>
      <div class="communities-compose" id="community-compose-panel" hidden>
        <label for="community-post-title">Заголовок</label>
        <input id="community-post-title" maxlength="200" placeholder="Название работы или публикации">
        <label for="community-post-text">Текст</label>
        <textarea id="community-post-text" maxlength="10000" rows="4" placeholder="Расскажи о своей работе, новелле или проекте..."></textarea>
        <label for="community-post-group">Опубликовать в</label>
        <select id="community-post-group"><option value="">Общая лента</option></select>
        <div class="community-compose-actions">
          <span id="community-post-status" role="status"></span>
          <button id="community-publish">Опубликовать</button>
        </div>
      </div>
      <div class="communities-content" id="communities-content">
        <div class="community-loading">Загружаем публикации Rebunar…</div>
      </div>
    </section>
  `;

  const content = outlet.querySelector('#communities-content');
  const compose = outlet.querySelector('#community-compose-panel');
  const groupSelect = outlet.querySelector('#community-post-group');
  let communities = [];
  let postsCache = [];
  let activeFeed = 'all';

  const load = async () => {
    content.innerHTML = '<div class="community-loading">Обновляем ленту…</div>';
    try {
      const [posts, groups] = await Promise.all([
        requestJSON('/api/posts'),
        requestJSON('/api/communities')
      ]);
      postsCache = posts;
      communities = groups;
      groupSelect.innerHTML = '<option value="">Общая лента</option>' +
        groups.map(group => `<option value="${Number(group.id)}">${escapeHTML(group.name)}</option>`).join('');
      renderFeed(posts);
    } catch (error) {
      content.innerHTML = `<div class="community-empty"><strong>Не удалось загрузить ленту</strong><p>${escapeHTML(error.message)}</p><button id="community-retry">Повторить</button></div>`;
      content.querySelector('#community-retry')?.addEventListener('click', load);
    }
  };

  function renderFeed(posts) {
    if (activeFeed === 'groups') {
      content.innerHTML = '<div class="community-group-grid">' + communities.map(group => `
        <article class="community-group-card">
          <span class="community-group-mark">◈</span>
          <h2>${escapeHTML(group.name)}</h2>
          <p>${escapeHTML(group.description || 'Сообщество Rebunar')}</p>
          <button data-open-group="${escapeHTML(group.slug)}">Открыть ленту</button>
        </article>
      `).join('') + '</div>';
      return;
    }

    if (!posts.length) {
      content.innerHTML = '<div class="community-empty"><span>✦</span><strong>Лента пока начинается с тебя</strong><p>Опубликуй первую работу, идею или новеллу — пусть её увидят другие участники.</p><button id="community-first-post">Создать публикацию</button></div>';
      content.querySelector('#community-first-post')?.addEventListener('click', () => {
        compose.hidden = false;
        outlet.querySelector('#community-post-title').focus();
      });
      return;
    }

    content.innerHTML = posts.map(post => `
      <article class="creator-post">
        <div class="creator-post-top">
          ${avatarMarkup(post, { size: 'community' })}
          <div class="creator-author"><strong>${escapeHTML(post.author || 'Автор Rebunar')}</strong><span>${escapeHTML(post.community_name || 'Общая лента')} · ${escapeHTML(formatDate(post.created_at))}</span></div>
          <span class="creator-post-type">ПУБЛИКАЦИЯ</span>
        </div>
        ${post.title ? `<h2>${escapeHTML(post.title)}</h2>` : ''}
        <p class="creator-post-body">${escapeHTML(post.body || '')}</p>
        <div class="creator-post-footer">
          <span>REBUNAR / CREATOR SPACE</span>
          <button class="creator-support-button" disabled title="Платежи подключим после юридической и технической подготовки">♡ Поддержать автора · скоро</button>
        </div>
      </article>
    `).join('');
  }

  outlet.querySelectorAll('[data-feed]').forEach(button => {
    button.addEventListener('click', () => {
      activeFeed = button.dataset.feed;
      outlet.querySelectorAll('[data-feed]').forEach(tab => tab.classList.toggle('is-active', tab === button));
      load();
    });
  });

  outlet.querySelector('#community-compose').addEventListener('click', () => {
    compose.hidden = !compose.hidden;
    if (!compose.hidden) outlet.querySelector('#community-post-title').focus();
  });

  outlet.querySelector('#community-publish').addEventListener('click', async () => {
    const title = outlet.querySelector('#community-post-title').value.trim();
    const text = outlet.querySelector('#community-post-text').value.trim();
    const community_id = groupSelect.value ? Number(groupSelect.value) : null;
    const status = outlet.querySelector('#community-post-status');
    if (!title && !text) { status.textContent = 'Добавь заголовок или текст.'; return; }
    const button = outlet.querySelector('#community-publish');
    button.disabled = true;
    status.textContent = 'Публикуем…';
    try {
      await requestJSON('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text, community_id })
      });
      outlet.querySelector('#community-post-title').value = '';
      outlet.querySelector('#community-post-text').value = '';
      status.textContent = 'Публикация добавлена.';
      compose.hidden = true;
      activeFeed = 'all';
      outlet.querySelectorAll('[data-feed]').forEach(tab => tab.classList.toggle('is-active', tab.dataset.feed === 'all'));
      await load();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  content.addEventListener('click', async event => {
    const button = event.target.closest('[data-open-group]');
    if (!button) return;
    const slug = button.dataset.openGroup;
    content.innerHTML = '<div class="community-loading">Открываем сообщество…</div>';
    try {
      const [posts, membership] = await Promise.all([
        requestJSON('/api/posts?community=' + encodeURIComponent(slug)),
        requestJSON('/api/membership/' + encodeURIComponent(slug))
      ]);
      const group = communities.find(item => item.slug === slug);
      content.innerHTML = `
        <div class="community-detail-head">
          <button id="community-back">← К сообществам</button>
          <h2>${escapeHTML(group?.name || 'Сообщество')}</h2>
          <p>${escapeHTML(group?.description || '')}</p>
          <span>Участников: ${Number(membership.count) || 0}</span>
          <button id="community-join">${membership.joined ? 'Покинуть сообщество' : 'Вступить'}</button>
        </div>
        ${posts.length ? posts.map(post => `<article class="creator-post"><div class="creator-post-top">${avatarMarkup(post, { size: 'community' })}<div class="creator-author"><strong>${escapeHTML(post.author || 'Автор')}</strong><span>${escapeHTML(formatDate(post.created_at))}</span></div></div><h2>${escapeHTML(post.title || 'Публикация')}</h2><p class="creator-post-body">${escapeHTML(post.body || '')}</p></article>`).join('') : '<div class="community-empty">Здесь пока нет публикаций.</div>'}
      `;
      content.querySelector('#community-back').addEventListener('click', () => renderFeed(postsCache));
      content.querySelector('#community-join').addEventListener('click', async event => {
        const joinButton = event.currentTarget;
        joinButton.disabled = true;
        try {
          const result = await requestJSON('/api/' + (membership.joined ? 'leave/' : 'join/') + encodeURIComponent(slug), { method: 'POST' });
          membership.joined = result.joined;
          membership.count = result.count;
          joinButton.textContent = result.joined ? 'Покинуть сообщество' : 'Вступить';
          content.querySelector('.community-detail-head span').textContent = 'Участников: ' + result.count;
        } catch (error) {
          joinButton.textContent = error.message;
        } finally { joinButton.disabled = false; }
      });
    } catch (error) {
      content.innerHTML = `<div class="community-empty">${escapeHTML(error.message)}</div>`;
    }
  });

  await load();
}
