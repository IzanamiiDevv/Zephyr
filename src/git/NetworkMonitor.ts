import { execSync } from 'child_process';

export type NetworkStatus = 'online' | 'offline' | 'checking';
export type NetworkCallback = (status: NetworkStatus) => void;

export class NetworkMonitor {
  private callback: NetworkCallback;
  private timer:    ReturnType<typeof setInterval> | null = null;
  private interval: number;
  private running = false;
  private _current: NetworkStatus = 'checking';

  constructor(callback: NetworkCallback, intervalMs = 15_000) {
    this.callback = callback;
    this.interval = intervalMs;
  }

  get current(): NetworkStatus { return this._current; }

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.check();
    this.timer = setInterval(() => { void this.check(); }, this.interval);
    this.timer.unref?.();
  }

  stop(): void {
    this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  async check(): Promise<void> {
    const online = await this.ping();
    this._current = online ? 'online' : 'offline';
    this.callback(this._current);
  }

  private async ping(): Promise<boolean> {
    return new Promise(resolve => {
      try {
        const cmd = process.platform === 'win32'
          ? 'ping -n 1 -w 2000 8.8.8.8'
          : 'ping -c 1 -W 2 8.8.8.8';
        execSync(cmd, { stdio: 'ignore', timeout: 3000 });
        resolve(true);
      } catch {
        resolve(false);
      }
    });
  }
}