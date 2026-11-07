import './style.css';
import { getQuotes, getTopCoins } from './api/market';
import { type City, getWeather, type Weather } from './api/weather';
import { cityNow } from './ui/format';
import { setError, setLoading } from './ui/status';
import { renderCoins, renderQuotes, setupRangeButtons } from './widgets/market';
import { setupSearch } from './widgets/search';
import { renderWeather } from './widgets/weather';

/**
 * Orquestra o dashboard: guarda a cidade escolhida, busca os dados
 * e agenda as atualizações automáticas.
 */

const MARKET_EVERY = 60; // segundos — cotações mudam rápido
const WEATHER_EVERY = 10 * 60; // segundos — a previsão atualiza a cada ~15 min

const DEFAULT_CITY: City = { name: 'Uberlândia', region: 'Minas Gerais', country: 'Brasil', lat: -18.9186, lon: -48.2772 };
const STORAGE_KEY = 'pulse:city';

const q = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const weatherCards = ['.hero', '.details', '.hourly', '.week'].map((s) => q(s));
const fxCard = q('.fx');
const coinCards = [q('.coins'), q('.coin-detail')];

let city = loadCity();
let lastWeather: Weather | null = null;
let secondsToMarket = MARKET_EVERY;
let secondsToWeather = WEATHER_EVERY;
let lastUpdate: Date | null = null;

function loadCity(): City {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as City;
  } catch {
    /* modo anônimo ou storage bloqueado: segue com o padrão */
  }
  return DEFAULT_CITY;
}

function saveCity(c: City): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* sem problema, só não lembra da cidade na próxima visita */
  }
}

async function refreshWeather(): Promise<void> {
  setLoading(weatherCards, true);
  try {
    lastWeather = await getWeather(city);
    renderWeather(city, lastWeather);
    setError(weatherCards, null);
    markUpdated();
  } catch (err) {
    setError(weatherCards, (err as Error).message, refreshWeather);
  } finally {
    setLoading(weatherCards, false);
    secondsToWeather = WEATHER_EVERY;
  }
}

async function refreshMarket(): Promise<void> {
  // Câmbio e cripto vêm de APIs diferentes: rodam em paralelo e
  // um não derruba o outro (allSettled em vez de all).
  const [fx, crypto] = await Promise.allSettled([getQuotes(), getTopCoins()]);

  if (fx.status === 'fulfilled') {
    renderQuotes(fx.value);
    setError([fxCard], null);
  } else setError([fxCard], fx.reason.message, refreshMarket);

  if (crypto.status === 'fulfilled') {
    renderCoins(crypto.value);
    setError(coinCards, null);
  } else setError(coinCards, crypto.reason.message, refreshMarket);

  setLoading([fxCard, ...coinCards], false);
  secondsToMarket = MARKET_EVERY;
  markUpdated();
}

function markUpdated(): void {
  lastUpdate = new Date();
  tickLive();
}

/** Atualiza o indicador "ao vivo" do topo e o relógio da cidade. */
function tickLive(): void {
  const text = document.getElementById('live-text')!;
  if (!lastUpdate) return;
  const at = lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  text.textContent = `Ao vivo · ${at} · próxima em ${secondsToMarket}s`;
  if (lastWeather) {
    const time = document.getElementById('city-time')!;
    const place = [city.region, city.country].filter(Boolean).join(', ');
    time.textContent = `${place ? `${place} · ` : ''}${cityNow(lastWeather.utcOffset)}`;
  }
}

// Um único timer de 1s cuida de tudo: contagem regressiva e disparos.
setInterval(() => {
  // Aba em segundo plano? Não gasta requisição à toa.
  if (document.hidden) return;
  secondsToMarket--;
  secondsToWeather--;
  if (secondsToMarket <= 0) void refreshMarket();
  if (secondsToWeather <= 0) void refreshWeather();
  tickLive();
}, 1000);

// Voltou pra aba depois de muito tempo? Atualiza na hora.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && lastUpdate && Date.now() - lastUpdate.getTime() > MARKET_EVERY * 1000) {
    void refreshMarket();
  }
});

setupSearch((picked) => {
  city = picked;
  saveCity(picked);
  void refreshWeather();
});
setupRangeButtons();

setLoading([...weatherCards, fxCard, ...coinCards], true);
void refreshWeather();
void refreshMarket();
