import { type City, describe, type Weather } from '../api/weather';
import { Chart, tooltipStyle, verticalGradient } from '../ui/charts';
import { cityNow, clock, compass, esc, hourLabel, temp, weekday } from '../ui/format';
import { weatherIcon } from '../ui/icons';

const $ = (id: string) => document.getElementById(id)!;

let hourlyChart: Chart<'line' | 'bar', number[], string> | null = null;

/** Desenha todos os cards de clima a partir de uma resposta da API. */
export function renderWeather(city: City, w: Weather): void {
  renderHero(city, w);
  renderDetails(w);
  renderHourly(w);
  renderWeek(w);
}

function renderHero(city: City, w: Weather): void {
  const { label, sky } = describe(w.current.code);
  const today = w.daily[0];
  // O fundo do card muda conforme o céu e o horário (ver style.css → [data-sky]).
  $('hero').dataset.sky = `${sky}-${w.current.isDay ? 'day' : 'night'}`;
  $('city-name').textContent = city.name;
  $('city-time').textContent = `${[city.region, city.country].filter(Boolean).join(', ')} · ${cityNow(w.utcOffset)}`;
  $('hero-icon').innerHTML = weatherIcon(sky, w.current.isDay);
  $('hero-temp').textContent = temp(w.current.temp);
  $('hero-label').textContent = label;
  $('hero-sub').textContent = `Sensação de ${temp(w.current.feelsLike)} · Máx ${temp(today.max)} · Mín ${temp(today.min)}`;
}

function renderDetails(w: Weather): void {
  const c = w.current;
  const today = w.daily[0];
  const uvLevel = today.uv < 3 ? 'baixo' : today.uv < 6 ? 'moderado' : today.uv < 8 ? 'alto' : today.uv < 11 ? 'muito alto' : 'extremo';

  const tiles: Array<[string, string, string]> = [
    ['Vento', `${Math.round(c.wind)} km/h`, `vindo do ${compass(c.windDir)}`],
    ['Umidade', `${c.humidity}%`, c.humidity < 30 ? 'ar seco, beba água!' : c.humidity > 80 ? 'abafado' : 'confortável'],
    ['Índice UV', today.uv.toFixed(1), uvLevel],
    ['Chuva hoje', `${today.rainChance}%`, 'chance máxima'],
    ['Nascer do sol', clock(today.sunrise), 'horário local'],
    ['Pôr do sol', clock(today.sunset), `${Math.round(c.pressure)} hPa`],
  ];

  $('details-tiles').innerHTML = tiles
    .map(([k, v, sub]) => `<div class="tile"><span>${k}</span><b>${v}</b><small>${sub}</small></div>`)
    .join('');
}

function renderHourly(w: Weather): void {
  const hours = w.hourly.slice(0, 25);
  const labels = hours.map((h, i) => (i === 0 ? 'Agora' : hourLabel(h.time)));
  const temps = hours.map((h) => h.temp);
  const rain = hours.map((h) => h.rainChance);

  // Se o gráfico já existe, só troca os dados: o Chart.js anima a transição.
  if (hourlyChart) {
    hourlyChart.data.labels = labels;
    hourlyChart.data.datasets[0].data = temps;
    hourlyChart.data.datasets[1].data = rain;
    hourlyChart.update();
    return;
  }

  const canvas = $('hourly-chart') as HTMLCanvasElement;
  hourlyChart = new Chart(canvas, {
    data: {
      labels,
      datasets: [
        {
          type: 'line',
          label: 'Temperatura',
          data: temps,
          yAxisID: 'y',
          borderColor: '#fb923c',
          backgroundColor: (ctx: { chart: Chart }) => verticalGradient(ctx.chart, '#fb923c'),
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
        {
          type: 'bar',
          label: 'Chuva',
          data: rain,
          yAxisID: 'rain',
          backgroundColor: '#60a5fa55',
          borderRadius: 4,
          barPercentage: 0.6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          ...tooltipStyle,
          callbacks: {
            label: (item) => (item.datasetIndex === 0 ? `🌡 ${Number(item.raw).toFixed(1)} °C` : `💧 ${item.raw}% de chance de chuva`),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
        y: { position: 'left', ticks: { callback: (v) => `${v}°` }, grid: { color: '#1c244055' } },
        rain: { position: 'right', min: 0, max: 100, display: false },
      },
    },
  });
}

function renderWeek(w: Weather): void {
  // A barrinha de cada dia é posicionada na escala da SEMANA inteira,
  // então dá pra comparar de relance qual dia vai ser mais quente.
  const weekMin = Math.min(...w.daily.map((d) => d.min));
  const weekMax = Math.max(...w.daily.map((d) => d.max));
  const span = weekMax - weekMin || 1;

  $('week-list').innerHTML = w.daily
    .map((d, i) => {
      const { label, sky } = describe(d.code);
      const left = ((d.min - weekMin) / span) * 100;
      const width = ((d.max - d.min) / span) * 100;
      return `
        <li title="${esc(label)}">
          <span class="day">${i === 0 ? 'Hoje' : weekday(d.date)}</span>
          <span class="mini-icon">${weatherIcon(sky, true)}</span>
          <span class="rain ${d.rainChance >= 40 ? 'show' : ''}">${d.rainChance}%</span>
          <span class="t-min">${temp(d.min)}</span>
          <span class="range"><i style="left:${left}%;width:${Math.max(width, 4)}%"></i></span>
          <span class="t-max">${temp(d.max)}</span>
        </li>`;
    })
    .join('');
}
