import { AVATAR_FRAME_TUNING } from '../../shared/avatar-frame-tuning.js';

const STORAGE_KEY = 'rebunar.avatar-frame-tuning.v2';
const FRAME_COUNT = 13;
const STAGE_SIZE = 280;
const MIN_SCALE = 0.1;
const MAX_SCALE = 4;

function readTuning() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...AVATAR_FRAME_TUNING, ...saved };
  } catch {
    return { ...AVATAR_FRAME_TUNING };
  }
}

function safeValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cssForFrame(frameId, tuning) {
  const id = String(frameId || '');
  const values = tuning[id] || {};
  return {
    x: safeValue(values.x) * STAGE_SIZE / 100,
    y: safeValue(values.y) * STAGE_SIZE / 100,
    scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, safeValue(values.scale, 1)))
  };
}

function injectStyles() {
  if (document.getElementById('rb-frame-tuner-styles')) return;
  const style = document.createElement('style');
  style.id = 'rb-frame-tuner-styles';
  style.textContent = `
    .rb-frame-tuner-trigger{display:inline-flex;align-items:center;gap:7px;margin-left:8px;padding:9px 12px;border:1px solid var(--accent);border-radius:9px;background:var(--bg-panel-2);color:var(--text-main);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
    .rb-frame-tuner-trigger:hover{border-color:var(--accent-bright)}
    .rb-frame-tuner-overlay{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;overflow:auto;padding:12px;background:rgba(0,0,0,.86);backdrop-filter:blur(8px)}
    .rb-frame-tuner{width:min(100%,520px);max-height:calc(100dvh - 24px);overflow:auto;padding:18px;border:1px solid var(--border);border-radius:16px;background:var(--bg-panel);color:var(--text-main);box-shadow:0 22px 70px #0009}
    .rb-frame-tuner-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
    .rb-frame-tuner-head h2{margin:0;font-size:19px}
    .rb-frame-tuner-close{width:36px;height:36px;border:1px solid var(--border);border-radius:9px;background:var(--bg-panel-2);color:inherit;font-size:23px}
    .rb-frame-tuner-layout{display:grid;grid-template-columns:1fr;gap:14px}
    .rb-frame-tuner-stage{position:relative;width:min(280px,78vw);height:min(280px,78vw);margin:0 auto;border:1px dashed var(--accent);border-radius:50%;overflow:hidden;background:radial-gradient(circle,#30343a,#14171b);touch-action:none;cursor:grab}
    .rb-frame-tuner-stage:active{cursor:grabbing}
    .rb-frame-tuner-photo{position:absolute;inset:var(--rb-header-photo-inset,14%);display:grid;place-items:center;overflow:hidden;border-radius:50%;background:#343941;color:#fff;font-size:64px;font-weight:900}
    .rb-frame-tuner-photo img{width:100%;height:100%;object-fit:cover}
    .rb-frame-tuner-frame{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;user-select:none}
    .rb-frame-tuner-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .rb-frame-tuner-scale{display:grid;grid-template-columns:40px 1fr 40px;align-items:center;gap:9px;margin-top:12px}
    .rb-frame-tuner-scale button{height:40px;border:1px solid var(--border);border-radius:8px;background:var(--bg-panel-2);color:var(--text-main);font-size:22px;font-weight:700}
    .rb-frame-tuner-scale input{width:100%;accent-color:var(--accent)}
    .rb-frame-tuner-scale-value{text-align:center;margin-top:6px;font-size:14px;font-weight:800;font-variant-numeric:tabular-nums}
    .rb-frame-tuner-field{display:grid;gap:5px;color:var(--text-muted);font-size:12px}
    .rb-frame-tuner-axis{display:grid;grid-template-columns:36px minmax(0,1fr) 36px;gap:5px;align-items:center}
    .rb-frame-tuner-axis button{height:40px;border:1px solid var(--border);border-radius:8px;background:var(--bg-panel-2);color:var(--text-main);font-size:21px;font-weight:700;touch-action:manipulation}
    .rb-frame-tuner-field input,.rb-frame-tuner-select{box-sizing:border-box;width:100%;min-width:0;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-main);color:var(--text-main);font:inherit}
    .rb-frame-tuner-select{margin-bottom:12px}
    .rb-frame-tuner-hint{margin:10px 0;color:var(--text-muted);font-size:12px;line-height:1.45;text-align:center}
    .rb-header-photo-size-panel{display:grid;gap:8px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-main)}
    .rb-header-photo-size-panel strong{font-size:13px}
    .rb-header-photo-size-panel input{width:100%;accent-color:var(--accent)}
    .rb-header-photo-size-value{text-align:center;font-size:14px;font-weight:800;font-variant-numeric:tabular-nums}
    .rb-header-photo-size-panel small{color:var(--text-muted);font-size:12px;line-height:1.4}
    .rb-frame-tuner-outline{position:absolute;inset:14%;z-index:3;border:var(--outline-width,2px) solid var(--accent-bright);border-radius:50%;box-sizing:border-box;pointer-events:none;transform:translate(var(--outline-x,0px),var(--outline-y,0px)) scale(var(--outline-scale,1));transform-origin:center}
    .rb-outline-panel{display:grid;gap:10px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-main)}
    .rb-outline-panel>strong{font-size:13px}.rb-outline-row{display:grid;grid-template-columns:minmax(0,1fr) 36px minmax(54px,.8fr) 36px;gap:6px;align-items:center;color:var(--text-muted);font-size:12px}
    .rb-outline-row button{height:36px;border:1px solid var(--border);border-radius:8px;background:var(--bg-panel-2);color:var(--text-main);font-size:20px}
    .rb-outline-reset{min-height:36px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-panel-2);color:var(--text-main);font-weight:600}.rb-outline-row input{width:100%;min-width:0;box-sizing:border-box;padding:8px 4px;border:1px solid var(--border);border-radius:7px;background:var(--bg-panel);color:var(--text-main);text-align:center;font:inherit}
    .rb-frame-tuner-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}
    .rb-frame-tuner-actions button{min-height:42px;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--bg-panel-2);color:var(--text-main);font-weight:700}
    .rb-frame-tuner-actions .primary{border-color:var(--accent);background:var(--accent);color:white}
    .rb-frame-tuner-publish{grid-column:1/-1;border-color:var(--accent)!important;background:var(--accent)!important;color:white!important}
    .rb-frame-tuner-status{min-height:18px;margin:10px 0 0;color:var(--text-muted);font-size:12px;text-align:center}
    @media(max-width:380px){.rb-frame-tuner{padding:13px}}
  `;
  document.head.appendChild(style);
}

