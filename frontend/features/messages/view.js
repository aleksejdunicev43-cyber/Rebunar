import { getUser } from '../auth/session.js';
import { frameArtwork } from '../profile/enhancements.js';
import {
  getChats,
  hideChat,
  searchUsers,
  getChatHistory,
  sendMessage,
  getSelfNotes,
  createSelfNote,
  deleteSelfNote,
  uploadSelfImage
} from './api.js';

let outletRef = null;
let activeChat = null;
let chats = [];
let notes = [];
let searchTimer = null;
let refreshTimer = null;
let screenToken = 0;
let screenController = null;

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function showStatus(container, message) {
  if (container) {
    container.innerHTML = `<div class="messages-status">${escapeHTML(message)}</div>`;
  }
}

function getChatName(chat) {
  return chat.display_name || chat.username || 'Пользователь';
}

function safeFrameId(value) {
  return String(value || 'rookie').replace(/[^a-z0-9-]/gi, '') || 'rookie';
}

function frameLayer(frameId, className = 'chat-avatar-frame') {
  const frame = safeFrameId(frameId);
  return `<span class="${className} frame-${frame}" aria-hidden="true">${frameArtwork(frame)}</span>`;
}

function renderChatList(filter = '') {
  const list = outletRef?.querySelector('[data-chat-list]');
  if (!list) return;

  const query = filter.trim().toLowerCase();
  const filtered = chats.filter(chat =>
    `${chat.display_name || ''} ${chat.username || ''}`.toLowerCase().includes(query)
  );

  const favoritePreview = notes.length
    ? notes[0].text
    : 'Личные заметки и сохранённые записи';

  const favorite = `
    <button class="messages-room-item messages-favorite-item ${activeChat?.kind === 'favorite' ? 'is-active' : ''}"
      data-open-favorite>
      <span class="chat-avatar messages-favorite-avatar">
        <span class="messages-favorite-symbol">★</span>
      </span>
      <span class="chat-preview-block">
        <span class="chat-row-top">
          <span class="messages-room-name">Избранное</span>
          <time class="chat-time">Личное</time>
        </span>
        <span class="messages-room-preview">${escapeHTML(favoritePreview)}</span>
      </span>
    </button>
  `;

  const rows = filtered.map(chat => {
    const name = getChatName(chat);
    const initial = escapeHTML(name.trim().charAt(0).toUpperCase() || 'R');
    const avatar = chat.avatar
      ? `<img class="chat-avatar-image" src="${escapeHTML(chat.avatar)}" alt="" onerror="this.remove()">`
      : '';

    return `
      <div class="messages-chat-row">
        <button type="button" class="messages-chat-delete" data-delete-chat="${Number(chat.user_id)}"
          aria-label="Удалить переписку" title="Удалить переписку">🗑</button>
        <button type="button" class="messages-room-item ${activeChat?.user_id === chat.user_id ? 'is-active' : ''}"
          data-open-chat="${Number(chat.user_id)}">
          <span class="chat-avatar">
            <span class="chat-avatar-core">${avatar}<span class="chat-avatar-initial">${initial}</span></span>
            ${frameLayer(chat.equipped_frame)}
          </span>
          <span class="chat-preview-block">
            <span class="chat-row-top">
              <span class="messages-room-name">${escapeHTML(name)}</span>
              <time class="chat-time">${escapeHTML(chat.created_at || '')}</time>
            </span>
            <span class="messages-room-preview">${escapeHTML(chat.last_message || 'Начните переписку')}</span>
          </span>
        </button>
      </div>
    `;
  }).join('');

  list.innerHTML = favorite + (rows || (
    query ? '<div class="messages-status">Ничего не найдено</div>' :
    '<div class="messages-status">Пока нет переписок</div>'
  ));
}

