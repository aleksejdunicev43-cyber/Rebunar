/**
 * REBUNAR — USERS DIRECTORY API
 */
import { api } from '../../shared/api/client.js';

export function getUsers({ query = '', page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: String(limit)
  });
  return api.get('/users?' + params.toString());
}
