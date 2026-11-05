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
  const values = tuning[String(frameId || '')] || {};
  return {
    x: safeValue(values.x),
    y: safeValue(values.y),
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
    .rb-frame-tuner-stage{position:relative;width:min(280px,78vw);height:min(280px,78vw);margin:0 auto;border:1px dashed var(--accent);border-radius:50%;overflow:hidden;background:radial-gradient(circle,#30343a,#14171b);touch-action:none}
    .rb-frame-tuner-photo{position:absolute;inset:14%;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:#343941;color:#fff;font-size:64px;font-weight:900}
    .rb-frame-tuner-photo img{width:100%;height:100%;object-fit:cover}
    .rb-frame-tuner-frame{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;user-select:none;transform-origin:center}
    .rb-frame-tuner-scale{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:10px}
    .rb-frame-tuner-scale button{height:42px;border:1px solid var(--border);border-radius:9px;background:var(--bg-panel-2);color:var(--text-main);font-size:24px;font-weight:700}
    .rb-frame-tuner-scale input{width:100%;accent-color:var(--accent)}
    .rb-frame-tuner-scale-value{text-align:center;font-size:15px;font-weight:800;font-variant-numeric:tabular-nums}
    .rb-frame-tuner-hint{margin:8px 0;color:var(--text-muted);font-size:12px;line-height:1.45;text-align:center}
    .rb-frame-tuner-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}
    .rb-frame-tuner-actions button{min-height:42px;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--bg-panel-2);color:var(--text-main);font-weight:700}
    .rb-frame-tuner-actions .primary{border-color:var(--accent);background:var(--accent);color:white}
    .rb-frame-tuner-status{min-height:18px;margin:10px 0 0;color:var(--text-muted);font-size:12px;text-align:center}
    @media(max-width:380px){.rb-frame-tuner{padding:13px}}
  `;
  document.head.appendChild(style);
}

export function initAvatarFrameTuner(container, user) {
  if (container.querySelector('.rb-frame-tuner-trigger')) return;
  injectStyles();
  const headingActions = container.querySelector('.profile-heading-actions') || container.querySelector('.profile-heading');
  if (!headingActions) return;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'rb-frame-tuner-trigger';
  trigger.textContent = '⚙ Подгонка рамок';
  trigger.title = 'Настроить размер рамки';
  headingActions.appendChild(trigger);
  trigger.addEventListener('click', () => openTuner(container, user));
}

function openTuner(container, user) {
  if (container.querySelector('.rb-frame-tuner-overlay')) return;
  const tuning = readTuning();
  let selected = 1;
  let values = cssForFrame('frame-1', tuning);
  const pointers = new Map();
  let pinchStart = null;

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
        <p class="rb-frame-tuner-hint">Меняй размер ползунком, кнопками или двумя пальцами прямо на рамке. Положение рамки не меняется.</p>
        <div class="rb-frame-tuner-scale">
          <button class="rb-frame-tuner-minus" type="button" aria-label="Уменьшить">−</button>
          <input class="rb-frame-tuner-range" type="range" min="10" max="400" step="1" value="100" aria-label="Масштаб рамки">
          <button class="rb-frame-tuner-plus" type="button" aria-label="Увеличить">+</button>
        </div>
        <div class="rb-frame-tuner-scale-value" aria-live="polite">100%</div>
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
  const range = overlay.querySelector('.rb-frame-tuner-range');
  const scaleValue = overlay.querySelector('.rb-frame-tuner-scale-value');

  function render() {
    frame.src = '/new/assets/frames/rebunar_avatar_' + selected + '.png';
    frame.style.transform = 'translate(-50%,-50%) scale(' + values.scale + ')';
    frame.style.top = '50%';
    frame.style.left = '50%';
    frame.style.right = 'auto';
    frame.style.bottom = 'auto';
    frame.style.width = '100%';
    frame.style.height = '100%';
    const percent = Math.round(values.scale * 100);
    range.value = String(percent);
    scaleValue.textContent = percent + '%';
  }

  function setScale(next) {
    values.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
    render();
  }

  function saveCurrent() {
    // Keep offsets unchanged; this editor intentionally adjusts scale only.
    tuning['frame-' + selected] = {
      x: safeValue(values.x),
      y: safeValue(values.y),
      scale: Number(values.scale.toFixed(4))
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tuning));
    applyTuningToVisibleAvatars(tuning);
    status.textContent = 'Сохранено на этом устройстве. Экспортируй файл, чтобы закрепить настройки в проекте.';
  }

  function close() { overlay.remove(); }
  overlay.querySelectorAll('.rb-frame-tuner-close,.rb-frame-tuner-close-secondary').forEach(button=>button.addEventListener('click',close));
  overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
  select.addEventListener('change',()=>{selected=Number(select.value);values=cssForFrame('frame-'+selected,tuning);render();status.textContent='Настройка рамки №'+selected;});
  range.addEventListener('input',()=>setScale(Number(range.value)/100));
  overlay.querySelector('.rb-frame-tuner-minus').addEventListener('click',()=>setScale(values.scale-0.01));
  overlay.querySelector('.rb-frame-tuner-plus').addEventListener('click',()=>setScale(values.scale+0.01));
  overlay.querySelector('.rb-frame-tuner-reset').addEventListener('click',()=>{values={x:0,y:0,scale:1};delete tuning['frame-'+selected];render();status.textContent='Масштаб сброшен до 100%. Нажми «Сохранить настройки», чтобы применить.';});
  overlay.querySelector('.rb-frame-tuner-save').addEventListener('click',saveCurrent);
  overlay.querySelector('.rb-frame-tuner-export').addEventListener('click',()=>{
    saveCurrent();
    const source='// Generated by Rebunar Avatar Frame Tuner. Scale is a multiplier; offsets remain zero unless previously configured.\nexport const AVATAR_FRAME_TUNING = Object.freeze('+JSON.stringify(tuning,null,2)+');\n';
    const blob=new Blob([source],{type:'text/javascript;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download='avatar-frame-tuning.js';link.click();
    URL.revokeObjectURL(url);
    status.textContent='Файл avatar-frame-tuning.js подготовлен для проекта.';
  });

  // Two-finger pinch changes only scale; a single finger never shifts the frame.
  stage.addEventListener('pointerdown',event=>{
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    try { stage.setPointerCapture(event.pointerId); } catch {}
    if(pointers.size===2){
      const points=[...pointers.values()];
      pinchStart={distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),scale:values.scale};
    }
  });
  stage.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===2&&pinchStart){
      const points=[...pointers.values()];
      const distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
      if(pinchStart.distance>0)setScale(pinchStart.scale*distance/pinchStart.distance);
    }
  });
  const endPointer=event=>{
    pointers.delete(event.pointerId);
    if(pointers.size<2)pinchStart=null;
  };
  stage.addEventListener('pointerup',endPointer);
  stage.addEventListener('pointercancel',endPointer);
  stage.addEventListener('lostpointercapture',endPointer);

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
