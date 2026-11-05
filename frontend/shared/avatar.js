import { AVATAR_FRAME_TUNING } from './avatar-frame-tuning.js';

/**
 * Rebunar shared avatar renderer.
 * All screens use the same photo crop, fallback and PNG frame geometry.
 */
const escapeAttribute = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

export function normalizeFrameId(value) {
  const id = String(value || 'none').replace(/[^a-z0-9-]/gi, '');
  return /^frame-(?:[1-9]|1[0-3])$/.test(id) ? id : 'none';
}

export function frameImageUrl(frameId) {
  const id = normalizeFrameId(frameId);
  const match = id.match(/^frame-(\d{1,2})$/);
  return match ? '/new/assets/frames/rebunar_avatar_' + Number(match[1]) + '.png' : '';
}

function frameTuning(frameId) {
  const defaults = AVATAR_FRAME_TUNING[frameId] || {};
  try {
    const saved = JSON.parse(localStorage.getItem('rebunar.avatar-frame-tuning.v2') || '{}');
    const values = { ...defaults, ...(saved[frameId] || {}) };
    const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    return {
      x: number(values.x, 0),
      y: number(values.y, 0),
      scale: Math.max(0.1, Math.min(4, number(values.scale, 1)))
    };
  } catch {
    return { x: Number(defaults.x) || 0, y: Number(defaults.y) || 0, scale: Number(defaults.scale) || 1 };
  }
}

export function avatarMarkup(user = {}, options = {}) {
  const size = ['header', 'profile', 'chat', 'message', 'search', 'directory', 'public', 'community', 'preview'].includes(options.size)
    ? options.size : 'chat';
  const frameId = normalizeFrameId(user.equipped_frame);
  const photo = String(user.avatar || '');
  const classes = ['rb-avatar', 'rb-avatar--' + size, options.className || '', photo ? 'has-photo' : ''].filter(Boolean).join(' ');
  const photoMarkup = photo
    ? '<img class="rb-avatar__photo" src="' + escapeAttribute(photo) + '" alt="" draggable="false" loading="lazy" onerror="this.hidden=true;this.parentElement.classList.remove(\'has-photo\')">'
    : '';
  const frameUrl = frameImageUrl(frameId);
  const tuning = frameTuning(frameId);
  let outline = { scale: 1, width: 2, x: 0, y: 0 };
  try {
    const savedOutline = JSON.parse(localStorage.getItem('rebunar.avatar-outline-tuning.v1') || '{}');
    outline = { ...outline, ...savedOutline };
  } catch {}
  const outlineStyle = '--rb-outline-scale:' + Math.max(0.5, Math.min(1.5, Number(outline.scale) || 1)) + ';--rb-outline-width:' + Math.max(0, Math.min(8, Number(outline.width) || 0)) + 'px;--rb-outline-x:' + Math.max(-20, Math.min(20, Number(outline.x) || 0)) + 'px;--rb-outline-y:' + Math.max(-20, Math.min(20, Number(outline.y) || 0)) + 'px';
  const frameStyle = '--rb-frame-x:' + tuning.x + '%;--rb-frame-y:' + tuning.y + '%;--rb-frame-scale:' + tuning.scale;
  const frameMarkup = frameUrl
    ? '<img class="rb-avatar__frame" src="' + frameUrl + '" style="' + escapeAttribute(frameStyle) + '" alt="" aria-hidden="true" draggable="false" loading="lazy" decoding="async">'
    : '';
  return '<span class="' + classes + '" data-frame-id="' + escapeAttribute(frameId) + '" style="' + escapeAttribute(outlineStyle) + '" role="img" aria-label="' + escapeAttribute(options.label || 'Аватар') + '">' +
    '<span class="rb-avatar__photo-layer">' + photoMarkup + '<span class="rb-avatar__fallback" aria-hidden="true">Р</span></span>' +
    frameMarkup + '</span>';
}
