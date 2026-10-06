type Receipt = { storyId: string; viewedAt: string; expiresAt: string; pending: boolean };

const storageKey = (userId: string) => `marea-story-views:${userId}`;

function readReceipts(userId: string): Receipt[] {
  try {
    const value = localStorage.getItem(storageKey(userId));
    return value ? JSON.parse(value) as Receipt[] : [];
  } catch {
    return [];
  }
}

function writeReceipts(userId: string, receipts: Receipt[]): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(receipts));
}

export async function readStoryViews(userId: string): Promise<Map<string, string>> {
  const active = readReceipts(userId).filter((receipt) => Date.parse(receipt.expiresAt) > Date.now());
  writeReceipts(userId, active);
  return new Map(active.map((receipt) => [receipt.storyId, receipt.viewedAt]));
}

export async function rememberStoryView(userId: string, storyId: string, expiresAt: string): Promise<void> {
  const receipts = readReceipts(userId);
  if (!receipts.some((receipt) => receipt.storyId === storyId)) {
    receipts.push({ storyId, viewedAt: new Date().toISOString(), expiresAt, pending: true });
    writeReceipts(userId, receipts);
  }
}

const syncing = new Set<string>();
export async function syncStoryViews(userId: string, send: (id: string, at: string) => Promise<void>): Promise<void> {
  if (syncing.has(userId)) return;
  syncing.add(userId);
  try {
    const receipts = readReceipts(userId);
    for (const receipt of receipts) {
      if (!receipt.pending) continue;
      if (Date.parse(receipt.expiresAt) > Date.now()) await send(receipt.storyId, receipt.viewedAt);
      receipt.pending = false;
    }
    writeReceipts(userId, receipts);
  } finally {
    syncing.delete(userId);
  }
}
