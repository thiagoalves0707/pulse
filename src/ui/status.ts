/**
 * Estados de carregamento e erro de cada card.
 *
 * Cada card falha sozinho: se a CoinGecko cair, o clima continua
 * funcionando normalmente — o card de cripto só mostra o aviso
 * com um botão de "tentar de novo".
 */
export function setLoading(cards: HTMLElement[], on: boolean): void {
  cards.forEach((c) => c.classList.toggle('loading', on));
}

export function setError(cards: HTMLElement[], message: string | null, retry?: () => void): void {
  for (const card of cards) {
    card.querySelector('.card-msg')?.remove();
    card.classList.toggle('has-error', message !== null);
    if (message === null) continue;

    const box = document.createElement('div');
    box.className = 'card-msg';
    box.innerHTML = `<span>⚠️</span><p></p>`;
    box.querySelector('p')!.textContent = message;
    if (retry) {
      const btn = document.createElement('button');
      btn.textContent = 'Tentar de novo';
      btn.addEventListener('click', retry);
      box.append(btn);
    }
    card.append(box);
  }
}
