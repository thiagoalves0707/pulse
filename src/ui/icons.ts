import type { Sky } from '../api/weather';

/**
 * Ícones de clima em SVG animados só com CSS (classes .i-*).
 * Nada de imagem externa: carregam instantâneo e escalam em qualquer tamanho.
 */
const sun = `<g class="i-sun"><circle cx="32" cy="32" r="11" fill="#fbbf24"/><g stroke="#fbbf24" stroke-width="3" stroke-linecap="round">${Array.from(
  { length: 8 },
  (_, i) => {
    const a = (i * Math.PI) / 4;
    const x1 = 32 + Math.cos(a) * 17;
    const y1 = 32 + Math.sin(a) * 17;
    const x2 = 32 + Math.cos(a) * 23;
    const y2 = 32 + Math.sin(a) * 23;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  },
).join('')}</g></g>`;

const moon = `<path class="i-moon" d="M40 14a18 18 0 1 0 10 30A15 15 0 0 1 40 14z" fill="#c7d2fe"/>`;

const cloud = (fill = '#e2e8f0', dx = 0, dy = 0) =>
  `<path class="i-cloud" transform="translate(${dx} ${dy})" d="M20 46h26a10 10 0 0 0 0-20 14 14 0 0 0-27-2A11 11 0 0 0 20 46z" fill="${fill}"/>`;

const drops = (n: number, color = '#60a5fa') =>
  `<g class="i-rain" stroke="${color}" stroke-width="3" stroke-linecap="round">${Array.from(
    { length: n },
    (_, i) => `<line x1="${24 + i * 8}" y1="50" x2="${21 + i * 8}" y2="57" style="animation-delay:${i * 0.2}s"/>`,
  ).join('')}</g>`;

export function weatherIcon(sky: Sky, isDay: boolean): string {
  const orb = isDay ? sun : moon;
  let body: string;
  switch (sky) {
    case 'clear':
      body = orb;
      break;
    case 'partly':
      body = `<g transform="translate(-8 -8) scale(.85)">${orb}</g>${cloud('#e2e8f0', 4, 4)}`;
      break;
    case 'cloudy':
      body = `${cloud('#94a3b8', -6, -6)}${cloud('#e2e8f0', 4, 2)}`;
      break;
    case 'fog':
      body = `${cloud('#cbd5e1', 0, -6)}<g class="i-fog" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"><line x1="14" y1="48" x2="50" y2="48"/><line x1="20" y1="55" x2="46" y2="55"/></g>`;
      break;
    case 'drizzle':
      body = `${cloud('#cbd5e1', 0, -6)}${drops(3, '#93c5fd')}`;
      break;
    case 'rain':
      body = `${cloud('#94a3b8', 0, -6)}${drops(4)}`;
      break;
    case 'snow':
      body = `${cloud('#e2e8f0', 0, -6)}<g class="i-snow" fill="#fff">${[24, 34, 44].map((x, i) => `<circle cx="${x}" cy="53" r="2.6" style="animation-delay:${i * 0.4}s"/>`).join('')}</g>`;
      break;
    case 'storm':
      body = `${cloud('#64748b', 0, -8)}<path class="i-bolt" d="M34 40l-8 12h7l-3 10 11-15h-7l4-7z" fill="#facc15"/>${drops(2)}`;
      break;
  }
  return `<svg class="wx-icon" viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
}
