/**
 * REBUNAR — AVATAR FRAME COLLECTION API
 */
import { api } from '../../shared/api/client.js';
import './avatar-frame-boundary.css';

export function fetchAvatarFrames() {
  return api.get('/profile/frames');
}

export function equipAvatarFrame(frameId) {
  return api.post('/profile/frames/equip', { frame_id: frameId });
}

// Изолируем SVG-градиент каждой рамки. Раньше все SVG использовали один
// и тот же id="g", из-за чего браузер мог подставлять градиент другой рамки.
function isolateFrameGradients(root = document) {
  root.querySelectorAll?.('.avatar-frame-art').forEach((svg, index) => {
    const gradient = svg.querySelector('#g');
    if (!gradient) return;
    const uniqueId = 'rebunar-frame-gradient-' + Date.now() + '-' + index + '-' + Math.random().toString(36).slice(2, 8);
    gradient.id = uniqueId;
    svg.querySelectorAll('[stroke="url(#g)"]').forEach(node => node.setAttribute('stroke', `url(#${uniqueId})`));
    svg.querySelectorAll('[fill="url(#g)"]').forEach(node => node.setAttribute('fill', `url(#${uniqueId})`));
  });
}

if (typeof window !== 'undefined') {
  const startFrameGradientIsolation = () => {
    isolateFrameGradients();
    const observer = new MutationObserver(() => isolateFrameGradients());
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) startFrameGradientIsolation();
  else document.addEventListener('DOMContentLoaded', startFrameGradientIsolation, { once: true });
}
