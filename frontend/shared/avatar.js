/**
 * Rebunar shared avatar renderer.
 * All screens use the same markup. The photo box and clip outline of each
 * frame come from avatar-frames.css (generated from the real PNG holes by
 * tools/analyze_frames.py), selected through the data-frame attribute.
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
  const frameMarkup = frameUrl
    ? '<img class="rb-avatar__frame" src="' + frameUrl + '" alt="" aria-hidden="true" draggable="false" loading="lazy" decoding="async">'
    : '';
  // data-frame selects the measured geometry for this exact PNG (avatar-frames.css)
  const frameAttribute = frameUrl ? ' data-frame="' + frameId + '"' : '';
  return '<span class="' + classes + '"' + frameAttribute + ' role="img" aria-label="' + escapeAttribute(options.label || 'Аватар') + '">' +
    '<span class="rb-avatar__photo-layer">' + photoMarkup + '<span class="rb-avatar__fallback" aria-hidden="true">Р</span></span>' +
    frameMarkup + '</span>';
}
