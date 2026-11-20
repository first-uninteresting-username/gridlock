/** DOM overlay for status text. DOM keeps text sharp on any display and is easy to style. */
export class Hud {
  private readonly status = document.getElementById('hud')!;
  private readonly wantedEl = document.getElementById('wanted')!;
  private last = '';
  private lastWanted = -1;

  setStatus(text: string): void {
    if (text === this.last) return;
    this.last = text;
    this.status.textContent = text;
  }

  /** Wanted stars: `level` filled out of `max`. */
  setWanted(level: number, max: number): void {
    if (level === this.lastWanted) return;
    this.lastWanted = level;
    this.wantedEl.textContent = '★'.repeat(level) + '☆'.repeat(max - level);
  }
}
