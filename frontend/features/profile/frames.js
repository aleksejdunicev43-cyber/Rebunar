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
