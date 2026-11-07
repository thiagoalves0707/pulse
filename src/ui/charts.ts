import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

/**
 * Registramos só as peças do Chart.js que usamos (tree-shaking):
 * o bundle fica bem menor do que importar 'chart.js/auto'.
 */
Chart.register(LineController, LineElement, PointElement, BarController, BarElement, LinearScale, CategoryScale, Filler, Tooltip);

Chart.defaults.color = '#8b93b0';
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.borderColor = '#1c2440';

export const tooltipStyle = {
  backgroundColor: '#0b1124ee',
  borderColor: '#2a3558',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 10,
  titleFont: { weight: 600 as const },
  displayColors: false,
};

/** Degradê vertical pra preencher a área embaixo das linhas. */
export function verticalGradient(chart: Chart, color: string): CanvasGradient | string {
  const { ctx, chartArea } = chart;
  if (!chartArea) return color; // primeiro render: área ainda não calculada
  const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, `${color}66`);
  g.addColorStop(1, `${color}00`);
  return g;
}

export { Chart };
