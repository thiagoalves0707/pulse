import { getJson } from './http';

/**
 * Clima via Open-Meteo: gratuito, sem chave de API e com dados de
 * modelos meteorológicos oficiais (ECMWF, NOAA, DWD...).
 */

export interface City {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
}

export interface Weather {
  /** Diferença do fuso da cidade pra UTC, em segundos. */
  utcOffset: number;
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    wind: number;
    windDir: number;
    pressure: number;
    code: number;
    isDay: boolean;
  };
  hourly: Array<{ time: string; temp: number; rainChance: number; code: number; isDay: boolean }>;
  daily: Array<{
    date: string;
    code: number;
    max: number;
    min: number;
    rainChance: number;
    uv: number;
    sunrise: string;
    sunset: string;
  }>;
}

interface GeoResponse {
  results?: Array<{ name: string; admin1?: string; country: string; latitude: number; longitude: number }>;
}

export async function searchCities(query: string): Promise<City[]> {
  if (query.trim().length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=pt`;
  const data = await getJson<GeoResponse>(url, 60_000);
  return (data.results ?? []).map((r) => ({
    name: r.name,
    region: r.admin1 ?? '',
    country: r.country,
    lat: r.latitude,
    lon: r.longitude,
  }));
}

/** Formato cru que a Open-Meteo devolve: um array por variável. */
interface ForecastResponse {
  utc_offset_seconds: number;
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    surface_pressure: number;
    weather_code: number;
    is_day: number;
  };
  hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: number[]; weather_code: number[]; is_day: number[] };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    uv_index_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

export async function getWeather(city: City): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(city.lat),
    longitude: String(city.lon),
    current:
      'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code,is_day',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset',
    forecast_hours: '25',
    forecast_days: '7',
    timezone: 'auto',
  });
  const d = await getJson<ForecastResponse>(`https://api.open-meteo.com/v1/forecast?${params}`, 5 * 60_000);

  // Transforma "colunas" (um array por variável) em "linhas" (um objeto por hora/dia),
  // que é bem mais fácil de usar na interface.
  return {
    utcOffset: d.utc_offset_seconds,
    current: {
      temp: d.current.temperature_2m,
      feelsLike: d.current.apparent_temperature,
      humidity: d.current.relative_humidity_2m,
      wind: d.current.wind_speed_10m,
      windDir: d.current.wind_direction_10m,
      pressure: d.current.surface_pressure,
      code: d.current.weather_code,
      isDay: d.current.is_day === 1,
    },
    hourly: d.hourly.time.map((time, i) => ({
      time,
      temp: d.hourly.temperature_2m[i],
      rainChance: d.hourly.precipitation_probability[i] ?? 0,
      code: d.hourly.weather_code[i],
      isDay: d.hourly.is_day[i] === 1,
    })),
    daily: d.daily.time.map((date, i) => ({
      date,
      code: d.daily.weather_code[i],
      max: d.daily.temperature_2m_max[i],
      min: d.daily.temperature_2m_min[i],
      rainChance: d.daily.precipitation_probability_max[i] ?? 0,
      uv: d.daily.uv_index_max[i],
      sunrise: d.daily.sunrise[i],
      sunset: d.daily.sunset[i],
    })),
  };
}

export type Sky = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

/**
 * Traduz os códigos WMO (padrão da Organização Meteorológica Mundial)
 * pra texto em português + o tipo de ícone.
 */
export function describe(code: number): { label: string; sky: Sky } {
  if (code === 0) return { label: 'Céu limpo', sky: 'clear' };
  if (code === 1) return { label: 'Predominantemente limpo', sky: 'clear' };
  if (code === 2) return { label: 'Parcialmente nublado', sky: 'partly' };
  if (code === 3) return { label: 'Nublado', sky: 'cloudy' };
  if (code === 45 || code === 48) return { label: 'Neblina', sky: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'Garoa', sky: 'drizzle' };
  if (code === 61) return { label: 'Chuva fraca', sky: 'rain' };
  if (code === 63) return { label: 'Chuva moderada', sky: 'rain' };
  if (code === 65) return { label: 'Chuva forte', sky: 'rain' };
  if (code === 66 || code === 67) return { label: 'Chuva congelante', sky: 'rain' };
  if (code >= 71 && code <= 77) return { label: 'Neve', sky: 'snow' };
  if (code >= 80 && code <= 82) return { label: 'Pancadas de chuva', sky: 'rain' };
  if (code === 85 || code === 86) return { label: 'Pancadas de neve', sky: 'snow' };
  if (code === 95) return { label: 'Trovoadas', sky: 'storm' };
  if (code === 96 || code === 99) return { label: 'Trovoadas com granizo', sky: 'storm' };
  return { label: 'Indefinido', sky: 'cloudy' };
}
