import { type City, searchCities } from '../api/weather';
import { esc } from '../ui/format';

/**
 * Busca de cidade com autocomplete:
 *  - debounce (espera o usuário parar de digitar antes de chamar a API)
 *  - navegação por teclado (↑ ↓ Enter Esc)
 *  - botão de geolocalização
 */
export function setupSearch(onPick: (city: City) => void): void {
  const input = document.getElementById('city-input') as HTMLInputElement;
  const list = document.getElementById('city-results') as HTMLUListElement;
  const geo = document.getElementById('geo-btn') as HTMLButtonElement;

  let results: City[] = [];
  let active = -1;
  let timer = 0;
  let lastQuery = '';

  const close = () => {
    list.hidden = true;
    active = -1;
  };

  const pick = (c: City) => {
    input.value = '';
    input.blur();
    close();
    onPick(c);
  };

  const render = () => {
    if (results.length === 0) {
      list.innerHTML = `<li class="empty">Nenhuma cidade encontrada</li>`;
    } else {
      list.innerHTML = results
        .map(
          (c, i) => `
          <li role="option" data-i="${i}" class="${i === active ? 'on' : ''}" aria-selected="${i === active}">
            <b>${esc(c.name)}</b><span>${esc([c.region, c.country].filter(Boolean).join(', '))}</span>
          </li>`,
        )
        .join('');
    }
    list.hidden = false;
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) return close();
    timer = window.setTimeout(async () => {
      lastQuery = q;
      try {
        const found = await searchCities(q);
        if (q !== lastQuery) return; // usuário já digitou outra coisa
        results = found;
        active = found.length ? 0 : -1;
        render();
      } catch {
        results = [];
        render();
      }
    }, 300);
  });

  input.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      active = (active + dir + results.length) % results.length;
      render();
    } else if (e.key === 'Enter' && results[active]) {
      pick(results[active]);
    } else if (e.key === 'Escape') {
      close();
    }
  });

  // mousedown (e não click) pra disparar antes do blur do input fechar a lista.
  list.addEventListener('mousedown', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLLIElement>('li[data-i]');
    if (li) pick(results[Number(li.dataset.i)]);
  });
  input.addEventListener('blur', () => setTimeout(close, 100));

  geo.addEventListener('click', () => {
    if (!navigator.geolocation) return;
    geo.classList.add('busy');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geo.classList.remove('busy');
        onPick({ name: 'Minha localização', region: '', country: '', lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => geo.classList.remove('busy'),
      { timeout: 10_000 },
    );
  });
}
