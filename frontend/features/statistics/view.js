/**
 * REBUNAR — STATISTICS VIEW
 * Экран публичной статистики платформы.
 */

import {
  getStatisticsSummary,
  getStatisticsHistory
} from './api.js';

const PERIODS = {
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год'
};

function formatDate(value, period) {
  const date = new Date(value + 'T00:00:00');

  if (period === 'year') {
    return date.toLocaleDateString('ru-RU', {
      month: 'short'
    });
  }

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short'
  });
}

function createChart(registrations, period) {
  const daily = new Map(
    registrations.map(item => [item.date, Number(item.count) || 0])
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let series = [];

  if (period === 'year') {
    const firstMonth = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    const monthly = new Map();

    registrations.forEach(item => {
      const date = new Date(item.date + 'T00:00:00');
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthly.set(key, (monthly.get(key) || 0) + (Number(item.count) || 0));
    });

    series = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      return {
        date,
        label: date.toLocaleDateString('ru-RU', { month: 'short' }),
        count: monthly.get(key) || 0
      };
    });
  } else {
    const length = period === 'week' ? 7 : 30;
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - length + 1);

    series = Array.from({ length }, (_, index) => {
      const date = new Date(firstDay);
      date.setDate(firstDay.getDate() + index);
      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
      ].join('-');

      return {
        date,
        label: date.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short'
        }),
        count: daily.get(key) || 0
      };
    });
  }

  let cumulative = 0;
  series = series.map(item => {
    cumulative += item.count;
    return { ...item, cumulative };
  });

  const width = 720;
  const height = 260;
  const padding = { top: 24, right: 24, bottom: 42, left: 42 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, cumulative);

  const points = series.map((item, index) => ({
    ...item,
    x: padding.left + (series.length > 1
      ? index / (series.length - 1) * innerWidth
      : innerWidth / 2),
    y: padding.top + innerHeight - item.cumulative / maxValue * innerHeight
  }));

  const line = points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  const baseline = padding.top + innerHeight;
  const area = points.length
    ? `${line} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`
    : '';

  const grid = [0, 1, 2, 3].map(step => {
    const y = padding.top + innerHeight * step / 3;
    const value = Math.round(maxValue * (3 - step) / 3);
    return `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="statistics-grid-line"/>
      <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" class="statistics-axis-label">${value}</text>
    `;
  }).join('');

  const labelIndexes = period === 'week'
    ? [0, 2, 4, 6]
    : period === 'month'
      ? [0, 7, 14, 21, 29]
      : [0, 2, 4, 6, 8, 10, 11];

  const labels = labelIndexes.map(index => points[index]).filter(Boolean).map(point => `
    <text x="${point.x}" y="${height - 12}" text-anchor="middle" class="statistics-axis-label">${point.label}</text>
  `).join('');

  const markers = points.filter((point, index) =>
    index === 0 || index === Math.floor(points.length / 2) || index === points.length - 1
  ).map(point => `
    <circle cx="${point.x}" cy="${point.y}" r="5" class="statistics-point">
      <title>${point.label}: +${point.count}, накопительно: ${point.cumulative}</title>
    </circle>
  `).join('');

  return `
    <svg class="statistics-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Накопительный график роста регистраций">
      <defs>
        <linearGradient id="statisticsAreaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ed3548" stop-opacity=".34"/>
          <stop offset="100%" stop-color="#ed3548" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${grid}
      <path d="${area}" class="statistics-area"/>
      <path d="${line}" class="statistics-line"/>
      ${markers}
      ${labels}
    </svg>
  `;
}

export async function renderStatisticsScreen(outlet) {
  outlet.innerHTML = `
    <section class="screen statistics-screen">
      <div class="statistics-heading">
        <div>
          <button class="screen-back" type="button" data-route="settings" aria-label="Назад к настройкам" title="Назад к настройкам">
            <span aria-hidden="true">⤺</span>
          </button>
          <span class="statistics-eyebrow">REBUNAR / ANALYTICS</span>
          <h1>Статистика</h1>
          <p>Развитие и активность платформы</p>
        </div>
      </div>

      <div class="statistics-summary-grid">
        <article class="statistics-card">
          <span>Всего аккаунтов</span>
          <strong id="statistics-total">—</strong>
        </article>

        <article class="statistics-card">
          <span>Сейчас онлайн</span>
          <strong id="statistics-online">—</strong>
        </article>
      </div>

      <section class="statistics-chart-card">
        <div class="statistics-chart-header">
          <div>
            <h2>Рост регистраций</h2>
            <p id="statistics-period-total">Загрузка данных...</p>
          </div>

          <div class="statistics-periods">
            ${Object.entries(PERIODS).map(([key, label]) => `
              <button type="button"
                      data-statistics-period="${key}"
                      class="${key === 'week' ? 'is-active' : ''}">
                ${label}
              </button>
            `).join('')}
          </div>
        </div>

        <div id="statistics-chart-container"
             class="statistics-chart-container">
          <p>Загружаем график...</p>
        </div>
      </section>

      <p class="statistics-footnote">
        Данные обновляются с сервера Rebunar.
      </p>
    </section>
  `;

  const totalElement = outlet.querySelector('#statistics-total');
  const onlineElement = outlet.querySelector('#statistics-online');
  const periodTotal = outlet.querySelector('#statistics-period-total');
  const chartContainer = outlet.querySelector('#statistics-chart-container');
  const periodButtons = outlet.querySelectorAll('[data-statistics-period]');

  let selectedPeriod = 'week';
  let requestNumber = 0;

  async function loadPeriod(period) {
    selectedPeriod = period;
    const currentRequest = ++requestNumber;

    periodButtons.forEach(button => {
      button.classList.toggle(
        'is-active',
        button.dataset.statisticsPeriod === period
      );
    });

    chartContainer.innerHTML = '<p>Загружаем график...</p>';
    periodTotal.textContent = 'Загрузка данных...';

    try {
      const data = await getStatisticsHistory(period);

      if (currentRequest !== requestNumber) return;

      const registrations = data.registrations || [];
      const total = registrations.reduce(
        (sum, item) => sum + item.count,
        0
      );

      periodTotal.textContent = `${total} новых регистраций за период`;

      chartContainer.innerHTML = registrations.length
        ? createChart(registrations, period)
        : '<p class="statistics-empty">Пока нет регистраций за этот период.</p>';
    } catch (error) {
      if (currentRequest !== requestNumber) return;

      chartContainer.innerHTML =
        '<p class="statistics-error">Не удалось загрузить график.</p>';

      periodTotal.textContent = error.message;
    }
  }

  periodButtons.forEach(button => {
    button.addEventListener('click', () => {
      loadPeriod(button.dataset.statisticsPeriod);
    });
  });

  try {
    const summary = await getStatisticsSummary();
    totalElement.textContent = summary.total_users ?? 0;
    onlineElement.textContent = summary.online_users ?? 0;
  } catch (error) {
    totalElement.textContent = '—';
    onlineElement.textContent = '—';
    console.error('Rebunar: ошибка статистики:', error);
  }

  await loadPeriod(selectedPeriod);
}
