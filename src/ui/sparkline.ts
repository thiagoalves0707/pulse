/**
 * Mini gráfico (sparkline) desenhado direto num <canvas>.
 * Chart.js seria exagero pra 8 gráficos minúsculos numa tabela —
 * aqui são ~30 linhas e zero overhead.
 */
export function drawSparkline(canvas: HTMLCanvasElement, values: number[], color: string): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 100;
  const h = canvas.clientHeight || 32;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  if (values.length < 2) return;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - 2 - ((v - min) / span) * (h - 4);

  ctx.beginPath();
  values.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Preenchimento em degradê embaixo da linha.
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, `${color}55`);
  grad.addColorStop(1, `${color}00`);
  ctx.fillStyle = grad;
  ctx.fill();
}
