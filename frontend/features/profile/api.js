/**
 * REBUNAR — PROFILE API
 */

import { api } from '../../shared/api/client.js';

export async function uploadAvatar(blob) {
  const formData = new FormData();
  formData.append('avatar', blob, 'avatar.jpg');

  return api.post('/profile/avatar', formData);
}

export async function updateProfile(username, displayName, bio) {
  return api.post('/profile', {
    username,
    display_name: displayName,
    bio
  });
}

export async function changePassword(currentPassword, newPassword) {
  return api.post('/security/password', {
    current_password: currentPassword,
    new_password: newPassword
  });
}
