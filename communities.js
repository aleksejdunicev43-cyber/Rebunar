(function () {
  function mk(tag, text, cls) {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  let cache = [];
  async function getCommunities() {
    const r = await fetch('/api/communities');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    cache = await r.json();
    return cache;
  }

  function postCard(post) {
    const card = mk('div', undefined, 'game-card feed-item');
    card.append(
      mk('small', 'Автор: ' + (post.author || 'Автор неизвестен')),
      mk('h2', post.title || 'Публикация'),
      mk('p', post.body || ''),
      mk('small', post.created_at || '')
    );
    return card;
  }

  function goCreate() {
    const items = Array.from(document.querySelectorAll('button, a'));
    const btn = items.find(b => /^\+?\s*Создать$/.test(b.textContent.trim()));
    if (btn) btn.click(); else window.showScreen('Создать');
  }

  function communityCard(c) {
    const card = mk('div', undefined, 'game-card');
    const open = mk('button', 'Открыть');
    open.onclick = () => window.openCommunity(c.slug);
    card.append(mk('h2', c.name), mk('p', c.description || ''), open);
    return card;
  }

  async function renderCommunitiesScreen() {
    const main = document.querySelector('main');
    if (!main) return;
    main.replaceChildren(mk('h1', 'Сообщества'), mk('p', 'Находи людей с похожими интересами.'));
    try {
      const list = await getCommunities();
      list.forEach(c => main.append(communityCard(c)));
    } catch (e) {
      main.append(mk('p', 'Не удалось загрузить сообщества.'));
    }
  }

  window.renderCommunitiesScreen = renderCommunitiesScreen;
  window.openCommunity = async function (slug) {
    const main = document.querySelector('main');
    if (!main) return;
    main.replaceChildren(mk('p', 'Загружаю...'));
    try {
      const list = await getCommunities();
      const c = list.find(x => x.slug === slug);
      if (!c) throw new Error('нет такого сообщества');
      const r = await fetch('/api/posts?community=' + encodeURIComponent(slug));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const posts = await r.json();

      main.replaceChildren();
      const back = mk('button', '← Все сообщества');
      back.onclick = () => window.renderCommunitiesScreen();
      const write = mk('button', '+ Написать здесь');
      write.onclick = () => { window.rebunarPreselect = c.id; goCreate(); };
      main.append(back, mk('h1', c.name), mk('p', c.description || ''), write);

      if (!posts.length) {
        main.append(mk('p', 'Здесь пока пусто. Напиши первую публикацию!'));
      }
      posts.forEach(post => main.append(postCard(post)));
    } catch (e) {
      main.replaceChildren(mk('p', 'Не удалось открыть сообщество.'));
    }
  };

  const prevShow = window.showScreen;
  window.showScreen = function (name) {
    if (String(name).includes('Сообщества')) {
      renderCommunitiesScreen();
      return;
    }
    return prevShow(name);
  };

  window.loadHomeCommunities = async function () {
    const box = document.getElementById('communityList');
    if (!box) return;
    try {
      const list = await getCommunities();
      box.replaceChildren();
      list.forEach(c => box.append(communityCard(c)));
    } catch (e) {
      box.textContent = 'Не удалось загрузить сообщества.';
    }
  };

  async function addSelect(titleInput) {
    const sel = document.createElement('select');
    sel.id = 'communitySelect';
    sel.style.cssText = 'width:100%;padding:12px;margin-bottom:12px;border-radius:10px;font-size:16px;';
    sel.append(new Option('Без сообщества', ''));
    titleInput.parentNode.insertBefore(sel, titleInput);
    try {
      const list = cache.length ? cache : await getCommunities();
      list.forEach(c => sel.append(new Option(c.name, String(c.id))));
      if (window.rebunarPreselect) {
        sel.value = String(window.rebunarPreselect);
        window.rebunarPreselect = null;
      }
    } catch (e) {}
  }

  new MutationObserver(() => {
    const t = document.getElementById('postTitle');
    if (t && !document.getElementById('communitySelect')) addSelect(t);
  }).observe(document.body, { childList: true, subtree: true });

  window.publishPost = async function () {
    const titleInput = document.getElementById('postTitle');
    const textInput = document.getElementById('postText');
    const status = document.getElementById('postStatus');
    const sel = document.getElementById('communitySelect');
    if (!titleInput || !textInput || !status) return;

    const title = titleInput.value.trim();
    const text = textInput.value.trim();
    if (!title && !text) {
      status.textContent = 'Сначала напиши что-нибудь.';
      return;
    }
    const community_id = sel && sel.value ? Number(sel.value) : null;
    status.textContent = 'Сохраняю публикацию...';

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text, community_id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ошибка сохранения');
      titleInput.value = '';
      textInput.value = '';
      status.textContent = 'Публикация сохранена!';
    } catch (e) {
      status.textContent = e.message;
    }
  };

  window.loadHomeCommunities();
})();

document.addEventListener('click', function (e) {
  const el = e.target.closest('nav span');
  if (el && el.textContent.includes('Сообщества')) {
    e.stopImmediatePropagation();
    e.preventDefault();
    window.renderCommunitiesScreen();
  }
}, true);

