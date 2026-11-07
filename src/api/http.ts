/**
 * fetch com timeout, erro amigável e cache curto em memória.
 *
 * O cache evita bater na API de novo quando o usuário fica trocando
 * de aba/moeda — a CoinGecko gratuita, por exemplo, limita ~30 req/min.
 */
const cache = new Map<string, { at: number; data: unknown }>();

export class ApiError extends Error {}

export async function getJson<T>(url: string, ttlMs = 0): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (res.status === 429) throw new ApiError('Muitas requisições — a API pediu um respiro. Tenta de novo em 1 minuto.');
    if (!res.ok) throw new ApiError(`A API respondeu com erro ${res.status}.`);
    const data = (await res.json()) as T;
    cache.set(url, { at: Date.now(), data });
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === 'AbortError') throw new ApiError('A API demorou demais pra responder.');
    throw new ApiError('Sem conexão com a API. Verifique sua internet.');
  } finally {
    clearTimeout(timer);
  }
}
