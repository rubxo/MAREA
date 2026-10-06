import { isStoryActive, nextStoryIndex, storyProgress } from './story-state';

describe('ephemeral story playback', () => {
  it('expires exactly at the 24-hour deadline, even if the viewer was paused', () => {
    const created = Date.parse('2026-10-04T00:00:00Z');
    const story = { expiresAt: '2026-10-05T00:00:00Z' };
    expect(isStoryActive(story, created + 86_399_999)).toBe(true);
    expect(isStoryActive(story, created + 86_400_000)).toBe(false);
    expect(isStoryActive(story, created + 86_400_001)).toBe(false);
    expect(isStoryActive({ expiresAt: 'invalid' }, created)).toBe(false);
  });

  it('clamps progress and closes after the final story without indexing outside the list', () => {
    expect(storyProgress(-20)).toBe(0);
    expect(storyProgress(2500)).toBe(0.5);
    expect(storyProgress(7000)).toBe(1);
    expect(nextStoryIndex(0, -1, 3)).toBe(0);
    expect(nextStoryIndex(1, 1, 3)).toBe(2);
    expect(nextStoryIndex(2, 1, 3)).toBeNull();
  });
});
