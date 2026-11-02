import { api } from '../../shared/api/client.js';

export function getChats() {
  return api.get('/messages/chats');
}

export function searchUsers(query) {
  return api.get(`/users/search?q=${encodeURIComponent(query)}`);
}

export function getChatHistory(userId) {
  return api.get(`/messages/history?chat_with_id=${encodeURIComponent(userId)}`);
}

export function sendMessage(receiverId, message) {
  return api.post('/messages/send', {
    receiver_id: Number(receiverId),
    text: message
  });
}

export function getSelfNotes() {
  return api.get('/messages/self');
}

export function createSelfNote(message) {
  return api.post('/messages/self', { text: message });
}

export function deleteSelfNote(noteId) {
  return api.delete(`/messages/self/${Number(noteId)}`);
}


export function uploadSelfImage(file) {
  const form = new FormData();
  form.append('image', file);
  return api.upload('/messages/self/image', form);
}
