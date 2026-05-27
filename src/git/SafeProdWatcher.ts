import type { GitService } from './GitService.js';
import type { SafeProdStatus } from '../tui/store/appStore.js';

export type StatusCallback = (status: SafeProdStatus, message?: string) => void;

export class SafeProdWatcher {
  private git:      GitService;
  private callback: StatusCallback;
  private timer:    ReturnType<typeof setInterval> | null = null;
  private interval: number;
  private running   = false;

  constructor(git: GitService, callback: StatusCallback, intervalMs = 60_000) {
    this.git      = git;
    this.callback = callback;
    this.interval = intervalMs;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    // Check immediately on start
    void this.check();

    // Then every intervalMs
    this.timer = setInterval(() => { void this.check(); }, this.interval);

    // Prevent the interval from keeping the process alive
    this.timer.unref?.();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async check(): Promise<void> {
    this.callback('checking');
    try {
      const { behind } = await this.git.getSafeProdAheadBehind();
      this.callback(behind > 0 ? 'behind' : 'synced');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // If there's no remote or no safe-production branch, treat as synced
      // so it doesn't spam the user on offline/local-only repos
      if (
        msg.includes('couldn\'t find remote ref') ||
        msg.includes('no such remote') ||
        msg.includes('does not appear to be a git repository')
      ) {
        this.callback('synced');
      } else {
        this.callback('error');
      }
    }
  }

  forceCheck(): void {
    void this.check();
  }
}