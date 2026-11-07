/**
 * REBUNAR STUDIO — visual 2D editor foundation.
 * No external AI services or paid APIs are used. Projects stay in this browser for now.
 */
const STORAGE_KEY = 'rebunar.studio.projects.v2';
const LEGACY_STORAGE_KEY = 'rebunar.studio.projects.v1';
const DEFAULT_COLOR = '#35d39a';
const SCENE_WIDTH = 640;
const SCENE_HEIGHT = 360;

function makeId() {
  return 'obj-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

function defaultObjects() {
  return [
    { id: 'player', type: 'player', name: 'Игрок', x: 88, y: 180, size: 26, color: DEFAULT_COLOR },
    { id: 'crystal', type: 'crystal', name: 'Кристалл', x: 510, y: 180, size: 16, color: '#f5d66b' },
    { id: 'exit', type: 'exit', name: 'Выход', x: 570, y: 300, size: 30, color: '#62e5c1' }
  ];
}

const ANIMATION_STATES = ['idle', 'up', 'down', 'left', 'right'];

function normalizeObjects(source) {
  const objects = Array.isArray(source) && source.length
    ? source.map((item, index) => ({
        id: String(item.id || makeId()),
        type: ['player', 'crystal', 'wall', 'exit'].includes(item.type) ? item.type : 'wall',
        name: String(item.name || (item.type === 'player' ? 'Игрок' : item.type === 'crystal' ? 'Кристалл' : item.type === 'exit' ? 'Выход' : 'Стена')),
        x: Math.max(12, Math.min(SCENE_WIDTH - 12, Number(item.x) || 80 + index * 45)),
        y: Math.max(12, Math.min(SCENE_HEIGHT - 12, Number(item.y) || 100)),
        size: Math.max(8, Math.min(100, Number(item.size) || 24)),
        color: /^#[0-9a-f]{6}$/i.test(item.color || '') ? item.color : (item.type === 'crystal' ? '#f5d66b' : item.type === 'wall' ? '#64747a' : DEFAULT_COLOR),
        imageData: typeof item.imageData === 'string' && item.imageData.startsWith('data:image/') ? item.imageData : '',
        animationFrames: Array.isArray(item.animationFrames) ? item.animationFrames.filter(frame => typeof frame === 'string' && frame.startsWith('data:image/')).slice(0, 4) : [],
        directionalAnimations: Object.fromEntries(ANIMATION_STATES.map(state => [state, Array.isArray(item.directionalAnimations?.[state]) ? item.directionalAnimations[state].filter(frame => typeof frame === 'string' && frame.startsWith('data:image/')).slice(0, 4) : []])),
        animationSpeed: Math.max(80, Math.min(1000, Number(item.animationSpeed) || 180))
      }))
    : defaultObjects();
  if (!objects.some(item => item.type === 'player')) objects.unshift(defaultObjects()[0]);
  return objects;
}

function normalizeLevel(level, index) {
  return {
    id: String(level.id || makeId()),
    name: String(level.name || `Уровень ${index + 1}`),
    objects: normalizeObjects(level.objects),
    backgroundImage: typeof level.backgroundImage === 'string' && level.backgroundImage.startsWith('data:image/') ? level.backgroundImage : '',
    musicData: typeof level.musicData === 'string' && level.musicData.startsWith('data:audio/') ? level.musicData : '',
    collectSoundData: typeof level.collectSoundData === 'string' && level.collectSoundData.startsWith('data:audio/') ? level.collectSoundData : ''
  };
}

function normalizeProject(project) {
  // Older projects stored one scene directly in project.objects.
  const sourceLevels = Array.isArray(project.levels) && project.levels.length
    ? project.levels
    : [{ id: 'level-1', name: 'Уровень 1', objects: project.objects }];
  const levels = sourceLevels.map(normalizeLevel);
  const activeLevelId = levels.some(level => level.id === project.activeLevelId)
    ? project.activeLevelId
    : levels[0].id;
  return {
    ...project,
    id: String(project.id || makeId()),
    name: String(project.name || 'Новая игра'),
    template: 'topdown',
    description: String(project.description || 'Моя первая игра'),
    levels,
    activeLevelId
  };
}

function readProjects() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(current)) return current.map(normalizeProject);
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '[]');
    return Array.isArray(legacy) ? legacy.map(normalizeProject) : [];
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

