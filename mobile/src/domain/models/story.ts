import { ProfileSummary } from './profile';

export type Story = Readonly<{
  id: string;
  author: ProfileSummary;
  mediaUrl: string;
  createdAt: string;
  expiresAt: string;
  viewedAt: string | null;
}>;
