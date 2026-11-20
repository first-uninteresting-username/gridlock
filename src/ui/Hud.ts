/** DOM overlay for status text. DOM keeps text sharp on any display and is easy to style. */
export class Hud {
  private readonly status = document.getElementById('hud')!;
  private last = '';

  setStatus(text: string): void {
    if (text === this.last) return;
    this.last = text;
    this.status.textContent = text;
  }
}
