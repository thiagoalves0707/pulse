import { type Coin, getCoinHistory, type Quote, type Range } from '../api/market';
import { Chart, tooltipStyle, verticalGradient } from '../ui/charts';
import { esc, money, moneyCompact, pct } from '../ui/format';
import { drawSparkline } from '../ui/sparkline';

const $ = (id: string) => document.getElementById(id)!;
const UP = '#34d399';
const DOWN = '#f87171';
/** Símbolo + cor de cada moeda (emoji de bandeira não aparece no Windows). */
const SYMBOLS: Record<string, [string, string]> = {
  USD: ['$', '#22c55e'],
  EUR: ['€', '#3b82f6'],
  GBP: ['£', '#a855f7'],
  ARS: ['$', '#38bdf8'],
};

let coins: Coin[] = [];
let selected = 'bitcoin';
let range: Range = 7;
let coinChart: Chart<'line', number[], string> | null = null;

// ─────────────────────────────── Câmbio ───────────────────────────────

export function renderQuotes(quotes: Quote[]): void {
  $('fx').innerHTML = quotes
    .map((q) => {
      const up = q.pctChange >= 0;
      // Moedas como o peso argentino valem centavos — mostramos com mais casas.
      const value = q.bid < 0.1 ? q.bid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 }) : money(q.bid);
      return `
        <div class="fx-item">
          <div class="fx-top"><span class="sym" style="--c:${(SYMBOLS[q.code] ?? ['¤', '#94a3b8'])[1]}">${(SYMBOLS[q.code] ?? ['¤'])[0]}</span><b>${q.code}</b><span class="muted">${esc(q.name)}</span></div>
          <div class="fx-value">${value}</div>
          <div class="fx-foot">
            <span class="chg ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${pct(q.pctChange)}</span>
            <span class="muted small">mín ${money(q.low)} · máx ${money(q.high)}</span>
          </div>
        </div>`;
    })
    .join('');
}

// ─────────────────────────────── Cripto ───────────────────────────────

export function renderCoins(list: Coin[]): void {
  coins = list;
  const ul = $('coin-list');
  ul.innerHTML = list
    .map(
      (c) => `
      <li data-id="${esc(c.id)}" class="${c.id === selected ? 'on' : ''}" tabindex="0" role="button" aria-label="Ver gráfico de ${esc(c.name)}">
        <img src="${esc(c.image)}" alt="" width="28" height="28" loading="lazy" />
        <span class="coin-name"><b>${esc(c.name)}</b><small>${esc(c.symbol)}</small></span>
        <canvas class="spark"></canvas>
        <span class="coin-price"><b>${money(c.price)}</b><small class="chg ${c.change24h >= 0 ? 'up' : 'down'}">${pct(c.change24h)}</small></span>
      </li>`,
    )
    .join('');

  // Desenha os sparklines depois que o HTML está no DOM (precisamos do tamanho do canvas).
  ul.querySelectorAll<HTMLLIElement>('li').forEach((li, i) => {
    const c = list[i];
    drawSparkline(li.querySelector('canvas')!, c.sparkline, c.change7d >= 0 ? UP : DOWN);
    const pick = () => selectCoin(c.id);
    li.addEventListener('click', pick);
    li.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && pick());
  });

  renderCoinTitle();
  void loadCoinChart();
}

function selectCoin(id: string): void {
  selected = id;
  document.querySelectorAll('#coin-list li').forEach((li) => li.classList.toggle('on', (li as HTMLElement).dataset.id === id));
  renderCoinTitle();
  void loadCoinChart();
}

function renderCoinTitle(): void {
  const c = coins.find((x) => x.id === selected);
  if (!c) return;
  $('coin-title').innerHTML = `
    <img src="${esc(c.image)}" alt="" width="36" height="36" />
    <div>
      <h2>${esc(c.name)} <span class="muted">${esc(c.symbol)}</span></h2>
      <p><b class="mono">${money(c.price)}</b>
        <span class="chg ${c.change7d >= 0 ? 'up' : 'down'}">${pct(c.change7d)} em 7d</span>
        <span class="muted small">· cap. ${moneyCompact(c.marketCap)}</span></p>
    </div>`;
}

export function setupRangeButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('#range button').forEach((btn) =>
    btn.addEventListener('click', () => {
      range = Number(btn.dataset.days) as Range;
      document.querySelectorAll('#range button').forEach((b) => b.classList.toggle('on', b === btn));
      void loadCoinChart();
    }),
  );
}

/** Contador pra ignorar respostas atrasadas se o usuário clicar rápido em várias moedas. */
let requestId = 0;

async function loadCoinChart(): Promise<void> {
  const myId = ++requestId;
  const box = $('coin-chart').parentElement!;
  box.classList.add('loading');
  try {
    const prices = await getCoinHistory(selected, range);
    if (myId !== requestId) return; // chegou uma resposta mais nova, descarta essa
    drawCoinChart(prices);
    box.classList.remove('error');
  } catch (err) {
    if (myId !== requestId) return;
    box.classList.add('error');
    box.dataset.error = (err as Error).message;
  } finally {
    if (myId === requestId) box.classList.remove('loading');
  }
}

function drawCoinChart(prices: Array<[number, number]>): void {
  const up = prices.length > 1 && prices[prices.length - 1][1] >= prices[0][1];
  const color = up ? UP : DOWN;
  const labels = prices.map(([t]) =>
    new Date(t).toLocaleString('pt-BR', range === 1 ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short' }),
  );
  const data = prices.map(([, p]) => p);

  if (coinChart) {
    coinChart.data.labels = labels;
    const ds = coinChart.data.datasets[0];
    ds.data = data;
    ds.borderColor = color;
    ds.backgroundColor = (ctx) => verticalGradient(ctx.chart, color);
    coinChart.update();
    return;
  }

  coinChart = new Chart($('coin-chart') as HTMLCanvasElement, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          data,
          borderColor: color,
          backgroundColor: (ctx) => verticalGradient(ctx.chart, color),
          fill: true,
          tension: 0.25,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: { ...tooltipStyle, callbacks: { label: (item) => money(Number(item.raw)) } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 7, maxRotation: 0 } },
        y: { position: 'right', ticks: { callback: (v) => moneyCompact(Number(v)) }, grid: { color: '#1c244055' } },
      },
    },
  });
}
