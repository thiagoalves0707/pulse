/**
 * Formatadores usando a API Intl do navegador — moeda, números e datas
 * no padrão brasileiro sem nenhuma biblioteca extra.
 */
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function money(v: number): string {
  // Moedas muito baratas (ex: R$ 0,0004) precisam de mais casas decimais.
  if (Math.abs(v) < 1) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumSignificantDigits: 4 });
  }
  return brl.format(v);
}

export const moneyCompact = (v: number): string => brlCompact.format(v);

export function pct(v: number): string {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export const temp = (v: number): string => `${Math.round(v)}°`;

/** "2026-11-07T14:00" → "14h" (a Open-Meteo já manda no horário local da cidade). */
export const hourLabel = (iso: string): string => `${iso.slice(11, 13)}h`;

/** "2026-11-07T05:31" → "05:31" */
export const clock = (iso: string): string => iso.slice(11, 16);

/** "2026-11-07" → "sáb" */
export function weekday(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
}

/** Data e hora "de agora" no fuso da cidade (offset vindo da API). */
export function cityNow(utcOffsetSeconds: number): string {
  const d = new Date(Date.now() + utcOffsetSeconds * 1000);
  return d.toLocaleString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

/** Graus → ponto cardeal (0° = Norte). */
export function compass(deg: number): string {
  const dirs = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8];
}

/** Escapa texto vindo de API antes de colocar no innerHTML. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
