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
  const width = 720;
  const height = 260;
  const padding = { top: 24, right: 24, bottom: 42, left: 42 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const values = registrations.map(item => item.count);
  const maxValue = Math.max(1, ...values);
  const points = registrations.map((item, index) => {
    const x = padding.left +
      (registrations.length > 1
        ? index / (registrations.length - 1) * innerWidth
        : innerWidth / 2);

    const y = padding.top +
      innerHeight - item.count / maxValue * innerHeight;

    return {
      x,
      y,
      date: item.date,
      count: item.count
    };
  });

  const line = points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    )
    .join(' ');

  const area = points.length
    ? `${line} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`
    : '';

  const grid = [0, 1, 2, 3].map(step => {
    const y = padding.top + innerHeight * step / 3;
    const value = Math.round(maxValue * (3 - step) / 3);

    return `
      <line x1="${padding.left}" y1="${y}"
            x2="${width - padding.right}" y2="${y}"
            class="statistics-grid-line"/>
      <text x="${padding.left - 10}" y="${y + 4}"
            text-anchor="end" class="statistics-axis-label">${value}</text>
    `;
  }).join('');

  const markers = points.map(point => `
    <circle cx="${point.x}" cy="${point.y}" r="4"
            class="statistics-point">
      <title>${point.date}: ${point.count}</title>
    </circle>
  `).join('');

  const labels = points
    .filter((point, index) =>
      index === 0 ||
      index === points.length - 1 ||
      (period === 'week' && index === Math.floor(points.length / 2)) ||
      (period !== 'week' && index % Math.ceil(points.length / 5) === 0)
    )
    .map(point => `
      <text x="${point.x}" y="${height - 12}"
            text-anchor="middle" class="statistics-axis-label">
        ${formatDate(point.date, period)}
      </text>
    `).join('');

  return `
    <svg class="statistics-chart" viewBox="0 0 ${width} ${height}"
         role="img" aria-label="График регистраций">
      ${grid}
      ${area ? `<path d="${area}" class="statistics-area"/>` : ''}
      ${points.length > 1
        ? `<path d="${line}" class="statistics-line"/>`
        : ''}
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
