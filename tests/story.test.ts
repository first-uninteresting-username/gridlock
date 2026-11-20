import { describe, expect, it } from 'vitest';
import story from '../src/story/main.ink';
import { StoryRunner } from '../src/story/StoryRunner';

describe('story', () => {
  it('compiles main.ink and plays the intro', () => {
    const runner = new StoryRunner(story);
    const beat = runner.goTo('intro');
    expect(beat.lines[0].text).toMatch(/phone rings/);
    expect(beat.choices).toEqual(['Answer it', 'Walk away']);
    expect(runner.choose(0).lines[0].text).toMatch(/driver/);
  });

  it('round-trips variables through a save', () => {
    const a = new StoryRunner(story);
    a.setVar('cash', 250);
    const b = new StoryRunner(story);
    b.load(a.save());
    expect(b.getVar('cash')).toBe(250);
  });
});
