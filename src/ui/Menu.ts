/** Pause menu overlay (controls and settings). DOM-based; the in-game HUD is drawn in the canvas. */
export class Menu {
  private readonly root = document.getElementById('menu')!;
  private readonly aimBox = document.getElementById('opt-mouse-aim') as HTMLInputElement;
  private readonly saveBtn = document.getElementById('menu-save') as HTMLButtonElement;
  /** Fired whenever the menu opens or closes. */
  onToggle: (open: boolean) => void = () => {};
  /** Fired when the player asks to save the current run. */
  onSave: () => void = () => {};

  constructor() {
    document.getElementById('menu-btn')!.addEventListener('click', (e) => { (e.currentTarget as HTMLElement).blur(); this.toggle(); });
    document.getElementById('menu-resume')!.addEventListener('click', () => this.set(false));
    this.saveBtn.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      this.onSave();
      this.saveBtn.textContent = 'Saved!';
      window.setTimeout(() => { this.saveBtn.textContent = 'Save game'; }, 1000);
    });
    // Clicking the dimmed backdrop (not the panel) also resumes.
    this.root.addEventListener('click', (e) => { if (e.target === this.root) this.set(false); });
  }

  get open(): boolean {
    return this.root.classList.contains('open');
  }

  get mouseAim(): boolean {
    return this.aimBox.checked;
  }

  toggle(): void {
    this.set(!this.open);
  }

  set(open: boolean): void {
    if (open === this.open) return;
    this.root.classList.toggle('open', open);
    if (!open && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    this.onToggle(open);
  }
}
