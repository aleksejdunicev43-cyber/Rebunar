import { api } from '../../shared/api/client.js';

export function getWebtoonGenres() {
  return api.get('/webtoon/genres');
}

export function getWebtoonWorks(query = '') {
  return api.get('/webtoon/works?q=' + encodeURIComponent(query));
}

export function getWebtoonWork(workId) {
  return api.get('/webtoon/works/' + Number(workId));
}

export function createWebtoonWork(data) {
  return api.post('/webtoon/works', data);
}

export function createWebtoonChapter(workId, data) {
  return api.post('/webtoon/works/' + Number(workId) + '/chapters', data);
}

export function publishWebtoonWork(workId) {
  return api.post('/webtoon/works/' + Number(workId) + '/publish', {});
}

export function getWebtoonChapter(chapterId) {
  return api.get('/webtoon/chapters/' + Number(chapterId));
}

export function uploadWebtoonPage(chapterId, file) {
  const form = new FormData();
  form.append('page', file);
  return api.upload('/webtoon/chapters/' + Number(chapterId) + '/pages', form);
}

export function publishWebtoonChapter(chapterId) {
  return api.post('/webtoon/chapters/' + Number(chapterId) + '/publish', {});
}
