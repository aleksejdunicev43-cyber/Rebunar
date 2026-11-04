/**
 * REBUNAR — STATISTICS VIEW
 * Единая история фактического количества аккаунтов.
 */
import { getStatisticsSummary, getStatisticsHistory } from './api.js';
import { renderUsersScreen } from '../users/view.js';

function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
}
function formatDate(value, options={day:'numeric',month:'short'}) {
  return new Date(value+'T00:00:00').toLocaleDateString('ru-RU',options);
}

function createChart(history,currentTotal) {
  const events=new Map(history.map(item=>[item.date,Number(item.total)||0]));
  const today=new Date(); today.setHours(0,0,0,0);
  const firstDate=history.length?new Date(history[0].date+'T00:00:00'):new Date(today);
  const series=[]; let lastTotal=0;
  for(const date=new Date(firstDate);date<=today;date.setDate(date.getDate()+1)){
    const key=dateKey(date);
    if(events.has(key)) lastTotal=events.get(key);
    series.push({date:key,label:formatDate(key),total:lastTotal});
  }
  if(!series.length) series.push({date:dateKey(today),label:formatDate(dateKey(today)),total:currentTotal});
  else series[series.length-1].total=currentTotal;

  const width=720,height=260,padding={top:24,right:24,bottom:42,left:48};
  const innerWidth=width-padding.left-padding.right,innerHeight=height-padding.top-padding.bottom;
  const maxValue=Math.max(1,...series.map(item=>item.total))*1.12;
  const points=series.map((item,index)=>({...item,
    x:padding.left+(series.length>1?index/(series.length-1)*innerWidth:innerWidth/2),
    y:padding.top+innerHeight-item.total/maxValue*innerHeight
  }));
  const line=points.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');
  const baseline=padding.top+innerHeight;
  const area=`${line} L ${points[points.length-1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
  const grid=[0,1,2,3].map(step=>{
    const y=padding.top+innerHeight*step/3,value=Math.round(maxValue*(3-step)/3);
    return `<line x1="${padding.left}" y1="${y}" x2="${width-padding.right}" y2="${y}" class="statistics-grid-line"/><text x="${padding.left-10}" y="${y+4}" text-anchor="end" class="statistics-axis-label">${value}</text>`;
  }).join('');
  const labelIndexes=[...new Set([0,Math.floor((points.length-1)/2),points.length-1])];
  const labels=labelIndexes.map((index,i)=>points[index]).filter(Boolean).map((p,i)=>
    `<text x="${p.x}" y="${height-12}" text-anchor="middle" class="statistics-axis-label">${i===0?formatDate(p.date,{month:'short',year:'numeric'}):p.label}</text>`
  ).join('');
  const markerIndexes=new Set(labelIndexes);
  const markers=points.filter((p,i)=>markerIndexes.has(i)).map(p=>
    `<circle cx="${p.x}" cy="${p.y}" r="5" class="statistics-point"><title>${p.label}: ${p.total} аккаунтов</title></circle>`
  ).join('');
  return `
    <svg class="statistics-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="История общего количества аккаунтов Rebunar">
      <defs><linearGradient id="statisticsAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ed3548" stop-opacity=".34"/><stop offset="100%" stop-color="#ed3548" stop-opacity="0"/></linearGradient></defs>
      ${grid}<path d="${area}" class="statistics-area"/><path d="${line}" class="statistics-line"/>${markers}${labels}
    </svg>`;
}

export async function renderStatisticsScreen(outlet) {
  outlet.innerHTML=`
    <section class="screen statistics-screen">
      <div class="statistics-heading"><div>
        <button class="screen-back" type="button" data-route="settings" aria-label="Назад к настройкам" title="Назад к настройкам"><span aria-hidden="true">⤺</span></button>
        <span class="statistics-eyebrow">REBUNAR / ANALYTICS</span><h1>Статистика</h1><p>Развитие и активность платформы</p>
      </div></div>
      <div class="statistics-summary-grid">
        <article class="statistics-card"><span>Всего аккаунтов</span><strong id="statistics-total">—</strong></article>
        <article class="statistics-card"><span>Сейчас онлайн</span><strong id="statistics-online">—</strong></article>
      </div>
      <section class="statistics-chart-card">
        <div class="statistics-chart-header"><div><h2>Количество аккаунтов</h2><p id="statistics-period-total">Загрузка истории...</p></div><span class="statistics-all-time">ЗА ВСЁ ВРЕМЯ</span></div>
        <div id="statistics-chart-container" class="statistics-chart-container"><p>Загружаем график...</p></div>
      </section>
      <p class="statistics-footnote">График учитывает новые регистрации и удаления аккаунтов.</p>
      <section class="statistics-users-section" aria-label="Все пользователи Rebunar">
        <div class="statistics-users-heading">
          <h2>Пользователи сообщества</h2>
          <p>Просмотр участников и переход к их публичным профилям</p>
        </div>
        <div id="statistics-users-directory"></div>
      </section>
    </section>`;

  const totalElement=outlet.querySelector('#statistics-total');
  const onlineElement=outlet.querySelector('#statistics-online');
  const historyLabel=outlet.querySelector('#statistics-period-total');
  const chartContainer=outlet.querySelector('#statistics-chart-container');
  renderUsersScreen(outlet.querySelector('#statistics-users-directory'));
  try {
    const [summary,history]=await Promise.all([getStatisticsSummary(),getStatisticsHistory()]);
    const total=Number(summary.total_users??history.current_total??0);
    totalElement.textContent=total.toLocaleString('ru-RU');
    onlineElement.textContent=Number(summary.online_users??0).toLocaleString('ru-RU');
    const points=history.points||[],firstDate=points[0]?.date;
    historyLabel.textContent=firstDate
      ? `С ${formatDate(firstDate,{day:'numeric',month:'long',year:'numeric'})} · сейчас ${total.toLocaleString('ru-RU')}`
      : `Сейчас ${total.toLocaleString('ru-RU')} аккаунтов`;
    chartContainer.innerHTML=createChart(points,total);
  } catch(error) {
    totalElement.textContent='—'; onlineElement.textContent='—';
    chartContainer.innerHTML='<p class="statistics-error">Не удалось загрузить статистику.</p>';
    historyLabel.textContent=error.message||'Ошибка загрузки';
    console.error('Rebunar: ошибка статистики:',error);
  }
}
