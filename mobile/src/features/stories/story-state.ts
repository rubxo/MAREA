import { Story } from '@/domain/models/story';

export const STORY_DURATION_MS = 5_000;

export function isStoryActive(story: Pick<Story, 'expiresAt'>, now = Date.now()): boolean {
  return Date.parse(story.expiresAt) > now;
}

export function storyProgress(elapsed: number): number {
  return Math.min(1, Math.max(0, elapsed / STORY_DURATION_MS));
}

export function nextStoryIndex(index: number, direction: -1 | 1, count: number): number | null {
  const next = index + direction;
  return next >= count ? null : Math.max(0, next);
}

export function activeStories(stories: readonly Story[], now = Date.now()): Story[] {
  return stories.filter((story) => isStoryActive(story, now));
}