function renderMessages(messages) {
  const list = outletRef?.querySelector('[data-message-list]');
  if (!list) return;

  const myId = Number(getUser()?.id);

  list.innerHTML = messages.length ? messages.map(message => {
    const isOwn = Number(message.sender_id) === myId;
    // Для своих сообщений используем актуальную сессию: серверная история
    // может содержать старый снимок профиля, если аватар/рамка менялись позже.
    const currentUser = isOwn ? getUser() : null;
    const profile = currentUser || message;
    const name = profile.display_name || profile.username || message.display_name || message.username || 'Пользователь';
    const initial = escapeHTML(name.trim().charAt(0).toUpperCase() || 'R');
    const avatarUrl = profile.avatar || '';
    const avatar = avatarUrl
      ? `<img class="message-avatar-image" src="${escapeHTML(avatarUrl)}" alt="" onerror="this.remove(); this.parentElement.classList.remove('has-avatar-image'); this.parentElement.classList.add('is-avatar-fallback')">`
      : '';
    const frameId = profile.equipped_frame || message.equipped_frame || 'rookie';

    return `
      <div class="message-row ${isOwn ? 'is-own' : 'is-incoming'}">
        <span class="message-avatar${frameId === 'inferno-ascendant' ? ' has-inferno-3d-frame' : ''}" aria-hidden="true">
          <span class="message-avatar-core ${avatarUrl ? 'has-avatar-image' : 'is-avatar-fallback'}">${avatar}<span class="message-avatar-initial">${initial}</span></span>
          ${frameLayer(frameId, 'message-avatar-frame')}
        </span>
        <div class="messages-bubble">
          <div class="message-author">${escapeHTML(name)}</div>
          <div>${escapeHTML(message.text)}</div>
          <time>${escapeHTML(message.created_at || '')}</time>
        </div>
      </div>
    `;
  }).join('') : '<div class="messages-status">Пока нет сообщений. Напиши первым!</div>';

  list.scrollTop = list.scrollHeight;
}

function renderFavoriteNotes({ preserveScroll = false } = {}) {
  const list = outletRef?.querySelector('[data-message-list]');
  if (!list) return;
  const previousScrollTop = list.scrollTop;
  const wasNearBottom = list.scrollHeight - list.clientHeight - list.scrollTop < 80;

  list.innerHTML = notes.length ? notes.map(note => `
    <article class="messages-favorite-note">
      ${note.image_url ? `<img class="messages-favorite-image" src="${escapeHTML(note.image_url)}" alt="Сохранённое фото" loading="lazy">` : ''}
      ${note.text && note.text !== '[Фото]' ? `<p>${escapeHTML(note.text)}</p>` : ''}
      <div class="messages-favorite-note-footer">
        <time>${escapeHTML(note.created_at || '')}</time>
        <button type="button" data-delete-note="${Number(note.id)}">Удалить</button>
      </div>
    </article>
  `).join('') : '<div class="messages-status">Здесь будут твои личные заметки и фото</div>';

  if (preserveScroll) {
    // При удалении или фоновом обновлении сохраняем позицию,
    // даже если пользователь находится рядом с концом списка.
    list.scrollTop = previousScrollTop;
  } else {
    list.scrollTop = list.scrollHeight;
  }
}

async function loadChats() {
  chats = await getChats();
  renderChatList(outletRef?.querySelector('[data-chat-search]')?.value || '');
}

async function openChat(user) {
  activeChat = user;
  renderChatList(outletRef?.querySelector('[data-chat-search]')?.value || '');

  const conversation = outletRef?.querySelector('[data-conversation]');
  if (!conversation) return;

  conversation.innerHTML = `
    <header class="messages-chat-header">
      <button type="button" class="screen-back messages-back" data-back aria-label="Назад" title="Назад"><span aria-hidden="true">⤺</span></button>
      <span class="chat-avatar messages-header-avatar">
        <span class="chat-avatar-core">${user.avatar ? `<img class="chat-avatar-image" src="${escapeHTML(user.avatar)}" alt="">` : `<span class="chat-avatar-initial">${escapeHTML((getChatName(user).charAt(0) || 'R').toUpperCase())}</span>`}</span>
        ${frameLayer(user.equipped_frame)}
      </span>
      <div class="messages-chat-identity">
        <strong>${escapeHTML(getChatName(user))}</strong>
        <span>@${escapeHTML(user.username || 'пользователь')}</span>
      </div>
    </header>
    <div class="messages-message-list" data-message-list></div>
    <form class="messages-compose" data-send-form>
      <input name="text" maxlength="5000" placeholder="Сообщение..." autocomplete="off" required>
      <button type="submit" aria-label="Отправить">➤</button>
    </form>
  `;

  outletRef.querySelector('.messages-layout')?.classList.add('is-chat-open');

  try {
    renderMessages(await getChatHistory(user.user_id));
  } catch (error) {
    showStatus(conversation.querySelector('[data-message-list]'), error.message);
  }
}