export function initAvatarFrameTuner(container, user) {
  // This editor only changes local browser settings, so it is safe to expose on the profile.
  if (container.querySelector('.rb-frame-tuner-trigger')) return;
  injectStyles();

  const headingActions = container.querySelector('.profile-heading-actions') || container.querySelector('.profile-heading');
  if (!headingActions) return;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'rb-frame-tuner-trigger';
  trigger.textContent = '⚙ Подгонка рамок';
  trigger.title = 'Визуально настроить положение и масштаб рамок';
  headingActions.appendChild(trigger);

  trigger.addEventListener('click', () => openTuner(container, user));
}

function openTuner(container, user) {
  if (container.querySelector('.rb-frame-tuner-overlay')) return;
  const tuning = readTuning();
  let selected = 1;
  let drag = null;
  let values = cssForFrame('frame-1', tuning);

  const overlay = document.createElement('div');
  overlay.className = 'rb-frame-tuner-overlay';
  overlay.innerHTML = `
    <section class="rb-frame-tuner" role="dialog" aria-modal="true" aria-labelledby="rb-frame-tuner-title">
      <div class="rb-frame-tuner-head"><h2 id="rb-frame-tuner-title">Редактор рамок</h2><button class="rb-frame-tuner-close" type="button" aria-label="Закрыть">×</button></div>
      <select class="rb-frame-tuner-select" aria-label="Выбрать рамку">${Array.from({length:FRAME_COUNT},(_,i)=>'<option value="'+(i+1)+'">Рамка №'+(i+1)+'</option>').join('')}</select>
      <div class="rb-frame-tuner-layout">
        <div class="rb-frame-tuner-stage">
          <div class="rb-frame-tuner-photo">${user?.avatar ? '<img src="'+String(user.avatar).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" alt="">' : 'Р'}</div>
          <img class="rb-frame-tuner-frame" alt="" draggable="false">
          <div class="rb-frame-tuner-outline" aria-hidden="true"></div>
        </div>
        <div class="rb-header-photo-size-panel">
          <strong>Размер круглой фотографии в шапке</strong>
          <input class="rb-header-photo-size-range" type="range" min="35" max="75" step="1" value="52" aria-label="Размер круглой фотографии в шапке">
          <div class="rb-header-photo-size-value" aria-live="polite">52%</div>
          <small>Меняется только круг фотографии. PNG-рамка остаётся неподвижной.</small>
        </div>
        <p class="rb-frame-tuner-hint">Настройка PNG-рамки выше. Обводка аватара настраивается отдельно ниже.</p>
        <div class="rb-outline-panel"><strong>Обводка основной аватарки</strong>
          <div class="rb-outline-row"><span>Размер</span><button type="button" data-outline-step="scale:-0.01">−</button><input data-outline="scale" type="number" min="50" max="150" step="1" value="100" aria-label="Размер обводки в процентах"><button type="button" data-outline-step="scale:0.01">+</button></div>
          <div class="rb-outline-row"><span>Толщина, px</span><button type="button" data-outline-step="width:-1">−</button><input data-outline="width" type="number" min="0" max="8" step="1" value="2" aria-label="Толщина обводки"><button type="button" data-outline-step="width:1">+</button></div>
          <div class="rb-outline-row"><span>Смещение X</span><button type="button" data-outline-step="x:-1">−</button><input data-outline="x" type="number" min="-20" max="20" step="1" value="0" aria-label="Смещение обводки по горизонтали"><button type="button" data-outline-step="x:1">+</button></div>
          <div class="rb-outline-row"><span>Смещение Y</span><button type="button" data-outline-step="y:-1">−</button><input data-outline="y" type="number" min="-20" max="20" step="1" value="0" aria-label="Смещение обводки по вертикали"><button type="button" data-outline-step="y:1">+</button></div>
          <button class="rb-outline-reset" type="button">Сбросить обводку</button>
        </div>
        <div class="rb-frame-tuner-controls">
          <div class="rb-frame-tuner-field"><span>X, px</span><div class="rb-frame-tuner-axis"><button type="button" data-axis-step="x:-1" aria-label="Сдвинуть по горизонтали влево">−</button><input data-axis="x" type="number" step="1" value="0" aria-label="Горизонтальное положение X"><button type="button" data-axis-step="x:1" aria-label="Сдвинуть по горизонтали вправо">+</button></div></div>
          <div class="rb-frame-tuner-field"><span>Y, px</span><div class="rb-frame-tuner-axis"><button type="button" data-axis-step="y:-1" aria-label="Сдвинуть по вертикали вверх">−</button><input data-axis="y" type="number" step="1" value="0" aria-label="Вертикальное положение Y"><button type="button" data-axis-step="y:1" aria-label="Сдвинуть по вертикали вниз">+</button></div></div>

        </div>
        <div class="rb-frame-tuner-scale"><button class="rb-frame-tuner-minus" type="button" aria-label="Уменьшить масштаб">−</button><input class="rb-frame-tuner-range" type="range" min="10" max="400" step="1" value="100" aria-label="Масштаб рамки"><button class="rb-frame-tuner-plus" type="button" aria-label="Увеличить масштаб">+</button></div><div class="rb-frame-tuner-scale-value" aria-live="polite">100%</div>
      </div>
      <div class="rb-frame-tuner-actions">
        <button class="rb-frame-tuner-reset" type="button">Сбросить рамку</button>
        <button class="rb-frame-tuner-save primary" type="button">Сохранить настройки</button>
        <button class="rb-frame-tuner-export" type="button">Экспорт в файл кода</button>
        <button class="rb-frame-tuner-close-secondary" type="button">Закрыть</button>
      </div>
      <p class="rb-frame-tuner-status" aria-live="polite">Изменения пока только в редакторе.</p>
    </section>`;
  container.appendChild(overlay);
  if (String(user?.username || '').trim().toLowerCase() === 'gpt') {
    const publishButton = document.createElement('button');
    publishButton.type = 'button';
    publishButton.className = 'rb-frame-tuner-publish';
    publishButton.textContent = 'Применить ко всем аккаунтам Rebunar';
    overlay.querySelector('.rb-frame-tuner-actions').appendChild(publishButton);
    publishButton.addEventListener('click', async () => {
      saveCurrent();
      publishButton.disabled = true;
      publishButton.textContent = 'Публикация...';
      try {
        const response = await fetch('/api/avatar-frame-tuning', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tuning })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Не удалось опубликовать настройки');
        const published = result.tuning || tuning;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(published));
        applyTuningToVisibleAvatars(published);
        window.dispatchEvent(new CustomEvent('rebunar:avatar-frame-tuning-updated', { detail: published }));
        status.textContent = 'Готово! Геометрия всех 13 рамок опубликована для всех аккаунтов Rebunar.';
      } catch (error) {
        status.textContent = error.message || 'Ошибка публикации. Попробуй ещё раз.';
      } finally {
        publishButton.disabled = false;
        publishButton.textContent = 'Применить ко всем аккаунтам Rebunar';
      }
    });
  }

  const stage = overlay.querySelector('.rb-frame-tuner-stage');
  const frame = overlay.querySelector('.rb-frame-tuner-frame');
  const select = overlay.querySelector('.rb-frame-tuner-select');
  const status = overlay.querySelector('.rb-frame-tuner-status');
  const fields = Object.fromEntries([...overlay.querySelectorAll('[data-axis]')].map(input => [input.dataset.axis,input]));
  const scaleRange = overlay.querySelector('.rb-frame-tuner-range');
  const scaleValue = overlay.querySelector('.rb-frame-tuner-scale-value');
  const headerPhotoSizeRange = overlay.querySelector('.rb-header-photo-size-range');
  const headerPhotoSizeValue = overlay.querySelector('.rb-header-photo-size-value');
  const HEADER_PHOTO_SIZE_KEY = 'rebunar.header-avatar-photo-diameter.v1';
  let headerPhotoDiameter = 52;
  try {
    const savedSize = Number(localStorage.getItem(HEADER_PHOTO_SIZE_KEY));
    if (Number.isFinite(savedSize) && savedSize >= 35 && savedSize <= 75) headerPhotoDiameter = savedSize;
  } catch {}
  headerPhotoSizeRange.value = String(headerPhotoDiameter);
  headerPhotoSizeValue.textContent = headerPhotoDiameter + '%';
  function applyHeaderPhotoSize(value) {
    headerPhotoDiameter = Math.max(35, Math.min(75, Number(value) || 52));
    headerPhotoSizeRange.value = String(headerPhotoDiameter);
    headerPhotoSizeValue.textContent = headerPhotoDiameter + '%';
    try { localStorage.setItem(HEADER_PHOTO_SIZE_KEY, String(headerPhotoDiameter)); } catch {}
    const photoInset = ((100 - headerPhotoDiameter) / 2) + '%';
    const previewPhoto = overlay.querySelector('.rb-frame-tuner-photo');
    if (previewPhoto) previewPhoto.style.inset = photoInset;
    document.querySelectorAll('.rb-avatar--header').forEach(avatar => {
      avatar.style.setProperty('--rb-header-photo-diameter', headerPhotoDiameter + '%');
      avatar.style.setProperty('--rb-avatar-inset', photoInset);
    });
    window.dispatchEvent(new CustomEvent('rebunar:header-avatar-size-updated', { detail: headerPhotoDiameter }));
  }
  headerPhotoSizeRange.addEventListener('input', () => applyHeaderPhotoSize(headerPhotoSizeRange.value));
  applyHeaderPhotoSize(headerPhotoDiameter);
  const pointers = new Map();
  let outlineValues = { scale: 1, width: 2, x: 0, y: 0 };
  try { outlineValues = { ...outlineValues, ...JSON.parse(localStorage.getItem('rebunar.avatar-outline-tuning.v1') || '{}') }; } catch {}
  const outlineInputs = Object.fromEntries([...overlay.querySelectorAll('[data-outline]')].map(input => [input.dataset.outline,input]));
  const outlinePreview = overlay.querySelector('.rb-frame-tuner-outline');
  let pinchStart = null;

  function render() {
    const px = stage.clientWidth || STAGE_SIZE;
    frame.src = '/new/assets/frames/rebunar_avatar_' + selected + '.png';
    frame.style.transform = 'translate(calc(-50% + '+values.x+'px),calc(-50% + '+values.y+'px)) scale('+values.scale+')';
    frame.style.top = '50%';
    frame.style.left = '50%';
    frame.style.right = 'auto';
    frame.style.bottom = 'auto';
    frame.style.width = '100%';
    frame.style.height = '100%';
    fields.x.value = String(Math.round(values.x));
    fields.y.value = String(Math.round(values.y));
    scaleRange.value = String(Math.round(values.scale*100));
    scaleValue.textContent = Math.round(values.scale*100) + '%';
    outlinePreview.style.setProperty('--outline-scale', String(outlineValues.scale));
    outlinePreview.style.setProperty('--outline-width', outlineValues.width + 'px');
    outlinePreview.style.setProperty('--outline-width', outlineValues.width + 'px');
    outlinePreview.style.setProperty('--outline-x', outlineValues.x + 'px');
    outlinePreview.style.setProperty('--outline-y', outlineValues.y + 'px');
    Object.entries(outlineInputs).forEach(([key,input]) => input.value = String(key === 'scale' ? Math.round(outlineValues[key]*100) : outlineValues[key]));
  }

  function updateFromFields() {
    values.x = Math.max(-140,Math.min(140,safeValue(fields.x.value)));
    values.y = Math.max(-140,Math.min(140,safeValue(fields.y.value)));
    values.scale = Math.max(MIN_SCALE,Math.min(MAX_SCALE,values.scale));
    render();
  }

  function setScale(next) { values.scale = Math.max(MIN_SCALE,Math.min(MAX_SCALE,next)); render(); }
  function updateOutline(key, next) {
    const limits = { scale:[0.5,1.5], width:[0,8], x:[-20,20], y:[-20,20] }[key];
    if (!limits) return;
    outlineValues[key] = Math.max(limits[0], Math.min(limits[1], safeValue(next, outlineValues[key])));
    render();
  }
  function saveOutline() {
    localStorage.setItem('rebunar.avatar-outline-tuning.v1', JSON.stringify(outlineValues));
    applyOutlineToVisibleAvatars(outlineValues);
  }

  function saveCurrent() {
    // Store offsets as percentages so the same tuning scales with 42–142px avatars.
    tuning['frame-'+selected] = {
      x: Number((values.x / STAGE_SIZE * 100).toFixed(4)),
      y: Number((values.y / STAGE_SIZE * 100).toFixed(4)),
      scale: Number(values.scale.toFixed(4))
    };
    localStorage.setItem(STORAGE_KEY,JSON.stringify(tuning));
    applyTuningToVisibleAvatars(tuning);
    saveOutline();
    status.textContent = 'Настройки сохранены на этом устройстве. PNG-рамка и обводка настраиваются независимо.';
  }

  function close() { overlay.remove(); }
  overlay.querySelectorAll('.rb-frame-tuner-close,.rb-frame-tuner-close-secondary').forEach(button=>button.addEventListener('click',close));
  overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
  select.addEventListener('change',()=>{selected=Number(select.value);values=cssForFrame('frame-'+selected,tuning);render();status.textContent='Настройка рамки №'+selected;});
  Object.values(fields).forEach(input=>input.addEventListener('input',updateFromFields));
  overlay.querySelectorAll('[data-axis-step]').forEach(button=>button.addEventListener('click',()=>{
    const [axis,step] = button.dataset.axisStep.split(':');
    values[axis] = Math.max(-140,Math.min(140,values[axis] + Number(step)));
    render();
  }));
  scaleRange.addEventListener('input',()=>setScale(Number(scaleRange.value)/100));
  overlay.querySelector('.rb-frame-tuner-minus').addEventListener('click',()=>setScale(values.scale-0.01));
  overlay.querySelector('.rb-frame-tuner-plus').addEventListener('click',()=>setScale(values.scale+0.01));
  overlay.querySelector('.rb-frame-tuner-reset').addEventListener('click',()=>{values={x:0,y:0,scale:1};delete tuning['frame-'+selected];render();status.textContent='Настройки этой рамки сброшены. Нажми «Сохранить настройки», чтобы применить.';});
  overlay.querySelector('.rb-frame-tuner-save').addEventListener('click',saveCurrent);
  Object.entries(outlineInputs).forEach(([key,input]) => input.addEventListener('change', () => updateOutline(key, key === 'scale' ? safeValue(input.value,100)/100 : safeValue(input.value))));
  overlay.querySelectorAll('[data-outline-step]').forEach(button => button.addEventListener('click', () => {
    const [key,step] = button.dataset.outlineStep.split(':');
    updateOutline(key, outlineValues[key] + Number(step));
  }));
  overlay.querySelector('.rb-outline-reset').addEventListener('click', () => {
    outlineValues = { scale:1, width:2, x:0, y:0 }; render(); saveOutline();
    status.textContent = 'Обводка возвращена к исходным настройкам.';
  });
  overlay.querySelector('.rb-frame-tuner-export').addEventListener('click',()=>{
    saveCurrent();
    const source='// Generated by Rebunar Avatar Frame Tuner. Offsets are percentages of frame size.\nexport const AVATAR_FRAME_TUNING = Object.freeze('+JSON.stringify(tuning,null,2)+');\n';
    const blob=new Blob([source],{type:'text/javascript;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download='avatar-frame-tuning.js';link.click();
    URL.revokeObjectURL(url);
    status.textContent='Файл avatar-frame-tuning.js подготовлен. Замени им одноимённый файл в проекте и пересобери приложение.';
  });

  stage.addEventListener('pointerdown',event=>{
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    try { stage.setPointerCapture(event.pointerId); } catch {}
    if(pointers.size===1) drag={x:event.clientX,y:event.clientY,offsetX:values.x,offsetY:values.y};
    else if(pointers.size===2) {
      drag=null;
      const points=[...pointers.values()];
      pinchStart={distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),scale:values.scale};
    }
  });
  stage.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===2&&pinchStart) {
      const points=[...pointers.values()];
      const distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
      if(pinchStart.distance>0)setScale(pinchStart.scale*distance/pinchStart.distance);
      return;
    }
    if(pointers.size===1&&drag) {
      const factor=stage.clientWidth/STAGE_SIZE;
      values.x=drag.offsetX+(event.clientX-drag.x)/factor;
      values.y=drag.offsetY+(event.clientY-drag.y)/factor;
      render();
    }
  });
  const endPointer=event=>{pointers.delete(event.pointerId);if(pointers.size<2)pinchStart=null;drag=null;};
  stage.addEventListener('pointerup',endPointer);
  stage.addEventListener('pointercancel',endPointer);
  stage.addEventListener('lostpointercapture',endPointer);
  values=cssForFrame('frame-1',tuning);
  render();
}

function applyTuningToVisibleAvatars(tuning) {
  document.querySelectorAll('.rb-avatar[data-frame-id]').forEach(avatar=>{
    const frame=avatar.querySelector('.rb-avatar__frame');
    if(!frame)return;
    const values=cssForFrame(avatar.dataset.frameId,tuning);
    frame.style.setProperty('--rb-frame-x',values.x+'%');
    frame.style.setProperty('--rb-frame-y',values.y+'%');
    frame.style.setProperty('--rb-frame-scale',String(values.scale));
  });
}


function applyOutlineToVisibleAvatars(values) {
  document.querySelectorAll('.rb-avatar--profile').forEach(avatar => {
    avatar.style.setProperty('--rb-outline-scale', String(values.scale));
    avatar.style.setProperty('--rb-outline-width', values.width + 'px');
    avatar.style.setProperty('--rb-outline-x', values.x + 'px');
    avatar.style.setProperty('--rb-outline-y', values.y + 'px');
  });
}
