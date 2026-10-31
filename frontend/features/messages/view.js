import { getUser } from '../auth/session.js';
import {
  getChats,
  searchUsers,
  getChatHistory,
  sendMessage,
  getSelfNotes,
  createSelfNote,
  deleteSelfNote
} from './api.js';

let outletRef = null;
let activeChat = null;
let activeTab = 'chats';
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
  container.innerHTML = `<div class="messages-status">${escapeHTML(message)}</div>`;
}

function renderChatList(filter = '') {
  const list = outletRef?.querySelector('[data-chat-list]');
  if (!list) return;

  const query = filter.trim().toLowerCase();
  const filtered = chats.filter(chat =>
    `${chat.display_name} ${chat.username}`.toLowerCase().includes(query)
  );

  list.innerHTML = filtered.length ? filtered.map(chat => {
    const name = chat.display_name || chat.username || 'Пользователь';
    const initials = escapeHTML(name.trim().slice(0, 1).toUpperCase() || 'R');
    const avatar = chat.avatar
      ? `<img class="chat-avatar-image" src="${escapeHTML(chat.avatar)}" alt="">`
      : `<span>${initials}</span>`;

    return `
      <button class="messages-room-item ${activeChat?.user_id === chat.user_id ? 'is-active' : ''}"
        data-open-chat="${chat.user_id}">
        <span class="chat-avatar">${avatar}</span>
        <span class="chat-preview-block">
          <span class="chat-row-top">
            <span class="messages-room-name">${escapeHTML(name)}</span>
            <time class="chat-time">${escapeHTML(chat.created_at || '')}</time>
          </span>
          <span class="messages-room-preview">${escapeHTML(chat.last_message || 'Начните переписку')}</span>
        </span>
      </button>
    `;
  }).join('') : '<div class="messages-status">Переписок пока нет</div>';
}