async function openFavorite() {
  activeChat = { kind: 'favorite' };
  renderChatList(outletRef?.querySelector('[data-chat-search]')?.value || '');

  const conversation = outletRef?.querySelector('[data-conversation]');
  if (!conversation) return;

  conversation.innerHTML = `
    <header class="messages-chat-header">
      <button type="button" class="screen-back messages-back" data-back aria-label="Назад" title="Назад"><span aria-hidden="true">⤺</span></button>
      <span class="chat-avatar messages-favorite-avatar messages-favorite-avatar-small">
        <span class="messages-favorite-symbol">★</span>
      </span>
      <div class="messages-chat-identity">
        <strong>Избранное</strong>
        <span>Личные заметки</span>
      </div>
    </header>
    <div class="messages-message-list messages-favorite-list" data-message-list></div>
    <form class="messages-compose messages-favorite-compose" data-note-form>
      <input type="file" accept="image/jpeg,image/png,image/webp" data-favorite-image hidden>
      <button type="button" data-attach-image aria-label="Добавить фото" title="Добавить фото">＋</button>
      <textarea name="text" maxlength="5000" rows="1" placeholder="Записать заметку..." autocomplete="off"></textarea>
      <button type="submit" aria-label="Сохранить заметку" title="Сохранить заметку">➤</button>
    </form>
  `;

  outletRef.querySelector('.messages-layout')?.classList.add('is-chat-open');

  // Не даём браузеру запускать pull-to-refresh при движении вниз
  // на верхней границе Избранного. Сам список продолжает прокручиваться вверх.
  const favoriteList = conversation.querySelector('.messages-favorite-list');
  let favoriteTouchY = 0;

  favoriteList?.addEventListener('touchstart', event => {
    favoriteTouchY = event.touches[0]?.clientY ?? 0;
  }, { passive: true, signal: screenController?.signal });

  favoriteList?.addEventListener('touchmove', event => {
    const currentY = event.touches[0]?.clientY ?? favoriteTouchY;
    const movingDown = currentY > favoriteTouchY;
    if (movingDown && favoriteList.scrollTop <= 1) {
      event.preventDefault();
    }
    favoriteTouchY = currentY;
  }, { passive: false, signal: screenController?.signal });

  try {
    notes = await getSelfNotes();
    renderFavoriteNotes();
  } catch (error) {
    showStatus(conversation.querySelector('[data-message-list]'), error.message);
  }
}

function renderShell() {
  outletRef.innerHTML = `
    <section class="screen messages-screen">
      <div class="messages-layout">
        <aside class="messages-sidebar">
          <div class="messages-search">
            <span class="messages-search-icon">⌕</span>
            <input data-chat-search type="search" placeholder="Поиск чатов">
          </div>
          <div class="messages-search-results" data-search-results></div>
          <div class="messages-chat-list" data-chat-list></div>
        </aside>

        <section class="messages-conversation" data-conversation>
          <div class="messages-placeholder">
            <span class="messages-placeholder-icon">◉</span>
            <h2>Твои чаты</h2>
            <p>Выбери переписку, чтобы продолжить общение.</p>
          </div>
        </section>
      </div>
    </section>
  `;
}

