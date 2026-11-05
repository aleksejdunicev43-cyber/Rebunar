import { AVATAR_FRAME_TUNING } from '../../shared/avatar-frame-tuning.js';

const STORAGE_KEY = 'rebunar.avatar-frame-tuning.v1';
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
    .rb-frame-tuner-photo{position:absolute;inset:14%;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:#343941;color:#fff;font-size:64px;font-weight:900}
    .rb-frame-tuner-photo img{width:100%;height:100%;object-fit:cover}
    .rb-frame-tuner-frame{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;user-select:none}
    .rb-frame-tuner-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .rb-frame-tuner-scale{display:grid;grid-template-columns:40px 1fr 40px;align-items:center;gap:9px;margin-top:12px}
    .rb-frame-tuner-scale button{height:40px;border:1px solid var(--border);border-radius:8px;background:var(--bg-panel-2);color:var(--text-main);font-size:22px;font-weight:700}
    .rb-frame-tuner-scale input{width:100%;accent-color:var(--accent)}
    .rb-frame-tuner-scale-value{text-align:center;margin-top:6px;font-size:14px;font-weight:800;font-variant-numeric:tabular-nums}
    .rb-frame-tuner-field{display:grid;gap:5px;color:var(--text-muted);font-size:12px}
    .rb-frame-tuner-field input,.rb-frame-tuner-select{box-sizing:border-box;width:100%;min-width:0;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-main);color:var(--text-main);font:inherit}
    .rb-frame-tuner-select{margin-bottom:12px}
    .rb-frame-tuner-hint{margin:10px 0;color:var(--text-muted);font-size:12px;line-height:1.45;text-align:center}
    .rb-frame-tuner-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}
    .rb-frame-tuner-actions button{min-height:42px;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--bg-panel-2);color:var(--text-main);font-weight:700}
    .rb-frame-tuner-actions .primary{border-color:var(--accent);background:var(--accent);color:white}
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
        </div>
        <p class="rb-frame-tuner-hint">Перетаскивай рамку одним пальцем, чтобы менять X и Y. Масштаб меняй ползунком, кнопками или двумя пальцами.</p>
        <div class="rb-frame-tuner-controls">
          <label class="rb-frame-tuner-field">X, px<input data-axis="x" type="number" step="1" value="0"></label>
          <label class="rb-frame-tuner-field">Y, px<input data-axis="y" type="number" step="1" value="0"></label>
          
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

  const stage = overlay.querySelector('.rb-frame-tuner-stage');
  const frame = overlay.querySelector('.rb-frame-tuner-frame');
  const select = overlay.querySelector('.rb-frame-tuner-select');
  const status = overlay.querySelector('.rb-frame-tuner-status');
  const fields = Object.fromEntries([...overlay.querySelectorAll('[data-axis]')].map(input => [input.dataset.axis,input]));
  const scaleRange = overlay.querySelector('.rb-frame-tuner-range');
  const scaleValue = overlay.querySelector('.rb-frame-tuner-scale-value');
  const pointers = new Map();
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
  }

  function updateFromFields() {
    values.x = Math.max(-140,Math.min(140,safeValue(fields.x.value)));
    values.y = Math.max(-140,Math.min(140,safeValue(fields.y.value)));
    values.scale = Math.max(MIN_SCALE,Math.min(MAX_SCALE,values.scale));
    render();
  }

  function setScale(next) { values.scale = Math.max(MIN_SCALE,Math.min(MAX_SCALE,next)); render(); }

  function saveCurrent() {
    // Store offsets as percentages so the same tuning scales with 42–142px avatars.
    tuning['frame-'+selected] = {
      x: Number((values.x / STAGE_SIZE * 100).toFixed(4)),
      y: Number((values.y / STAGE_SIZE * 100).toFixed(4)),
      scale: Number(values.scale.toFixed(4))
    };
    localStorage.setItem(STORAGE_KEY,JSON.stringify(tuning));
    applyTuningToVisibleAvatars(tuning);
    status.textContent = 'Сохранено на этом устройстве. Экспортируй файл, чтобы внести настройки в исходный код.';
  }

  function close() { overlay.remove(); }
  overlay.querySelectorAll('.rb-frame-tuner-close,.rb-frame-tuner-close-secondary').forEach(button=>button.addEventListener('click',close));
  overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
  select.addEventListener('change',()=>{selected=Number(select.value);values=cssForFrame('frame-'+selected,tuning);render();status.textContent='Настройка рамки №'+selected;});
  Object.values(fields).forEach(input=>input.addEventListener('input',updateFromFields));
  scaleRange.addEventListener('input',()=>setScale(Number(scaleRange.value)/100));
  overlay.querySelector('.rb-frame-tuner-minus').addEventListener('click',()=>setScale(values.scale-0.01));
  overlay.querySelector('.rb-frame-tuner-plus').addEventListener('click',()=>setScale(values.scale+0.01));
  overlay.querySelector('.rb-frame-tuner-reset').addEventListener('click',()=>{values={x:0,y:0,scale:1};delete tuning['frame-'+selected];render();status.textContent='Настройки этой рамки сброшены. Нажми «Сохранить настройки», чтобы применить.';});
  overlay.querySelector('.rb-frame-tuner-save').addEventListener('click',saveCurrent);
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
