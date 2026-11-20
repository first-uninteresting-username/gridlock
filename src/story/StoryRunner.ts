import { Story } from 'inkjs';

export interface StoryBeat {
  /** Lines of text produced since the last choice. */
  lines: { text: string; tags: string[] }[];
  /** Choices now on offer; empty when the current knot has ended. */
  choices: string[];
}

/**
 * Thin wrapper over an Ink story (https://www.inklestudios.com/ink/).
 * `.ink` files are compiled to JSON at build time by the Vite plugin in tools/ink-plugin.ts,
 * so `import story from './main.ink'` gives you the compiled story.
 */
export class StoryRunner {
  private readonly story: Story;

  constructor(compiled: object) {
    this.story = new Story(compiled as Record<string, unknown>);
  }

  /** Jump to a knot, e.g. a mission briefing: `runner.goTo('intro')`. */
  goTo(knot: string): StoryBeat {
    this.story.ChoosePathString(knot);
    return this.continue();
  }

  continue(): StoryBeat {
    const lines: StoryBeat['lines'] = [];
    while (this.story.canContinue) {
      const text = (this.story.Continue() ?? '').trim();
      if (text) lines.push({ text, tags: this.story.currentTags ?? [] });
    }
    return { lines, choices: this.story.currentChoices.map((c) => c.text) };
  }

  choose(index: number): StoryBeat {
    this.story.ChooseChoiceIndex(index);
    return this.continue();
  }

  getVar(name: string): unknown {
    return this.story.variablesState.$(name);
  }

  setVar(name: string, value: string | number | boolean): void {
    this.story.variablesState.$(name, value);
  }

  /** Full story state as JSON, for save games. */
  save(): string {
    return this.story.state.ToJson();
  }

  load(json: string): void {
    this.story.state.LoadJson(json);
  }
}