(function () {
  const baseOpen = window.openCommunity;
  window.openCommunity = async function (slug) {
    await baseOpen(slug);
    const main = document.querySelector('main');
    const h1 = main && main.querySelector('h1');
    if (!h1) return;

    const bar = document.createElement('div');
    bar.style.cssText = 'margin:12px 0;display:flex;gap:12px;align-items:center;flex-wrap:wrap;';
    const info = document.createElement('small');
    const btn = document.createElement('button');
    bar.append(info, btn);
    h1.insertAdjacentElement('afterend', bar);

    function paint(d) {
      info.textContent = 'Участников: ' + d.count;
      btn.textContent = d.joined ? 'Выйти из сообщества' : 'Вступить';
      btn.onclick = async () => {
        btn.disabled = true;
        try {
          const r = await fetch('/api/' + (d.joined ? 'leave/' : 'join/') + slug, { method: 'POST' });
          const j = await r.json();
          if (!r.ok) { info.textContent = j.error || 'Ошибка'; }
          else { paint(j); }
        } catch (e) {
          info.textContent = 'Нет связи с сервером';
        }
        btn.disabled = false;
      };
    }

    try {
      const r = await fetch('/api/membership/' + encodeURIComponent(slug));
      paint(await r.json());
    } catch (e) {
      info.textContent = '';
    }
  };
})();

document.head.appendChild(Object.assign(document.createElement('style'), {textContent: 'main{padding-bottom:120px !important}'}));

document.head.appendChild(Object.assign(document.createElement('style'), {textContent: 'nav, nav *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}'}));

// --- ЛОГИКА ЛИЧНЫХ ЧАТОВ REBUNAR ---
let chatRefreshInterval = null;

window.openDirectChat = function (chatWithId, username) {
    const main = document.querySelector('main');
    if (!main) return;

    if (chatRefreshInterval) clearInterval(chatRefreshInterval);
    main.innerHTML = '';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex; align-items:center; gap:15px; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;';
    
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Назад';
    backBtn.style.cssText = 'padding:6px 12px; background:#333; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:14px;';
    backBtn.onclick = () => { 
        clearInterval(chatRefreshInterval); 
        location.reload(); 
    };

    const title = document.createElement('h2');
    title.textContent = 'Чат с ' + username;
    title.style.cssText = 'margin:0; font-size:18px; color:#fff;';
    header.append(backBtn, title);

    const msgContainer = document.createElement('div');
    msgContainer.style.cssText = 'height:55vh; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding:10px; background:#11111b; border-radius:8px; margin-bottom:15px; border:1px solid #222;';

    const inputArea = document.createElement('div');
    inputArea.style.cssText = 'display:flex; gap:10px; align-items:center;';

    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.placeholder = 'Напишите сообщение...';
    inputField.style.cssText = 'flex-grow:1; padding:12px; border-radius:8px; border:1px solid #333; background:#1e1e2e; color:#fff; font-size:14px;';

    const sendBtn = document.createElement('button');
    sendBtn.textContent = 'Отправить';
    sendBtn.style.cssText = 'padding:12px 18px; background:#5865f2; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:bold;';

    inputArea.append(inputField, sendBtn);
    main.append(header, msgContainer, inputArea);

    async function fetchChatHistory() {
        try {
            const res = await fetch('/api/messages/history?chat_with_id=' + chatWithId);
            if (!res.ok) return;
            const history = await res.json();
            
            if (msgContainer.children.length !== history.length) {
                msgContainer.innerHTML = '';
                history.forEach(msg => {
                    const block = document.createElement('div');
                    if (msg.sender_id === chatWithId) {
                        block.style.cssText = 'align-self: flex-start; background: #2a2a3a; padding: 10px 14px; border-radius: 12px 12px 12px 0px; max-width: 75%; color: #fff; font-size: 14px; word-break: break-word;';
                    } else {
                        block.style.cssText = 'align-self: flex-end; background: #5865f2; padding: 10px 14px; border-radius: 12px 12px 0px 12px; max-width: 75%; color: #fff; font-size: 14px; word-break: break-word;';
                    }
                    block.textContent = msg.text;
                    msgContainer.append(block);
                });
                msgContainer.scrollTop = msgContainer.scrollHeight;
            }
        } catch (err) {
            console.error('Ошибка обновления сообщений:', err);
        }
    }

    async function handleSendMessage() {
        const messageText = inputField.value.trim();
        if (!messageText) return;
        sendBtn.disabled = true;

        try {
            const res = await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiver_id: chatWithId, text: messageText })
            });
            if (res.ok) {
                inputField.value = '';
                await fetchChatHistory();
            }
        } catch (err) {
            console.error('Ошибка при отправке:', err);
        }
        sendBtn.disabled = false;
    }

    sendBtn.onclick = handleSendMessage;
    inputField.onkeydown = (e) => { if (e.key === 'Enter') handleSendMessage(); };

    fetchChatHistory();
    chatRefreshInterval = setInterval(fetchChatHistory, 3000);
};
