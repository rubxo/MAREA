import { Story } from '../models';

export interface StoryRepository {
  getActiveStories(): Promise<readonly Story[]>;
  markViewed(storyId: string, viewedAt: string): Promise<void>;
}
