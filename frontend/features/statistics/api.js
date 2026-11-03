/**
 * REBUNAR — STATISTICS API
 * Получение публичной статистики платформы.
 */

import { api } from '../../shared/api/client.js';

export function getStatisticsSummary() {
  return api.get('/statistics/summary');
}

export function getStatisticsHistory() {
  return api.get('/statistics/history');
}
