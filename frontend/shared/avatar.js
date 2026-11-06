/**
 * Rebunar shared avatar renderer.
 * All avatar surfaces use one square geometry with softly rounded corners.
 */
const escapeAttribute = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

export function avatarMarkup(user = {}, options = {}) {
  const size = ['header', 'profile', 'chat', 'message', 'search', 'directory', 'public', 'community', 'preview'].includes(options.size)
    ? options.size : 'chat';
  const photo = String(user.avatar || '');
  const classes = ['rb-avatar', 'rb-avatar--' + size, options.className || '', photo ? 'has-photo' : ''].filter(Boolean).join(' ');
  const photoMarkup = photo
    ? '<img class="rb-avatar__photo" src="' + escapeAttribute(photo) + '" alt="" draggable="false" loading="lazy" onerror="this.hidden=true;this.parentElement.classList.remove(\'has-photo\')">'
    : '';
  return '<span class="' + classes + '" role="img" aria-label="' + escapeAttribute(options.label || 'Аватар') + '">' +
    '<span class="rb-avatar__photo-layer">' + photoMarkup + '<span class="rb-avatar__fallback" aria-hidden="true">Р</span></span>' +
    '</span>';
}
