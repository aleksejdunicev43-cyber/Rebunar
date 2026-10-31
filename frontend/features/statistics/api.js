/**
 * REBUNAR — STATISTICS API
 * Получение публичной статистики платформы.
 */

import { api } from '../../shared/api/client.js';

export function getStatisticsSummary() {
  return api.get('/statistics/summary');
}

export function getStatisticsHistory(period = 'week') {
  const allowedPeriods = ['week', 'month', 'year'];

  if (!allowedPeriods.includes(period)) {
    throw new Error('Недопустимый период статистики');
  }

  return api.get(`/statistics/history?period=${period}`);
}