function renderMessages(messages) {
  const list = outletRef?.querySelector('[data-message-list]');
  if (!list) return;

  const myId = Number(getUser()?.id);
  list.innerHTML = messages.length ? messages.map(message => `
    <div class="messages-bubble ${Number(message.sender_id) === myId ? 'is-own' : 'is-incoming'}">
      <div>${escapeHTML(message.text)}</div>
      <time>${escapeHTML(message.created_at || '')}</time>
    </div>
  `).join('') : '<div class="messages-status">Начните переписку первым сообщением</div>';

  list.scrollTop = list.scrollHeight;
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
      <button class="messages-back" data-back>←</button>
      <div class="messages-room-name">${escapeHTML(user.display_name)}</div>
    </header>
    <div class="messages-message-list" data-message-list></div>
    <form class="messages-compose" data-send-form>
      <input name="text" maxlength="5000" placeholder="Написать сообщение..." autocomplete="off" required>
      <button type="submit">Отправить</button>
    </form>
  `;

  outletRef.querySelector('.messages-layout')?.classList.add('is-chat-open');

  try {
    renderMessages(await getChatHistory(user.user_id));
  } catch (error) {
    showStatus(conversation.querySelector('[data-message-list]'), error.message);
  }
}

async function loadNotes() {
  const area = outletRef?.querySelector('[data-notes]');
  if (!area) return;

  try {
    notes = await getSelfNotes();
    area.innerHTML = `
      <form class="messages-note-form" data-note-form>
        <textarea name="text" maxlength="5000" placeholder="Запиши свою мысль..." required></textarea>
        <button type="submit">Сохранить заметку</button>
      </form>
      <div class="messages-note-list">
        ${notes.length ? notes.map(note => `
          <article class="messages-note">
            <p>${escapeHTML(note.text)}</p>
            <time>${escapeHTML(note.created_at || '')}</time>
            <button data-delete-note="${note.id}">Удалить</button>
          </article>
        `).join('') : '<div class="messages-status">Заметок пока нет</div>'}
      </div>
    `;
  } catch (error) {
    showStatus(area, error.message);
  }
}

function renderShell() {
  outletRef.innerHTML = `
    <section class="screen messages-screen">
      <header class="messages-header">
        <div>
          <span class="messages-eyebrow">REBUNAR / PRIVATE SPACE</span>
          <h1>Чаты</h1>
          <p>Переписки и личные заметки</p>
        </div>
      </header>

      <nav class="messages-tabs">
        <button data-tab="chats" class="is-active">Чаты</button>
        <button data-tab="notes">Мои заметки</button>
      </nav>

      <div class="messages-layout">
        <aside class="messages-sidebar">
          <div class="messages-search">
            <input data-chat-search type="search" placeholder="Поиск переписок и людей...">
          </div>
          <div data-search-results></div>
          <div data-chat-list></div>
        </aside>
        <section class="messages-conversation" data-conversation>
          <div class="messages-placeholder">
            <span class="messages-placeholder-icon">◉</span>
            <h2>Твоё пространство общения</h2>
            <p>Выбери переписку или найди пользователя.</p>
          </div>
        </section>
      </div>

      <section class="messages-notes-panel" data-notes hidden></section>
    </section>
  `;
}

export function renderMessagesScreen(outlet) {
  outletRef = outlet;
  activeChat = null;
  activeTab = 'chats';
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
          <button class="messages-room-item" data-search-user="${user.id}">
            <span class="messages-room-name">${escapeHTML(user.display_name)}</span>
            <span class="messages-room-preview">@${escapeHTML(user.username)}</span>
          </button>
        `).join('');
      } catch (error) {
        showStatus(outlet.querySelector('[data-search-results]'), error.message);
      }
    }, 300);
  }, listenerOptions);

  outlet.addEventListener('click', async event => {
    const tab = event.target.closest('[data-tab]');
    if (tab) {
      activeTab = tab.dataset.tab;
      outlet.querySelectorAll('[data-tab]').forEach(button =>
        button.classList.toggle('is-active', button === tab)
      );
      outlet.querySelector('.messages-layout').hidden = activeTab !== 'chats';
      outlet.querySelector('[data-notes]').hidden = activeTab !== 'notes';
      if (activeTab === 'notes') await loadNotes();
      return;
    }

    const chatButton = event.target.closest('[data-open-chat]');
    const userButton = event.target.closest('[data-search-user]');
    if (chatButton || userButton) {
      const id = Number(chatButton?.dataset.openChat || userButton?.dataset.searchUser);
      const user = chats.find(item => item.user_id === id) ||
        (userButton ? { user_id: id, display_name: userButton.querySelector('.messages-room-name').textContent } : null);
      if (user) await openChat(user);
      return;
    }

    if (event.target.closest('[data-back]')) {
      outlet.querySelector('.messages-layout').classList.remove('is-chat-open');
      activeChat = null;
      return;
    }

    const deleteButton = event.target.closest('[data-delete-note]');
    if (deleteButton) {
      try {
        await deleteSelfNote(deleteButton.dataset.deleteNote);
        await loadNotes();
      } catch (error) {
        alert(error.message);
      }
    }
  }, listenerOptions);

  outlet.addEventListener('submit', async event => {
    if (event.target.matches('[data-send-form]')) {
      event.preventDefault();
      const input = event.target.elements.text;
      const text = input.value.trim();
      if (!text || !activeChat) return;

      const button = event.target.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        await sendMessage(activeChat.user_id, text);
        input.value = '';
        renderMessages(await getChatHistory(activeChat.user_id));
        await loadChats();
      } catch (error) {
        alert(error.message);
      } finally {
        button.disabled = false;
      }
    }

    if (event.target.matches('[data-note-form]')) {
      event.preventDefault();
      const input = event.target.elements.text;
      const text = input.value.trim();
      if (!text) return;
      try {
        await createSelfNote(text);
        await loadNotes();
      } catch (error) {
        alert(error.message);
      }
    }
  }, listenerOptions);

  loadChats().catch(error => showStatus(outlet.querySelector('[data-chat-list]'), error.message));

  refreshTimer = setInterval(async () => {
    if (token !== screenToken) return;
    try {
      await loadChats();
      if (activeChat) renderMessages(await getChatHistory(activeChat.user_id));
    } catch {}
  }, 5000);
}
