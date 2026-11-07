/**
 * REBUNAR STUDIO — first playable foundation.
 * Projects are currently stored in this browser only; cloud sync and AI API come later.
 */
const STORAGE_KEY = 'rebunar.studio.projects.v1';
const DEFAULT_PROJECT = {
  id: 'demo',
  name: 'Моя первая игра',
  template: 'topdown',
  description: 'Найди кристалл и собери очки.',
  color: '#35d39a',
  speed: 3,
  createdAt: Date.now()
};

function readProjects() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeProjects(projects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function makeId() {
  return 'game-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

export function renderStudioScreen(outlet) {
  let projects = readProjects();
  let activeProject = null;

  function renderList() {
    outlet.innerHTML = `
      <section class="screen studio-screen">
        <header class="studio-heading">
          <div>
            <span class="ecosystem-eyebrow">REBUNAR / STUDIO</span>
            <h1>Rebunar Studio</h1>
            <p>Создавай игру постепенно: сначала запусти основу, затем меняй её в редакторе и подключай ИИ-помощника.</p>
          </div>
          <span class="studio-status"><i></i> ПЕРВАЯ ВЕРСИЯ</span>
        </header>
        <section class="studio-start-panel">
          <div class="studio-panel-copy">
            <span class="studio-kicker">НОВЫЙ ПРОЕКТ</span>
            <h2>С чего начнём?</h2>
            <p>Выбери основу. Это не ограничивает будущую игру — шаблон нужен, чтобы было от чего отталкиваться.</p>
          </div>
          <form class="studio-create-form">
            <label>Название игры<input name="name" maxlength="48" placeholder="Например, Тайна леса" required></label>
            <label>Стартовый шаблон
              <select name="template">
                <option value="topdown">2D — вид сверху</option>
                <option value="platformer" disabled>2D — платформер (следующий этап)</option>
                <option value="puzzle" disabled>2D — головоломка (следующий этап)</option>
              </select>
            </label>
            <button class="studio-primary-button" type="submit"><span>＋</span> Создать проект</button>
          </form>
        </section>
        <div class="studio-section-title"><div><span class="studio-kicker">ТВОЯ РАБОТА</span><h2>Мои проекты</h2></div><span class="studio-project-count">${projects.length} проектов</span></div>
        <div class="studio-project-grid">
          ${projects.length ? projects.map(project => `
            <article class="studio-project-card" data-project-id="${escapeHtml(project.id)}">
              <div class="studio-project-art"><span class="studio-art-orbit"></span><span class="studio-art-player"></span><span class="studio-art-gem">◆</span><small>2D GAME</small></div>
              <div class="studio-project-info"><span class="studio-kicker">${project.template === 'platformer' ? 'ПЛАТФОРМЕР' : project.template === 'puzzle' ? 'ГОЛОВОЛОМКА' : 'ВИД СВЕРХУ'}</span><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.description || 'Новый игровой проект')}</p><button class="studio-open-button" data-open-project="${escapeHtml(project.id)}">Открыть редактор <span>→</span></button></div>
            </article>
          `).join('') : '<div class="studio-empty"><span>✦</span><h3>Здесь появится твоя первая игра</h3><p>Создай проект выше — и сразу перейдём к его запуску и настройке.</p></div>'}
        </div>
        <section class="studio-roadmap">
          <div><span class="studio-kicker">КАК БУДЕТ РАСТИ СТУДИЯ</span><h2>От идеи до публикации</h2></div>
          <div class="studio-roadmap-steps"><article><b>01</b><strong>Игровая основа</strong><span>Запускаемый шаблон и сохранение проекта</span></article><article><b>02</b><strong>Визуальный редактор</strong><span>Сцены, персонажи, объекты и правила</span></article><article><b>03</b><strong>ИИ-помощник</strong><span>Создание и изменение игры по описанию</span></article><article><b>04</b><strong>Публикация</strong><span>Сборка и размещение в магазине Rebunar</span></article></div>
        </section>
        <p class="studio-storage-note">Сейчас проекты сохраняются только в этом браузере на этом устройстве. Облачное хранение аккаунта добавим отдельно.</p>
      </section>`;

    outlet.querySelector('.studio-create-form').addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      const name = form.elements.name.value.trim();
      if (!name) return;
      const template = form.elements.template.value;
      const project = { ...DEFAULT_PROJECT, id: makeId(), name, template, createdAt: Date.now() };
      projects = [project, ...projects];
      if (!writeProjects(projects)) {
        projects = projects.filter(item => item.id !== project.id);
        alert('Не удалось сохранить проект. Возможно, в браузере недостаточно места.');
        return;
      }
      openProject(project.id);
    });

    outlet.querySelectorAll('[data-open-project]').forEach(button => {
      button.addEventListener('click', () => openProject(button.dataset.openProject));
    });
  }

  function openProject(id) {
    activeProject = projects.find(project => project.id === id);
    if (!activeProject) return renderList();
    renderEditor();
  }

  function renderEditor() {
    const project = activeProject;
    outlet.innerHTML = `
      <section class="screen studio-screen studio-editor-screen">
        <div class="studio-editor-topbar">
          <button class="studio-back-button" type="button">← Все проекты</button>
          <div class="studio-editor-project-name"><span class="studio-live-dot"></span><strong>${escapeHtml(project.name)}</strong><small>СОХРАНЕНО ЛОКАЛЬНО</small></div>
          <button class="studio-save-button" type="button">Сохранить проект</button>
        </div>
        <header class="studio-editor-heading"><div><span class="studio-kicker">РЕДАКТОР ПРОЕКТА</span><h1>${escapeHtml(project.name)}</h1><p>Это первая рабочая версия: можно запустить игру, управлять персонажем и менять его внешний вид и скорость.</p></div><span class="studio-status"><i></i> ИГРА ЗАПУСКАЕТСЯ</span></header>
        <div class="studio-workspace">
          <section class="studio-preview-panel">
            <div class="studio-panel-toolbar"><div><span class="studio-kicker">ПРЕДПРОСМОТР</span><strong>Игровая сцена</strong></div><span class="studio-resolution">640 × 360</span></div>
            <div class="studio-canvas-wrap"><canvas class="studio-game-canvas" width="640" height="360" aria-label="Предпросмотр игры: собери кристалл"></canvas><div class="studio-game-overlay">СОБЕРИ КРИСТАЛЛ <span>◆</span></div></div>
            <div class="studio-game-controls"><span class="studio-hint">Управление: WASD / стрелки</span><div class="studio-touch-pad"><button data-dir="up" aria-label="Вверх">↑</button><div><button data-dir="left" aria-label="Влево">←</button><button data-dir="down" aria-label="Вниз">↓</button><button data-dir="right" aria-label="Вправо">→</button></div></div><button class="studio-reset-button" type="button">↻ Заново</button></div>
          </section>
          <aside class="studio-inspector">
            <div class="studio-inspector-title"><span class="studio-kicker">СВОЙСТВА</span><strong>Персонаж</strong></div>
            <label class="studio-field">Цвет персонажа<input class="studio-color-input" type="color" value="${escapeHtml(project.color || DEFAULT_PROJECT.color)}"></label>
            <label class="studio-field">Скорость движения <output class="studio-speed-value">${Number(project.speed) || 3}</output><input class="studio-speed-input" type="range" min="1" max="8" step="1" value="${Number(project.speed) || 3}"></label>
            <div class="studio-inspector-divider"></div>
            <div class="studio-inspector-title"><span class="studio-kicker">ПРОЕКТ</span><strong>Описание игры</strong></div>
            <label class="studio-field">Название<input class="studio-name-input" maxlength="48" value="${escapeHtml(project.name)}"></label>
            <label class="studio-field">Идея<textarea class="studio-description-input" rows="4" maxlength="500">${escapeHtml(project.description || '')}</textarea></label>
            <div class="studio-ai-card"><span class="studio-ai-symbol">✧</span><div><strong>ИИ-помощник</strong><p>Подключим ИИ-модель через серверный API. Ключи доступа не будут храниться в браузере.</p><span>ПОДГОТАВЛИВАЕТСЯ</span></div></div>
          </aside>
        </div>
        <div class="studio-editor-footnote">Это первый прототип редактора, а не финальная игровая студия. Сейчас работают запуск игры, управление, изменение цвета и скорости, а также локальное сохранение.</div>
      </section>`;

    const canvas = outlet.querySelector('.studio-game-canvas');
    const ctx = canvas.getContext('2d');
    const colorInput = outlet.querySelector('.studio-color-input');
    const speedInput = outlet.querySelector('.studio-speed-input');
    const speedValue = outlet.querySelector('.studio-speed-value');
    let player = { x: 70, y: 170, size: 24 };
    let gem = { x: 510, y: 170, size: 13 };
    let score = 0;
    const keys = new Set();
    let animationFrame = 0;

    function resetGame() {
      player = { x: 70, y: 170, size: 24 };
      gem = { x: 510, y: 170, size: 13 };
      score = 0;
      draw();
    }

    function draw() {
      if (!canvas.isConnected) {
        cancelAnimationFrame(animationFrame);
        return;
      }
      ctx.clearRect(0, 0, 640, 360);
      ctx.fillStyle = '#10191a';
      ctx.fillRect(0, 0, 640, 360);
      ctx.strokeStyle = 'rgba(93, 190, 154, .13)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 640; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 360); ctx.stroke(); }
      for (let y = 0; y <= 360; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(53, 211, 154, .12)';
      ctx.beginPath(); ctx.arc(gem.x, gem.y, 25, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(gem.x, gem.y); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#f5d66b'; ctx.fillRect(-gem.size / 1.4, -gem.size / 1.4, gem.size * 1.4, gem.size * 1.4); ctx.restore();
      ctx.fillStyle = project.color || DEFAULT_PROJECT.color;
      ctx.shadowColor = project.color || DEFAULT_PROJECT.color; ctx.shadowBlur = 18;
      ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#e9f3ef'; ctx.font = 'bold 14px system-ui'; ctx.fillText('КРИСТАЛЛЫ: ' + score, 18, 28);
      ctx.fillStyle = 'rgba(230,240,236,.55)'; ctx.font = '12px system-ui'; ctx.fillText('Перемещай персонажа к кристаллу', 18, 348);
    }

    function tick() {
      if (!canvas.isConnected) {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        keys.clear();
        return;
      }
      const speed = Number(project.speed) || 3;
      if (keys.has('ArrowUp') || keys.has('w')) player.y -= speed;
      if (keys.has('ArrowDown') || keys.has('s')) player.y += speed;
      if (keys.has('ArrowLeft') || keys.has('a')) player.x -= speed;
      if (keys.has('ArrowRight') || keys.has('d')) player.x += speed;
      player.x = Math.max(14, Math.min(626, player.x));
      player.y = Math.max(14, Math.min(346, player.y));
      if (Math.hypot(player.x - gem.x, player.y - gem.y) < 25) {
        score += 1;
        gem.x = 45 + Math.random() * 550;
        gem.y = 45 + Math.random() * 270;
      }
      draw();
      animationFrame = requestAnimationFrame(tick);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    function onKeyDown(event) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(event.key)) {
        if (canvas.isConnected) event.preventDefault();
        keys.add(event.key);
      }
    }
    function onKeyUp(event) { keys.delete(event.key); }
    outlet.querySelectorAll('[data-dir]').forEach(button => {
      const map = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
      const key = map[button.dataset.dir];
      const release = () => keys.delete(key);
      button.addEventListener('pointerdown', event => { event.preventDefault(); keys.add(key); });
      button.addEventListener('pointerup', release);
      button.addEventListener('pointerleave', release);
      button.addEventListener('pointercancel', release);
    });
    colorInput.addEventListener('input', () => { project.color = colorInput.value; draw(); });
    speedInput.addEventListener('input', () => { project.speed = Number(speedInput.value); speedValue.textContent = speedInput.value; });
    outlet.querySelector('.studio-reset-button').addEventListener('click', resetGame);
    outlet.querySelector('.studio-back-button').addEventListener('click', () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      cancelAnimationFrame(animationFrame);
      renderList();
    });
    outlet.querySelector('.studio-save-button').addEventListener('click', saveProject);
    function saveProject() {
      project.name = outlet.querySelector('.studio-name-input').value.trim() || 'Новая игра';
      project.description = outlet.querySelector('.studio-description-input').value.trim();
      project.color = colorInput.value;
      project.speed = Number(speedInput.value);
      projects = projects.map(item => item.id === project.id ? project : item);
      if (writeProjects(projects)) {
        const button = outlet.querySelector('.studio-save-button');
        button.textContent = '✓ Сохранено';
        outlet.querySelector('.studio-editor-heading h1').textContent = project.name;
        outlet.querySelector('.studio-editor-project-name strong').textContent = project.name;
        setTimeout(() => { if (button.isConnected) button.textContent = 'Сохранить проект'; }, 1500);
      } else {
        alert('Не удалось сохранить изменения в памяти браузера.');
      }
    }
    draw();
    tick();
  }

  renderList();
}