function objectLabel(type) {
  return type === 'player' ? 'Персонаж' : type === 'crystal' ? 'Предмет' : type === 'exit' ? 'Выход с уровня' : 'Препятствие';
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
            <p>Бесплатная среда для создания 2D-игр. Создай проект, расставляй объекты на сцене и проверяй игру.</p>
          </div>
          <span class="studio-status"><i></i> РЕДАКТОР В РАЗРАБОТКЕ</span>
        </header>
        <section class="studio-start-panel">
          <div class="studio-panel-copy">
            <span class="studio-kicker">НОВЫЙ ПРОЕКТ</span>
            <h2>С чего начнём?</h2>
            <p>Пока доступен базовый шаблон 2D-игры с видом сверху. Другие типы игр добавим после укрепления редактора.</p>
          </div>
          <form class="studio-create-form">
            <label>Название игры<input name="name" maxlength="48" placeholder="Например, Тайна леса" required></label>
            <label>Стартовый шаблон
              <select name="template"><option value="topdown">2D — вид сверху</option></select>
            </label>
            <button class="studio-primary-button" type="submit"><span>＋</span> Создать проект</button>
          </form>
        </section>
        <div class="studio-section-title"><div><span class="studio-kicker">ТВОЯ РАБОТА</span><h2>Мои проекты</h2></div><span class="studio-project-count">${projects.length} проектов</span></div>
        <div class="studio-project-grid">
          ${projects.length ? projects.map(project => `
            <article class="studio-project-card" data-project-id="${escapeHtml(project.id)}">
              <div class="studio-project-art"><span class="studio-art-orbit"></span><span class="studio-art-player"></span><span class="studio-art-gem">◆</span><small>2D GAME</small></div>
              <div class="studio-project-info"><span class="studio-kicker">ВИД СВЕРХУ · ${project.levels.reduce((total, level) => total + level.objects.length, 0)} ОБЪЕКТОВ · ${project.levels.length} УР.</span><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.description || 'Новый игровой проект')}</p><button class="studio-open-button" data-open-project="${escapeHtml(project.id)}">Открыть редактор <span>→</span></button></div>
            </article>
          `).join('') : '<div class="studio-empty"><span>✦</span><h3>Здесь появится твоя первая игра</h3><p>Создай проект выше — и перейдём к редактору сцены.</p></div>'}
        </div>
        <p class="studio-storage-note">Проекты пока хранятся в браузере на этом устройстве. Облачное хранение подключим отдельно. Для работы редактора не требуется платный ИИ или внешний API.</p>
      </section>`;

    outlet.querySelector('.studio-create-form').addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      const name = form.elements.name.value.trim();
      if (!name) return;
      const project = normalizeProject({
        id: makeId(), name, template: 'topdown',
        description: 'Найди кристалл и собери очки.',
        createdAt: Date.now(), levels: [{ id: makeId(), name: 'Уровень 1', objects: defaultObjects() }]
      });
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
    activeProject = normalizeProject(activeProject);
    renderEditor();
  }

  function renderEditor() {
    const previousEditor = document.querySelector('.studio-editor-screen');
    if (previousEditor) {
      try { screen.orientation?.unlock?.(); } catch {}
      if (document.fullscreenElement === previousEditor) {
        try { document.exitFullscreen?.().catch?.(() => {}); } catch {}
      }
      previousEditor.remove();
    }
    const project = activeProject;
    let activeLevel = project.levels.find(level => level.id === project.activeLevelId) || project.levels[0];
    let mode = 'edit';
    let selectedId = activeLevel.objects.find(item => item.type === 'player')?.id || activeLevel.objects[0]?.id;
    let runtimePlayer = null;
    let runtimeObjects = null;
    let score = 0;
    let won = false;
    let gameMessage = '';
    let keys = new Set();
    const touchPointers = new Map();
    let frame = 0;
    let drag = null;
    let animationPreview = false;
    let animationDirectionEditor = 'idle';
    let runtimeDirection = 'down';
    let runtimeMoving = false;

    outlet.innerHTML = `
      <section class="screen studio-screen studio-editor-screen">
        <div class="studio-editor-topbar">
          <button class="studio-back-button" type="button">← Все проекты</button>
          <div class="studio-editor-project-name"><span class="studio-live-dot"></span><strong>${escapeHtml(project.name)}</strong><small class="studio-save-status">ЛОКАЛЬНЫЙ ПРОЕКТ</small></div>
          <button class="studio-save-button" type="button">Сохранить</button>
        </div>
        <header class="studio-editor-heading"><div><span class="studio-kicker">РАБОЧЕЕ ПРОСТРАНСТВО</span><h1>${escapeHtml(project.name)}</h1><p>Добавляй объекты, перемещай их по сцене, меняй свойства и запускай тест игры.</p></div><span class="studio-status"><i></i> 2D · ВИД СВЕРХУ</span></header>
        <div class="studio-level-manager">
          <div class="studio-level-heading"><span class="studio-kicker">СТРУКТУРА ИГРЫ</span><strong>Уровни</strong></div>
          <div class="studio-level-controls">
            <select class="studio-level-select" aria-label="Выбрать уровень">
              ${project.levels.map(level => `<option value="${escapeHtml(level.id)}" ${level.id === activeLevel.id ? 'selected' : ''}>${escapeHtml(level.name)}</option>`).join('')}
            </select>
            <button type="button" class="studio-level-add">＋ Новый уровень</button>
            <button type="button" class="studio-level-rename">Переименовать</button>
            <button type="button" class="studio-level-duplicate">Копировать</button>
            <button type="button" class="studio-level-delete" ${project.levels.length <= 1 ? 'disabled' : ''}>Удалить</button>
          </div>
        </div>
        <section class="studio-audio-manager">
          <div class="studio-level-heading"><span class="studio-kicker">ЗВУКОВОЕ ОФОРМЛЕНИЕ</span><strong>Аудио уровня</strong></div>
          <div class="studio-audio-controls">
            <div class="studio-audio-item">
              <div><strong>Фоновая музыка</strong><small class="studio-music-status">Не загружена</small></div>
              <button type="button" class="studio-music-upload">＋ Музыка</button>
              <input class="studio-music-input" type="file" accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/mp4,audio/webm,.mp3,.ogg,.wav,.m4a,.webm" hidden>
              <button type="button" class="studio-music-remove" hidden>Убрать</button>
            </div>
            <div class="studio-audio-item">
              <div><strong>Звук предмета</strong><small class="studio-sound-status">Не загружен</small></div>
              <button type="button" class="studio-sound-upload">＋ Звук</button>
              <input class="studio-sound-input" type="file" accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/mp4,audio/webm,.mp3,.ogg,.wav,.m4a,.webm" hidden>
              <button type="button" class="studio-sound-remove" hidden>Убрать</button>
            </div>
          </div>
          <p class="studio-audio-hint">Музыка играет в тесте уровня, звук срабатывает при сборе предмета. MP3, OGG, WAV, M4A или WebM.</p>
        </section>
        <div class="studio-mode-switch" role="group" aria-label="Режим редактора">
          <button class="is-active" type="button" data-mode="edit">✥ Редактор сцены</button>
          <button type="button" data-mode="test">▶ Тест игры</button>
        </div>
        <div class="studio-workspace studio-visual-workspace">
          <aside class="studio-object-panel">
            <div class="studio-inspector-title"><span class="studio-kicker">ИНСТРУМЕНТЫ</span><strong>Добавить объект</strong></div>
            <button class="studio-add-object" type="button" data-add="player"><span class="studio-object-symbol player">■</span> Персонаж</button>
            <button class="studio-add-object" type="button" data-add="crystal"><span class="studio-object-symbol crystal">◆</span> Предмет</button>
            <button class="studio-add-object" type="button" data-add="wall"><span class="studio-object-symbol wall">▰</span> Препятствие</button>
            <button class="studio-add-object" type="button" data-add="exit"><span class="studio-object-symbol exit">◎</span> Выход</button>
            <div class="studio-inspector-divider"></div>
            <div class="studio-inspector-title"><span class="studio-kicker">СЦЕНА</span><strong>Объекты <span class="studio-object-count">${activeLevel.objects.length}</span></strong></div>
            <div class="studio-object-list"></div>
            <p class="studio-tool-hint">Выбери объект в списке или коснись его на сцене, чтобы изменить.</p>
          </aside>
          <section class="studio-preview-panel">
            <div class="studio-panel-toolbar"><div><span class="studio-kicker">СЦЕНА</span><strong class="studio-canvas-mode-label">Редактирование уровня</strong></div><div class="studio-scene-toolbar"><span class="studio-resolution">640 × 360</span><button type="button" class="studio-background-button">▧ Фон уровня</button><input class="studio-background-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden></div></div>
            <div class="studio-canvas-wrap"><canvas class="studio-game-canvas" width="640" height="360" tabindex="0" aria-label="Сцена игры"></canvas><div class="studio-game-overlay">REBUNAR STUDIO</div></div>
            <div class="studio-game-controls">
              <span class="studio-hint studio-edit-hint">Перетаскивай объекты пальцем или мышью</span>
              <span class="studio-hint studio-test-hint" hidden>Управление: WASD / стрелки · Собери предметы и найди выход</span>
              <div class="studio-touch-pad"><button data-dir="up" aria-label="Вверх">↑</button><div><button data-dir="left" aria-label="Влево">←</button><button data-dir="down" aria-label="Вниз">↓</button><button data-dir="right" aria-label="Вправо">→</button></div></div>
              <button class="studio-reset-button" type="button">↻ Сбросить тест</button>
            </div>
          </section>
          <aside class="studio-inspector">
            <div class="studio-inspector-title"><span class="studio-kicker">СВОЙСТВА</span><strong class="studio-selected-title">Выбери объект</strong></div>
            <div class="studio-inspector-fields"></div>
            <div class="studio-inspector-actions"></div>
            <div class="studio-inspector-divider"></div>
            <div class="studio-inspector-title"><span class="studio-kicker">ПРОЕКТ</span><strong>Описание игры</strong></div>
            <label class="studio-field">Название<input class="studio-name-input" maxlength="48" value="${escapeHtml(project.name)}"></label>
            <label class="studio-field">Описание<textarea class="studio-description-input" rows="3" maxlength="500">${escapeHtml(project.description || '')}</textarea></label>
          </aside>
        </div>
        <p class="studio-editor-footnote">Первая ступень визуального редактора: объекты и их свойства. Проект сохраняется локально на этом устройстве.</p>
      </section>`;

    const editorScreen = outlet.querySelector('.studio-editor-screen');
    const compactEditor = window.matchMedia('(max-width: 900px)').matches || (navigator.maxTouchPoints || 0) > 0;
    // Mount the editor outside the social-feed shell as a dedicated workspace.
    document.body.classList.add('rebunar-studio-active');
    document.body.appendChild(editorScreen);

    if (compactEditor) {
      editorScreen.classList.add('studio-mobile-editor');
      const orientationHint = document.createElement('p');
      orientationHint.className = 'studio-orientation-hint';
      orientationHint.textContent = 'Для удобной работы поверни телефон горизонтально.';
      editorScreen.querySelector('.studio-editor-topbar').after(orientationHint);
      // Fullscreen is required by many Android browsers before they allow landscape locking.
      try {
        const fullscreenRequest = editorScreen.requestFullscreen
          ? editorScreen.requestFullscreen({ navigationUI: 'hide' })
          : Promise.reject(new Error('Fullscreen is unavailable'));
        Promise.resolve(fullscreenRequest).catch(() => {}).then(() => {
          try { return screen.orientation?.lock?.('landscape'); } catch { return null; }
        }).catch(() => {});
      } catch {}
    }
    function releaseEditorDisplay() {
      try { screen.orientation?.unlock?.(); } catch {}
      if (document.fullscreenElement === editorScreen) {
        try { document.exitFullscreen?.().catch?.(() => {}); } catch {}
      }
      editorScreen.remove();
      document.body.classList.remove('rebunar-studio-active');
    }
    const canvas = outlet.querySelector('.studio-game-canvas');
    const ctx = canvas.getContext('2d');
    let musicPlayer = null;
    let soundPlayer = null;
    let soundPlayerData = '';
    function stopLevelAudio() {
      if (musicPlayer) { musicPlayer.pause(); musicPlayer.currentTime = 0; musicPlayer = null; }
      if (soundPlayer) { soundPlayer.pause(); soundPlayer.currentTime = 0; soundPlayer = null; }
      soundPlayerData = '';
    }
    function startLevelMusic() {
      if (!activeLevel.musicData) return;
      if (!musicPlayer) { musicPlayer = new Audio(activeLevel.musicData); musicPlayer.loop = true; musicPlayer.volume = 0.35; }
      musicPlayer.play().catch(() => {});
    }
    function playCollectSound() {
      if (!activeLevel.collectSoundData) return;
      if (!soundPlayer || soundPlayerData !== activeLevel.collectSoundData) {
        soundPlayer = new Audio(activeLevel.collectSoundData);
        soundPlayer.volume = 0.7;
        soundPlayerData = activeLevel.collectSoundData;
      }
      soundPlayer.currentTime = 0;
      soundPlayer.play().catch(() => {});
    }
    const assetImageCache = new Map();
    function cacheImage(data) {
      if (!data) return null;
      if (!assetImageCache.has(data)) {
        const image = new Image();
        image.onload = () => draw();
        image.src = data;
        assetImageCache.set(data, image);
      }
      return assetImageCache.get(data);
    }
    function compressImageFile(file) {
      return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) return reject(new Error('Выбери файл изображения.'));
        if (file.size > 8 * 1024 * 1024) return reject(new Error('Исходный файл слишком большой. Максимум — 8 МБ.'));
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
        reader.onload = () => {
          const image = new Image();
          image.onerror = () => reject(new Error('Файл изображения повреждён или не поддерживается.'));
          image.onload = () => {
            const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
            const width = Math.max(1, Math.round(image.naturalWidth * scale));
            const height = Math.max(1, Math.round(image.naturalHeight * scale));
            const bitmap = document.createElement('canvas');
            bitmap.width = width; bitmap.height = height;
            const bitmapContext = bitmap.getContext('2d');
            bitmapContext.drawImage(image, 0, 0, width, height);
            const data = bitmap.toDataURL('image/webp', 0.78);
            if (data.length > 700000) return reject(new Error('После сжатия изображение всё ещё слишком большое. Выбери картинку попроще.'));
            resolve(data);
          };
          image.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }
    function canStoreAudio(targetProject, nextData, replacedData = '') {
      let totalAssets = 0;
      let totalAudio = 0;
      targetProject.levels.forEach(level => {
        const levelAudio = (level.musicData || '').length + (level.collectSoundData || '').length;
        totalAudio += levelAudio;
        totalAssets += levelAudio + (level.backgroundImage || '').length;
        level.objects.forEach(object => { totalAssets += (object.imageData || '').length; });
      });
      totalAudio -= replacedData.length;
      totalAssets -= replacedData.length;
      return totalAudio + nextData.length <= 900000 && totalAssets + nextData.length <= 3200000;
    }
    function readAudioFile(file) {
      return new Promise((resolve, reject) => {
        const allowed = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/webm', 'audio/x-m4a'];
        const extensionOk = /\.(mp3|ogg|wav|m4a|webm)$/i.test(file.name || '');
        if (!allowed.includes(file.type) && !extensionOk) return reject(new Error('Формат не поддерживается. Выбери MP3, OGG, WAV, M4A или WebM.'));
        if (file.size > 2 * 1024 * 1024) return reject(new Error('Аудиофайл слишком большой. Максимум — 2 МБ.'));
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Не удалось прочитать аудиофайл.'));
        reader.onload = () => {
          const data = String(reader.result || '');
          if (!data.startsWith('data:audio/')) return reject(new Error('Браузер не распознал аудиофайл.'));
          if (data.length > 460000) return reject(new Error('После чтения файл слишком большой для локального проекта. Выбери аудио до 330 КБ.'));
          resolve(data);
        };
        reader.readAsDataURL(file);
      });
    }
    function canStoreImage(targetProject, nextData, replacedData = '') {
      let total = 0;
      targetProject.levels.forEach(level => {
        total += (level.backgroundImage || '').length + (level.musicData || '').length + (level.collectSoundData || '').length;
        level.objects.forEach(object => { total += (object.imageData || '').length + (object.animationFrames || []).reduce((sum, frame) => sum + frame.length, 0) + ANIMATION_STATES.reduce((sum, state) => sum + (object.directionalAnimations?.[state] || []).reduce((frameSum, frame) => frameSum + frame.length, 0), 0); });
      });
      total -= replacedData.length;
      return total + nextData.length <= 3200000;
    }
    const objectList = outlet.querySelector('.studio-object-list');
    const inspectorFields = outlet.querySelector('.studio-inspector-fields');
    const inspectorActions = outlet.querySelector('.studio-inspector-actions');
    const saveStatus = outlet.querySelector('.studio-save-status');
    const modeButtons = outlet.querySelectorAll('[data-mode]');

    function selectedObject() {
      return activeLevel.objects.find(item => item.id === selectedId) || null;
    }

    function markDirty() {
      saveStatus.textContent = 'ЕСТЬ ИЗМЕНЕНИЯ';
      saveStatus.classList.add('is-dirty');
    }

    function saveProject(showConfirmation = true) {
      project.name = outlet.querySelector('.studio-name-input').value.trim() || 'Новая игра';
      project.description = outlet.querySelector('.studio-description-input').value.trim();
      projects = projects.map(item => item.id === project.id ? project : item);
      if (!writeProjects(projects)) {
        alert('Не удалось сохранить проект. Возможно, в браузере недостаточно места.');
        return false;
      }
      saveStatus.textContent = 'СОХРАНЕНО ЛОКАЛЬНО';
      saveStatus.classList.remove('is-dirty');
      outlet.querySelector('.studio-editor-heading h1').textContent = project.name;
      outlet.querySelector('.studio-editor-project-name strong').textContent = project.name;
      if (showConfirmation) {
        const button = outlet.querySelector('.studio-save-button');
        button.textContent = '✓ Сохранено';
        setTimeout(() => { if (button.isConnected) button.textContent = 'Сохранить'; }, 1300);
      }
      return true;
    }

    function renderObjectList() {
      objectList.innerHTML = activeLevel.objects.map(item => `
        <button type="button" class="studio-object-row ${item.id === selectedId ? 'is-selected' : ''}" data-select-object="${escapeHtml(item.id)}">
          <span class="studio-object-symbol ${item.type}">${item.type === 'player' ? '■' : item.type === 'crystal' ? '◆' : item.type === 'exit' ? '◎' : '▰'}</span>
          <span><strong>${escapeHtml(item.name)}</strong><small>${objectLabel(item.type)}</small></span>
          <span class="studio-object-row-arrow">›</span>
        </button>`).join('') || '<p class="studio-no-objects">На сцене пока нет объектов.</p>';
      outlet.querySelector('.studio-object-count').textContent = activeLevel.objects.length;
      objectList.querySelectorAll('[data-select-object]').forEach(button => {
        button.addEventListener('click', () => {
          selectedId = button.dataset.selectObject;
          renderObjectList();
          renderInspector();
          draw();
        });
      });
    }

    function renderInspector() {
      const item = selectedObject();
      outlet.querySelector('.studio-selected-title').textContent = item ? item.name : 'Выбери объект';
      if (!item) {
        inspectorFields.innerHTML = '<p class="studio-no-objects">Выбери объект на сцене или добавь новый.</p>';
        inspectorActions.innerHTML = '';
        return;
      }
      inspectorFields.innerHTML = `
        <label class="studio-field">Название<input class="studio-object-name" maxlength="32" value="${escapeHtml(item.name)}"></label>
        <div class="studio-coordinate-grid">
          <label class="studio-field">X<input class="studio-object-x" type="number" min="12" max="628" value="${Math.round(item.x)}"></label>
          <label class="studio-field">Y<input class="studio-object-y" type="number" min="12" max="348" value="${Math.round(item.y)}"></label>
        </div>
        <label class="studio-field">Размер <output class="studio-size-value">${Math.round(item.size)}</output><input class="studio-object-size" type="range" min="8" max="80" step="1" value="${Math.round(item.size)}"></label>
        <label class="studio-field">Цвет<input class="studio-object-color" type="color" value="${item.color}"></label>
        <div class="studio-asset-controls">
          <span class="studio-kicker">ИЗОБРАЖЕНИЕ ОБЪЕКТА</span>
          <button type="button" class="studio-asset-upload">${item.imageData ? 'Заменить изображение' : '＋ Загрузить изображение'}</button>
          <input class="studio-object-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
          ${item.imageData ? '<button type="button" class="studio-asset-remove">Убрать изображение</button>' : ''}
          <small>PNG, JPG или WebP. Картинка будет подогнана под размер объекта.</small>
        </div>
        <div class="studio-animation-controls">
          <span class="studio-kicker">КАДРОВАЯ АНИМАЦИЯ</span>
          <div class="studio-animation-toolbar">
            <button type="button" class="studio-animation-upload">＋ Добавить кадры</button>
            <input class="studio-animation-input" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden>
            <button type="button" class="studio-animation-preview">${animationPreview ? 'Остановить' : '▶ Просмотр'}</button>
          </div>
          <label class="studio-field">Скорость: <output class="studio-animation-speed-value">${item.animationSpeed}</output> мс/кадр<input class="studio-animation-speed" type="range" min="80" max="1000" step="20" value="${item.animationSpeed}"></label>
          <div class="studio-animation-frames">${item.animationFrames.map((frame, index) => `<div class="studio-animation-frame"><img src="${frame}" alt="Кадр ${index + 1}"><span>${index + 1}</span><button type="button" data-remove-frame="${index}" aria-label="Удалить кадр ${index + 1}">×</button></div>`).join('') || '<small>Кадры не добавлены. Можно загрузить до 4 изображений.</small>'}</div>
          <small>Загрузи 2–4 изображения одного персонажа в разных позах. Кадры будут проигрываться по кругу. Общий лимит ресурсов проекта — около 3,2 МБ.</small>
        </div>
        ${item.type === 'player' ? `
        <div class="studio-animation-controls studio-directional-controls">
          <span class="studio-kicker">АНИМАЦИЯ ПЕРСОНАЖА ПО НАПРАВЛЕНИЯМ</span>
          <label class="studio-field">Состояние
            <select class="studio-direction-select">
              <option value="idle" ${animationDirectionEditor === 'idle' ? 'selected' : ''}>Покой</option>
              <option value="up" ${animationDirectionEditor === 'up' ? 'selected' : ''}>Движение вверх</option>
              <option value="down" ${animationDirectionEditor === 'down' ? 'selected' : ''}>Движение вниз</option>
              <option value="left" ${animationDirectionEditor === 'left' ? 'selected' : ''}>Движение влево</option>
              <option value="right" ${animationDirectionEditor === 'right' ? 'selected' : ''}>Движение вправо</option>
            </select>
          </label>
          <div class="studio-animation-toolbar">
            <button type="button" class="studio-direction-upload">＋ Кадры состояния</button>
            <input class="studio-direction-input" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden>
            <span class="studio-direction-count">${(item.directionalAnimations?.[animationDirectionEditor] || []).length}/4</span>
          </div>
          <div class="studio-animation-frames studio-direction-frames">${(item.directionalAnimations?.[animationDirectionEditor] || []).map((frame, index) => `<div class="studio-animation-frame"><img src="${frame}" alt="Кадр ${index + 1}"><span>${index + 1}</span><button type="button" data-remove-direction-frame="${index}" aria-label="Удалить кадр ${index + 1}">×</button></div>`).join('') || '<small>Для этого состояния кадры ещё не добавлены.</small>'}</div>
          <small>Добавляй до 4 кадров отдельно для каждого состояния. Если кадров нет, используется обычное изображение или общая анимация.</small>
        </div>` : ''}
      `;
      inspectorActions.innerHTML = `
        <button type="button" class="studio-secondary-action" data-duplicate>＋ Дублировать</button>
        <button type="button" class="studio-danger-action" data-delete ${item.type === 'player' ? 'disabled title="Игрок должен оставаться на сцене"' : ''}>Удалить объект</button>`;

      const bind = (selector, eventName, callback) => {
        const input = inspectorFields.querySelector(selector);
        input.addEventListener(eventName, () => {
          callback(input);
          markDirty();
          draw();
          if (selector === '.studio-object-name') {
            outlet.querySelector('.studio-selected-title').textContent = item.name;
            renderObjectList();
          }
        });
      };
      bind('.studio-object-name', 'input', input => { item.name = input.value; });
      bind('.studio-object-x', 'change', input => { item.x = clamp(Number(input.value) || 12, 12, 628); input.value = Math.round(item.x); });
      bind('.studio-object-y', 'change', input => { item.y = clamp(Number(input.value) || 12, 12, 348); input.value = Math.round(item.y); });
      bind('.studio-object-size', 'input', input => { item.size = Number(input.value); inspectorFields.querySelector('.studio-size-value').textContent = input.value; });
      bind('.studio-object-color', 'input', input => { item.color = input.value; });
      inspectorFields.querySelector('.studio-asset-upload').addEventListener('click', () => inspectorFields.querySelector('.studio-object-image-input').click());
      if (item.type === 'player') {
        if (!item.directionalAnimations) item.directionalAnimations = Object.fromEntries(ANIMATION_STATES.map(state => [state, []]));
        inspectorFields.querySelector('.studio-direction-select').addEventListener('change', event => {
          animationDirectionEditor = event.target.value;
          renderInspector();
        });
        inspectorFields.querySelector('.studio-direction-upload').addEventListener('click', () => inspectorFields.querySelector('.studio-direction-input').click());
        inspectorFields.querySelector('.studio-direction-input').addEventListener('change', async event => {
          const frames = item.directionalAnimations[animationDirectionEditor] || (item.directionalAnimations[animationDirectionEditor] = []);
          const files = Array.from(event.target.files || []).slice(0, Math.max(0, 4 - frames.length));
          try {
            for (const file of files) {
              const data = await compressImageFile(file);
              if (!canStoreImage(project, data)) { alert('Не хватает места для кадров. Удали другие ресурсы или выбери изображения меньшего размера.'); break; }
              frames.push(data);
            }
            markDirty(); renderInspector(); draw();
          } catch (error) { alert(error.message || 'Не удалось загрузить кадры.'); }
          event.target.value = '';
        });
        inspectorFields.querySelectorAll('[data-remove-direction-frame]').forEach(button => button.addEventListener('click', () => {
          item.directionalAnimations[animationDirectionEditor].splice(Number(button.dataset.removeDirectionFrame), 1);
          renderInspector(); markDirty(); draw();
        }));
      }
      inspectorFields.querySelector('.studio-animation-upload').addEventListener('click', () => inspectorFields.querySelector('.studio-animation-input').click());
      inspectorFields.querySelector('.studio-animation-input').addEventListener('change', async event => {
        const files = Array.from(event.target.files || []).slice(0, Math.max(0, 4 - item.animationFrames.length));
        if (!files.length) { event.target.value = ''; return; }
        try {
          for (const file of files) {
            const data = await compressImageFile(file);
            if (!canStoreImage(project, data)) { alert('Не хватает места для кадра. Удали другие ресурсы или выбери изображения меньшего размера.'); break; }
            item.animationFrames.push(data);
          }
          animationPreview = item.animationFrames.length > 1;
          markDirty(); renderInspector(); draw();
        } catch (error) { alert(error.message || 'Не удалось загрузить кадры.'); }
        event.target.value = '';
      });
      inspectorFields.querySelector('.studio-animation-speed').addEventListener('input', event => {
        item.animationSpeed = Number(event.target.value);
        inspectorFields.querySelector('.studio-animation-speed-value').textContent = item.animationSpeed;
        markDirty(); draw();
      });
      inspectorFields.querySelector('.studio-animation-preview').addEventListener('click', () => {
        animationPreview = !animationPreview;
        inspectorFields.querySelector('.studio-animation-preview').textContent = animationPreview ? 'Остановить' : '▶ Просмотр';
        draw();
      });
      inspectorFields.querySelectorAll('[data-remove-frame]').forEach(button => button.addEventListener('click', () => {
        item.animationFrames.splice(Number(button.dataset.removeFrame), 1);
        if (item.animationFrames.length < 2) animationPreview = false;
        renderInspector(); markDirty(); draw();
      }));
      inspectorFields.querySelector('.studio-object-image-input').addEventListener('change', async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const data = await compressImageFile(file);
          if (!canStoreImage(project, data, item.imageData)) {
            alert('В проекте достигнут общий лимит ресурсов (около 3,2 МБ). Удали ненужные изображения или аудиофайлы.');
            event.target.value = '';
            return;
          }
          item.imageData = data;
          cacheImage(data);
          markDirty(); renderInspector(); draw();
        } catch (error) {
          alert(error.message || 'Не удалось загрузить изображение.');
        }
        event.target.value = '';
      });
      inspectorFields.querySelector('.studio-asset-remove')?.addEventListener('click', () => {
        item.imageData = '';
        renderInspector(); markDirty(); draw();
      });
      inspectorActions.querySelector('[data-duplicate]')?.addEventListener('click', () => {
        const copy = { ...item, animationFrames: [...(item.animationFrames || [])], directionalAnimations: Object.fromEntries(ANIMATION_STATES.map(state => [state, [...(item.directionalAnimations?.[state] || [])]])), id: makeId(), name: item.name + ' копия', x: clamp(item.x + 36, 12, 628), y: clamp(item.y + 30, 12, 348) };
        activeLevel.objects.push(copy);
        selectedId = copy.id;
        markDirty(); renderObjectList(); renderInspector(); draw();
      });
      inspectorActions.querySelector('[data-delete]')?.addEventListener('click', () => {
        if (item.type === 'player') return;
        activeLevel.objects = activeLevel.objects.filter(object => object.id !== item.id);
        selectedId = activeLevel.objects[0]?.id || null;
        markDirty(); renderObjectList(); renderInspector(); draw();
      });
    }

    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

    function addObject(type) {
      if (mode !== 'edit') return;
      const config = type === 'player'
        ? { type, name: 'Персонаж', size: 26, color: DEFAULT_COLOR }
        : type === 'crystal'
          ? { type, name: 'Предмет', size: 16, color: '#f5d66b' }
          : type === 'exit'
            ? { type, name: 'Выход', size: 30, color: '#62e5c1' }
            : { type: 'wall', name: 'Препятствие', size: 44, color: '#64747a' };
      const item = { id: makeId(), ...config, x: 280 + Math.random() * 80, y: 130 + Math.random() * 90 };
      activeLevel.objects.push(item);
      selectedId = item.id;
      markDirty(); renderObjectList(); renderInspector(); draw();
    }

    function draw() {
      if (!canvas.isConnected) return;
      ctx.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
      ctx.fillStyle = '#10191a';
      ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
      if (activeLevel.backgroundImage) {
        const background = cacheImage(activeLevel.backgroundImage);
        if (background?.complete && background.naturalWidth) {
          const scale = Math.max(SCENE_WIDTH / background.naturalWidth, SCENE_HEIGHT / background.naturalHeight);
          const width = background.naturalWidth * scale;
          const height = background.naturalHeight * scale;
          ctx.drawImage(background, (SCENE_WIDTH - width) / 2, (SCENE_HEIGHT - height) / 2, width, height);
        }
      }
      if (mode === 'edit') {
        ctx.strokeStyle = 'rgba(93,190,154,.13)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= SCENE_WIDTH; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SCENE_HEIGHT); ctx.stroke(); }
        for (let y = 0; y <= SCENE_HEIGHT; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SCENE_WIDTH, y); ctx.stroke(); }
      }
      const sceneObjects = mode === 'test' && runtimeObjects ? runtimeObjects : activeLevel.objects;
      sceneObjects.forEach(item => {
        if (mode === 'test' && item.collected) return;
        const isSelected = mode === 'edit' && item.id === selectedId;
        const frames = Array.isArray(item.animationFrames) ? item.animationFrames : [];
        const shouldAnimate = frames.length > 1 && (mode === 'test' || (mode === 'edit' && animationPreview));
        const animationIndex = shouldAnimate ? Math.floor(performance.now() / (item.animationSpeed || 180)) % frames.length : 0;
        const directionalFrames = mode === 'test' && item.type === 'player' ? (item.directionalAnimations?.[runtimeMoving ? runtimeDirection : 'idle'] || []) : [];
        const activeFrames = directionalFrames.length ? directionalFrames : frames;
        const animateActiveFrames = activeFrames.length > 1 && (mode === 'test' ? (item.type !== 'player' || runtimeMoving || directionalFrames.length > 0) : shouldAnimate);
        const activeIndex = animateActiveFrames ? Math.floor(performance.now() / (item.animationSpeed || 180)) % activeFrames.length : 0;
        const imageData = activeFrames.length ? activeFrames[activeIndex] : (shouldAnimate ? frames[animationIndex] : item.imageData);
        const objectImage = imageData ? cacheImage(imageData) : null;
        const drawX = mode === 'test' && item.type === 'player' && runtimePlayer ? runtimePlayer.x : item.x;
        const drawY = mode === 'test' && item.type === 'player' && runtimePlayer ? runtimePlayer.y : item.y;
        if (objectImage?.complete && objectImage.naturalWidth) {
          ctx.save();
          if (item.type === 'wall') {
            ctx.drawImage(objectImage, drawX - item.size, drawY - item.size / 2, item.size * 2, item.size);
          } else {
            ctx.drawImage(objectImage, drawX - item.size / 2, drawY - item.size / 2, item.size, item.size);
          }
          ctx.restore();
        } else if (item.type === 'wall') {
          ctx.fillStyle = item.color;
          ctx.fillRect(item.x - item.size, item.y - item.size / 2, item.size * 2, item.size);
          ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.strokeRect(item.x - item.size, item.y - item.size / 2, item.size * 2, item.size);
        } else if (item.type === 'crystal') {
          ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(Math.PI / 4);
          ctx.fillStyle = item.color; ctx.shadowColor = item.color; ctx.shadowBlur = 12;
          ctx.fillRect(-item.size / 1.4, -item.size / 1.4, item.size * 1.4, item.size * 1.4); ctx.restore();
        } else if (item.type === 'exit') {
          ctx.save(); ctx.translate(item.x, item.y);
          ctx.strokeStyle = item.color; ctx.lineWidth = 5; ctx.shadowColor = item.color; ctx.shadowBlur = 15;
          ctx.beginPath(); ctx.arc(0, 0, item.size / 2, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, item.size / 3, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        } else {
          ctx.fillStyle = item.color; ctx.shadowColor = item.color; ctx.shadowBlur = 16;
          ctx.fillRect(drawX - item.size / 2, drawY - item.size / 2, item.size, item.size); ctx.shadowBlur = 0;
        }
        if (isSelected) {
          ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
          if (item.type === 'wall') ctx.strokeRect(item.x - item.size - 5, item.y - item.size / 2 - 5, item.size * 2 + 10, item.size + 10);
          else ctx.strokeRect(item.x - item.size / 2 - 5, item.y - item.size / 2 - 5, item.size + 10, item.size + 10);
          ctx.setLineDash([]); ctx.restore();
        }
      });
      if (mode === 'test') {
        ctx.fillStyle = '#e9f3ef'; ctx.font = 'bold 14px system-ui'; ctx.fillText('СОБРАНО: ' + score, 18, 26);
        ctx.fillStyle = 'rgba(230,240,236,.75)'; ctx.font = '12px system-ui';
        ctx.fillText(gameMessage || 'Собери предметы и найди выход', 18, 346);
        if (won) {
          ctx.fillStyle = 'rgba(4,12,13,.78)'; ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
          ctx.textAlign = 'center'; ctx.fillStyle = '#70efbd'; ctx.font = 'bold 34px system-ui';
          ctx.fillText('УРОВЕНЬ ПРОЙДЕН!', SCENE_WIDTH / 2, SCENE_HEIGHT / 2 - 8);
          ctx.fillStyle = '#e9f3ef'; ctx.font = '15px system-ui';
          ctx.fillText('Предметов собрано: ' + score, SCENE_WIDTH / 2, SCENE_HEIGHT / 2 + 24);
          ctx.textAlign = 'start';
        }
      }
    }

    function hitTest(x, y) {
      for (let index = activeLevel.objects.length - 1; index >= 0; index--) {
        const item = activeLevel.objects[index];
        if (item.type === 'wall') {
          if (x >= item.x - item.size && x <= item.x + item.size && y >= item.y - item.size / 2 && y <= item.y + item.size / 2) return item;
        } else if (Math.abs(x - item.x) <= item.size / 2 + 5 && Math.abs(y - item.y) <= item.size / 2 + 5) return item;
      }
      return null;
    }

    function canvasPoint(event) {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * SCENE_WIDTH / rect.width, y: (event.clientY - rect.top) * SCENE_HEIGHT / rect.height };
    }

    canvas.addEventListener('pointerdown', event => {
      if (mode !== 'edit') return;
      const point = canvasPoint(event);
      const item = hitTest(point.x, point.y);
      selectedId = item?.id || null;
      if (item) {
        drag = { id: item.id, dx: point.x - item.x, dy: point.y - item.y };
        canvas.setPointerCapture?.(event.pointerId);
      }
      renderObjectList(); renderInspector(); draw();
    });
    canvas.addEventListener('pointermove', event => {
      if (mode !== 'edit' || !drag) return;
      const item = activeLevel.objects.find(object => object.id === drag.id);
      if (!item) return;
      const point = canvasPoint(event);
      item.x = clamp(point.x - drag.dx, item.type === 'wall' ? item.size : item.size / 2, SCENE_WIDTH - (item.type === 'wall' ? item.size : item.size / 2));
      item.y = clamp(point.y - drag.dy, item.size / 2, SCENE_HEIGHT - item.size / 2);
      const xInput = inspectorFields.querySelector('.studio-object-x');
      const yInput = inspectorFields.querySelector('.studio-object-y');
      if (xInput) xInput.value = Math.round(item.x);
      if (yInput) yInput.value = Math.round(item.y);
      markDirty(); draw();
    });
    const stopDrag = () => { drag = null; };
    canvas.addEventListener('pointerup', stopDrag);
    canvas.addEventListener('pointercancel', stopDrag);

    function setMode(nextMode) {
      mode = nextMode;
      keys.clear();
      drag = null;
      modeButtons.forEach(button => button.classList.toggle('is-active', button.dataset.mode === mode));
      outlet.querySelector('.studio-canvas-mode-label').textContent = mode === 'edit' ? 'Редактирование уровня' : 'Тестирование игры';
      outlet.querySelector('.studio-edit-hint').hidden = mode !== 'edit';
      outlet.querySelector('.studio-test-hint').hidden = mode !== 'test';
      outlet.querySelector('.studio-touch-pad').classList.toggle('is-visible', mode === 'test');
      outlet.querySelector('.studio-reset-button').hidden = mode !== 'test';
      outlet.querySelectorAll('.studio-add-object').forEach(button => { button.disabled = mode !== 'edit'; });
      if (mode === 'test') {
        runtimeObjects = activeLevel.objects.map(item => ({ ...item, collected: false }));
        runtimePlayer = { ...runtimeObjects.find(item => item.type === 'player') };
        score = 0; won = false; gameMessage = ''; runtimeDirection = 'down'; runtimeMoving = false;
        startLevelMusic();
      } else {
        stopLevelAudio();
        runtimePlayer = null;
        runtimeObjects = null;
      }
      draw();
    }

    function resetTest() {
      if (mode !== 'test') return;
      runtimeObjects = activeLevel.objects.map(item => ({ ...item, collected: false }));
      const player = runtimeObjects.find(item => item.type === 'player');
      if (player) runtimePlayer = { ...player };
      score = 0; won = false; gameMessage = ''; runtimeDirection = 'down'; runtimeMoving = false; draw();
    }

    function tick() {
      if (!canvas.isConnected) {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        keys.clear();
        return;
      }
      if (mode === 'test' && runtimePlayer && !won) {
        const speed = 3;
        let nextX = runtimePlayer.x;
        let nextY = runtimePlayer.y;
        if (keys.has('ArrowUp') || keys.has('w')) nextY -= speed;
        if (keys.has('ArrowDown') || keys.has('s')) nextY += speed;
        if (keys.has('ArrowLeft') || keys.has('a')) nextX -= speed;
        if (keys.has('ArrowRight') || keys.has('d')) nextX += speed;
        const moveX = nextX - runtimePlayer.x;
        const moveY = nextY - runtimePlayer.y;
        runtimeMoving = moveX !== 0 || moveY !== 0;
        if (runtimeMoving) runtimeDirection = Math.abs(moveX) > Math.abs(moveY) ? (moveX < 0 ? 'left' : 'right') : (moveY < 0 ? 'up' : 'down');
        const half = runtimePlayer.size / 2;
        nextX = clamp(nextX, half, SCENE_WIDTH - half);
        nextY = clamp(nextY, half, SCENE_HEIGHT - half);
        const blocked = runtimeObjects.some(item => item.type === 'wall' &&
          nextX + half > item.x - item.size && nextX - half < item.x + item.size &&
          nextY + half > item.y - item.size / 2 && nextY - half < item.y + item.size / 2);
        if (!blocked) { runtimePlayer.x = nextX; runtimePlayer.y = nextY; } else { runtimeMoving = false; }
        runtimeObjects.filter(item => item.type === 'crystal' && !item.collected).forEach(item => {
          if (Math.hypot(runtimePlayer.x - item.x, runtimePlayer.y - item.y) < half + item.size) {
            score += 1;
            item.collected = true;
            playCollectSound();
          }
        });
        const exit = runtimeObjects.find(item => item.type === 'exit');
        const remaining = runtimeObjects.filter(item => item.type === 'crystal' && !item.collected).length;
        if (exit && Math.hypot(runtimePlayer.x - exit.x, runtimePlayer.y - exit.y) < half + exit.size / 2) {
          if (remaining === 0) {
            won = true; gameMessage = 'Уровень успешно завершён';
            keys.clear();
            if (musicPlayer) musicPlayer.pause();
          } else {
            gameMessage = 'Сначала собери все предметы: ' + remaining;
          }
        } else {
          gameMessage = '';
        }
        draw();
      } else if (mode === 'edit' && animationPreview) {
        draw();
      }
      frame = requestAnimationFrame(tick);
    }

    function onKeyDown(event) {
      if (mode !== 'test') return;
      if (won) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(event.key)) {
        event.preventDefault();
        keys.add(event.key.toLowerCase().startsWith('arrow') ? event.key : event.key.toLowerCase());
      }
    }
    function onKeyUp(event) {
      keys.delete(event.key.toLowerCase().startsWith('arrow') ? event.key : event.key.toLowerCase());
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    const levelSelect = outlet.querySelector('.studio-level-select');
    levelSelect.addEventListener('change', () => {
      if (mode === 'test') setMode('edit');
      stopLevelAudio();
      activeLevel = project.levels.find(level => level.id === levelSelect.value) || project.levels[0];
      project.activeLevelId = activeLevel.id;
      selectedId = activeLevel.objects.find(item => item.type === 'player')?.id || activeLevel.objects[0]?.id;
      runtimeObjects = null; runtimePlayer = null; score = 0;
      outlet.querySelector('.studio-object-count').textContent = activeLevel.objects.length;
      renderBackgroundControls();
      renderAudioControls();
      renderObjectList(); renderInspector(); draw(); markDirty();
    });
    outlet.querySelector('.studio-level-add').addEventListener('click', () => {
      if (project.levels.length >= 50) { alert('В одном проекте пока можно создать не больше 50 уровней.'); return; }
      const level = { id: makeId(), name: `Уровень ${project.levels.length + 1}`, objects: defaultObjects(), backgroundImage: '', musicData: '', collectSoundData: '' };
      project.levels.push(level);
      project.activeLevelId = level.id;
      saveProject(false);
      renderEditor();
    });
    outlet.querySelector('.studio-level-rename').addEventListener('click', () => {
      const name = prompt('Название уровня:', activeLevel.name);
      if (name === null) return;
      const trimmed = name.trim().slice(0, 40);
      if (!trimmed) { alert('Название уровня не может быть пустым.'); return; }
      activeLevel.name = trimmed;
      const selectedOption = Array.from(levelSelect.options).find(option => option.value === activeLevel.id);
      if (selectedOption) selectedOption.textContent = trimmed;
      markDirty();
    });
    outlet.querySelector('.studio-level-duplicate').addEventListener('click', () => {
      if (project.levels.length >= 50) { alert('В одном проекте пока можно создать не больше 50 уровней.'); return; }
      const copy = {
        id: makeId(),
        name: activeLevel.name + ' — копия',
        objects: activeLevel.objects.map(item => ({ ...item, animationFrames: [...(item.animationFrames || [])], directionalAnimations: Object.fromEntries(ANIMATION_STATES.map(state => [state, [...(item.directionalAnimations?.[state] || [])]])), id: makeId(), x: Math.min(SCENE_WIDTH - 20, item.x + 24), y: Math.min(SCENE_HEIGHT - 20, item.y + 20) })),
        backgroundImage: activeLevel.backgroundImage,
        musicData: activeLevel.musicData,
        collectSoundData: activeLevel.collectSoundData
      };
      project.levels.push(copy);
      project.activeLevelId = copy.id;
      saveProject(false);
      renderEditor();
    });
    outlet.querySelector('.studio-level-delete').addEventListener('click', () => {
      if (project.levels.length <= 1) return;
      if (!confirm(`Удалить «${activeLevel.name}»? Объекты этого уровня будут удалены.`)) return;
      project.levels = project.levels.filter(level => level.id !== activeLevel.id);
      activeLevel = project.levels[0];
      project.activeLevelId = activeLevel.id;
      saveProject(false);
      renderEditor();
    });

    const musicInput = outlet.querySelector('.studio-music-input');
    const soundInput = outlet.querySelector('.studio-sound-input');
    const musicUploadButton = outlet.querySelector('.studio-music-upload');
    const soundUploadButton = outlet.querySelector('.studio-sound-upload');
    function renderAudioControls() {
      outlet.querySelector('.studio-music-status').textContent = activeLevel.musicData ? 'Музыка добавлена' : 'Не загружена';
      outlet.querySelector('.studio-sound-status').textContent = activeLevel.collectSoundData ? 'Звук добавлен' : 'Не загружен';
      outlet.querySelector('.studio-music-remove').hidden = !activeLevel.musicData;
      outlet.querySelector('.studio-sound-remove').hidden = !activeLevel.collectSoundData;
      musicUploadButton.textContent = activeLevel.musicData ? 'Заменить' : '＋ Музыка';
      soundUploadButton.textContent = activeLevel.collectSoundData ? 'Заменить' : '＋ Звук';
    }
    musicUploadButton.addEventListener('click', () => musicInput.click());
    soundUploadButton.addEventListener('click', () => soundInput.click());
    musicInput.addEventListener('change', async event => {
      const file = event.target.files?.[0]; if (!file) return;
      try {
        const data = await readAudioFile(file);
        if (!canStoreAudio(project, data, activeLevel.musicData)) throw new Error('В проекте достигнут лимит аудио (около 900 КБ). Удали ненужные дорожки.');
        if (musicPlayer) { musicPlayer.pause(); musicPlayer = null; }
        activeLevel.musicData = data;
        renderAudioControls(); markDirty();
      } catch (error) { alert(error.message || 'Не удалось загрузить музыку.'); }
      event.target.value = '';
    });
    soundInput.addEventListener('change', async event => {
      const file = event.target.files?.[0]; if (!file) return;
      try {
        const data = await readAudioFile(file);
        if (!canStoreAudio(project, data, activeLevel.collectSoundData)) throw new Error('В проекте достигнут лимит аудио (около 900 КБ). Удали ненужные дорожки.');
        if (soundPlayer) { soundPlayer.pause(); soundPlayer = null; }
        activeLevel.collectSoundData = data;
        renderAudioControls(); markDirty();
      } catch (error) { alert(error.message || 'Не удалось загрузить звук.'); }
      event.target.value = '';
    });
    outlet.querySelector('.studio-music-remove').addEventListener('click', () => {
      if (musicPlayer) { musicPlayer.pause(); musicPlayer = null; }
      activeLevel.musicData = ''; renderAudioControls(); markDirty();
    });
    outlet.querySelector('.studio-sound-remove').addEventListener('click', () => {
      if (soundPlayer) { soundPlayer.pause(); soundPlayer = null; soundPlayerData = ''; }
      activeLevel.collectSoundData = ''; renderAudioControls(); markDirty();
    });
    renderAudioControls();
    const backgroundInput = outlet.querySelector('.studio-background-input');
    const backgroundButton = outlet.querySelector('.studio-background-button');
    function renderBackgroundControls() {
      outlet.querySelector('.studio-background-remove')?.remove();
      backgroundButton.textContent = activeLevel.backgroundImage ? 'Заменить фон' : '▧ Фон уровня';
      if (!activeLevel.backgroundImage) return;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'studio-background-remove';
      remove.textContent = 'Убрать фон';
      backgroundButton.after(remove);
      remove.addEventListener('click', () => {
        activeLevel.backgroundImage = '';
        renderBackgroundControls();
        markDirty(); draw();
      });
    }
    renderBackgroundControls();
    backgroundButton.addEventListener('click', () => backgroundInput.click());
    backgroundInput.addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const data = await compressImageFile(file);
        if (!canStoreImage(project, data, activeLevel.backgroundImage)) {
          alert('В проекте достигнут общий лимит ресурсов (около 3,2 МБ). Удали ненужные изображения или аудиофайлы.');
          event.target.value = '';
          return;
        }
        activeLevel.backgroundImage = data;
        cacheImage(data);
        markDirty(); draw();
        renderBackgroundControls();
      } catch (error) {
        alert(error.message || 'Не удалось загрузить фон.');
      }
      event.target.value = '';
    });
    outlet.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => addObject(button.dataset.add)));
    modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
    outlet.querySelector('.studio-reset-button').addEventListener('click', resetTest);
    outlet.querySelector('.studio-save-button').addEventListener('click', () => saveProject(true));
    outlet.querySelector('.studio-name-input').addEventListener('input', event => { project.name = event.target.value; markDirty(); });
    outlet.querySelector('.studio-description-input').addEventListener('input', event => { project.description = event.target.value; markDirty(); });
    outlet.querySelector('.studio-back-button').addEventListener('click', () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('pointerup', releaseTouchPointer);
      document.removeEventListener('pointercancel', releaseTouchPointer);
      window.removeEventListener('blur', clearMovementInput);
      releaseEditorDisplay();
      stopLevelAudio();
      cancelAnimationFrame(frame);
      saveProject(false);
      renderList();
    });

    const touchDirectionKeys = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
    function releaseTouchPointer(event) {
      const key = touchPointers.get(event.pointerId);
      if (key) keys.delete(key);
      touchPointers.delete(event.pointerId);
    }
    function clearMovementInput() {
      keys.clear();
      touchPointers.clear();
    }
    document.addEventListener('pointerup', releaseTouchPointer);
    document.addEventListener('pointercancel', releaseTouchPointer);
    window.addEventListener('blur', clearMovementInput);
    outlet.querySelectorAll('[data-dir]').forEach(button => {
      const key = touchDirectionKeys[button.dataset.dir];
      button.addEventListener('pointerdown', event => {
        if (mode !== 'test' || !key || won) return;
        event.preventDefault();
        keys.add(key);
        touchPointers.set(event.pointerId, key);
        button.classList.add('is-pressed');
      });
      button.addEventListener('pointerup', () => button.classList.remove('is-pressed'));
      button.addEventListener('pointercancel', () => button.classList.remove('is-pressed'));
    });

    renderObjectList();
    renderInspector();
    draw();
    tick();
  }

  renderList();
}