export function renderMessagesScreen(outlet, params = {}) {
  outletRef = outlet;
  activeChat = null;
  chats = [];
  notes = [];
  const token = ++screenToken;

  clearInterval(refreshTimer);
  clearTimeout(searchTimer);
  screenController?.abort();
  screenController = new AbortController();
  const listenerOptions = { signal: screenController.signal };

  renderShell();

  const search = outlet.querySelector('[data-chat-search]');

  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const query = search.value.trim();
    renderChatList(query);

    if (!query) {
      outlet.querySelector('[data-search-results]').innerHTML = '';
      return;
    }

    searchTimer = setTimeout(async () => {
      try {
        const users = await searchUsers(query);
        if (token !== screenToken) return;

        const results = outlet.querySelector('[data-search-results]');
        if (!results) return;

        results.innerHTML = users.map(user => `
          <button class="messages-search-result" data-search-user="${Number(user.id)}"
            data-search-name="${escapeHTML(user.display_name || user.username || 'Пользователь')}"
            data-search-username="${escapeHTML(user.username || '')}"
            data-search-avatar="${escapeHTML(user.avatar || '')}"
            data-search-frame="${escapeHTML(user.equipped_frame || 'rookie')}">
            <span class="messages-search-result-avatar-wrap">
              <span class="messages-search-result-avatar-core">${user.avatar ? `<img src="${escapeHTML(user.avatar)}" alt="">` : escapeHTML((user.display_name || user.username || 'R').charAt(0).toUpperCase())}</span>
              ${frameLayer(user.equipped_frame, 'messages-search-result-frame')}
            </span>
            <span>
              <strong>${escapeHTML(user.display_name || user.username || 'Пользователь')}</strong>
              <small>@${escapeHTML(user.username || '')}</small>
            </span>
          </button>
        `).join('');
      } catch (error) {
        showStatus(outlet.querySelector('[data-search-results]'), error.message);
      }
    }, 300);
  }, listenerOptions);

  let swipeStart = null;
  const chatList = outlet.querySelector('[data-chat-list]');
  chatList.addEventListener('touchstart', event => {
    const row = event.target.closest('.messages-chat-row');
    if (!row || !event.touches.length) return;
    const touch = event.touches[0];
    swipeStart = { row, x: touch.clientX, y: touch.clientY };
  }, { passive: true, signal: screenController.signal });

  chatList.addEventListener('touchend', event => {
    if (!swipeStart || !event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - swipeStart.x;
    const dy = touch.clientY - swipeStart.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) {
        chatList.querySelectorAll('.messages-chat-row.is-swiped').forEach(row => row.classList.remove('is-swiped'));
        swipeStart.row.classList.add('is-swiped');
      } else {
        swipeStart.row.classList.remove('is-swiped');
      }
    }
    swipeStart = null;
  }, { passive: true, signal: screenController.signal });

  outlet.addEventListener('click', async event => {
    const deleteChatButton = event.target.closest('[data-delete-chat]');
    if (deleteChatButton) {
      const userId = Number(deleteChatButton.dataset.deleteChat);
      if (!userId || !window.confirm('Удалить переписку у обоих? Все сообщения в этом чате будут удалены без возможности восстановления.')) return;
      deleteChatButton.disabled = true;
      try {
        await hideChat(userId);
        chats = chats.filter(chat => Number(chat.user_id) !== userId);
        if (Number(activeChat?.user_id) === userId) {
          activeChat = null;
          const conversation = outlet.querySelector('[data-conversation]');
          if (conversation) conversation.innerHTML = `
            <div class="messages-placeholder">
              <span class="messages-placeholder-icon">◉</span>
              <h2>Твои чаты</h2>
              <p>Выбери переписку, чтобы продолжить общение.</p>
            </div>
          `;
          outlet.querySelector('.messages-layout')?.classList.remove('is-chat-open');
        }
        renderChatList(search.value);
      } catch (error) {
        deleteChatButton.disabled = false;
        showStatus(outlet.querySelector('[data-chat-list]'), error.message);
      }
      return;
    }

    const favoriteButton = event.target.closest('[data-open-favorite]');
    if (favoriteButton) {
      await openFavorite();
      return;
    }

    const chatButton = event.target.closest('[data-open-chat]');
    const userButton = event.target.closest('[data-search-user]');

    if (chatButton) {
      const id = Number(chatButton.dataset.openChat);
      const user = chats.find(item => Number(item.user_id) === id);
      if (user) await openChat(user);
      return;
    }

    if (userButton) {
      const id = Number(userButton.dataset.searchUser);
      const user = chats.find(item => Number(item.user_id) === id) || {
        user_id: id,
        display_name: userButton.dataset.searchName,
        username: userButton.dataset.searchUsername,
        avatar: userButton.dataset.searchAvatar,
        equipped_frame: userButton.dataset.searchFrame
      };
      await openChat(user);
      return;
    }

    if (event.target.closest('[data-back]')) {
      activeChat = null;
      outlet.querySelector('.messages-layout')?.classList.remove('is-chat-open');
      renderChatList(search.value);
      return;
    }

    const attachButton = event.target.closest('[data-attach-image]');
    if (attachButton) {
      outlet.querySelector('[data-favorite-image]')?.click();
      return;
    }

    const deleteButton = event.target.closest('[data-delete-note]');
    if (deleteButton) {
      try {
        await deleteSelfNote(deleteButton.dataset.deleteNote);
        notes = await getSelfNotes();
        renderFavoriteNotes({ preserveScroll: true });
        renderChatList(search.value);
      } catch (error) {
        showStatus(outlet.querySelector('[data-message-list]'), error.message);
      }
    }
  }, listenerOptions);

  outlet.addEventListener('submit', async event => {
    if (event.target.matches('[data-send-form]')) {
      event.preventDefault();
      const input = event.target.elements.text;
      const text = input.value.trim();
      if (!text || !activeChat || activeChat.kind === 'favorite') return;

      const button = event.target.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        await sendMessage(activeChat.user_id, text);
        input.value = '';
        renderMessages(await getChatHistory(activeChat.user_id));
        await loadChats();
      } catch (error) {
        showStatus(outlet.querySelector('[data-message-list]'), error.message);
      } finally {
        button.disabled = false;
      }
    }

    if (event.target.matches('[data-note-form]')) {
      event.preventDefault();
      const input = event.target.elements.text;
      const text = input.value.trim();
      if (!text) return;

      const button = event.target.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        await createSelfNote(text);
        input.value = '';
        notes = await getSelfNotes();
        renderFavoriteNotes();
        renderChatList(search.value);
      } catch (error) {
        showStatus(outlet.querySelector('[data-message-list]'), error.message);
      } finally {
        button.disabled = false;
      }
    }
  }, listenerOptions);

  outlet.addEventListener('change', async event => {
    if (!event.target.matches('[data-favorite-image]')) return;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadSelfImage(file);
      notes = await getSelfNotes();
      renderFavoriteNotes();
      renderChatList(search.value);
    } catch (error) {
      showStatus(outlet.querySelector('[data-message-list]'), error.message);
    } finally {
      event.target.value = '';
    }
  }, listenerOptions);

  loadChats().then(async () => {
    const targetId = Number(params.userId || 0);
    if (targetId > 0 && targetId !== Number(getUser()?.id)) {
      const profile = params.user || {};
      const user = chats.find(item => Number(item.user_id) === targetId) || {
        user_id: targetId,
        display_name: profile.display_name || profile.username || 'Пользователь',
        username: profile.username || '',
        avatar: profile.avatar || '',
        equipped_frame: profile.equipped_frame || 'rookie'
      };
      await openChat(user);
    }
  }).catch(error =>
    showStatus(outlet.querySelector('[data-chat-list]'), error.message)
  );

  refreshTimer = setInterval(async () => {
    if (token !== screenToken) return;
    try {
      await loadChats();
      if (activeChat?.kind === 'favorite') {
        notes = await getSelfNotes();
        renderFavoriteNotes({ preserveScroll: true });
      } else if (activeChat?.user_id) {
        renderMessages(await getChatHistory(activeChat.user_id));
      }
    } catch {}
  }, 5000);
}
