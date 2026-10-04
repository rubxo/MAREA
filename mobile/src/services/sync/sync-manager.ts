import type { SyncOperation } from '@/domain/models/sync';

import type { SyncQueue } from './sync-queue';

export interface SyncExecutor {
  execute(operation: SyncOperation): Promise<void>;
}

export class SyncManager {
  private activeRun: Promise<void> | null = null;
  private runRequested = false;

  constructor(
    private readonly queue: SyncQueue,
    private readonly executor: SyncExecutor,
  ) {}

  requestRun(): Promise<void> {
    this.runRequested = true;
    this.activeRun ??= this.drain().finally(() => { this.activeRun = null; });
    return this.activeRun;
  }

  private async drain(): Promise<void> {
    while (this.runRequested) {
      this.runRequested = false;
      let operation = await this.queue.leaseNext();
      while (operation) {
        try {
          await this.executor.execute(operation);
          await this.queue.complete(operation.id);
        } catch (error) {
          await this.queue.fail(operation.id, error);
          break;
        }
        operation = await this.queue.leaseNext();
      }
    }
  }
}
