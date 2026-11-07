import { getJson } from './http';

/**
 * Dados de mercado:
 *  - Criptomoedas → CoinGecko (plano gratuito, sem chave)
 *  - Câmbio       → AwesomeAPI (cotações brasileiras em tempo real)
 */

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  /** Preços horários dos últimos 7 dias (pro mini gráfico). */
  sparkline: number[];
}

interface MarketsResponseItem {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
  sparkline_in_7d?: { price: number[] };
}

export async function getTopCoins(limit = 8): Promise<Coin[]> {
  const url =
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=brl&order=market_cap_desc' +
    `&per_page=${limit}&page=1&sparkline=true&price_change_percentage=24h,7d`;
  const data = await getJson<MarketsResponseItem[]>(url, 50_000);
  return data.map((c) => ({
    id: c.id,
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    image: c.image,
    price: c.current_price,
    change24h: c.price_change_percentage_24h_in_currency ?? 0,
    change7d: c.price_change_percentage_7d_in_currency ?? 0,
    marketCap: c.market_cap,
    sparkline: c.sparkline_in_7d?.price ?? [],
  }));
}

export type Range = 1 | 7 | 30 | 90;

/** Histórico de preço de uma moeda: lista de [timestamp, preço]. */
export async function getCoinHistory(id: string, days: Range): Promise<Array<[number, number]>> {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=brl&days=${days}`;
  const data = await getJson<{ prices: Array<[number, number]> }>(url, 5 * 60_000);
  return data.prices;
}

export interface Quote {
  code: string;
  name: string;
  bid: number;
  pctChange: number;
  high: number;
  low: number;
}

interface AwesomeQuote {
  code: string;
  name: string;
  bid: string;
  pctChange: string;
  high: string;
  low: string;
}

export async function getQuotes(): Promise<Quote[]> {
  const pairs = ['USD-BRL', 'EUR-BRL', 'GBP-BRL', 'ARS-BRL'];
  const data = await getJson<Record<string, AwesomeQuote>>(
    `https://economia.awesomeapi.com.br/json/last/${pairs.join(',')}`,
    50_000,
  );
  // A API devolve valores como string ("5.503") — convertemos pra número.
  return Object.values(data).map((q) => ({
    code: q.code,
    name: q.name.split('/')[0],
    bid: Number(q.bid),
    pctChange: Number(q.pctChange),
    high: Number(q.high),
    low: Number(q.low),
  }));
}
