import type { GitService } from './GitService.js';

export const NOTES_REF     = 'refs/notes/zephyr-presence';
export const AWAY_AFTER_MS = 30 * 60 * 1000;

export interface PresenceEntry {
  name:        string;
  email:       string;
  branch:      string;
  branchType:  string;
  branchScope: string;
  branchName:  string;
  isRemote:    boolean;
  lastSeen:    string;
  status:      'active' | 'away';
}

export type PresenceMap = Record<string, PresenceEntry>;

export class TeamService {
  private git:      GitService;
  private timer:    ReturnType<typeof setInterval> | null = null;
  private running = false;
  private userName  = '';
  private userEmail = '';

  constructor(git: GitService) { this.git = git; }

  async init(): Promise<void> {
    try {
      this.userName  = (await (this.git as any).git.raw(['config', 'user.name'])).trim();
      this.userEmail = (await (this.git as any).git.raw(['config', 'user.email'])).trim();
    } catch { /* no git config */ }
  }

  async publishPresence(
    entry: Omit<PresenceEntry, 'name' | 'email' | 'lastSeen' | 'status'>,
  ): Promise<void> {
    if (!this.userEmail) return;
    const full: PresenceEntry = {
      ...entry,
      name:     this.userName,
      email:    this.userEmail,
      lastSeen: new Date().toISOString(),
      status:   'active',
    };
    try {
      await this.upsertPresenceInNote(this.userEmail, full);
      await this.pushNotes();
    } catch { /* offline — silently ignore */ }
  }

  async clearPresence(): Promise<void> {
    if (!this.userEmail) return;
    try {
      await this.deleteFromNote(this.userEmail);
      await this.pushNotes();
    } catch { /* ignore */ }
  }

  async fetchPresence(): Promise<PresenceMap> {
    try { await this.fetchNotes(); } catch { /* offline */ }
    return this.readAllNotes();
  }

  start(
    currentBranchGetter: () => {
      branch: string; type: string; scope: string; name: string; isRemote: boolean;
    },
    onUpdate: (map: PresenceMap) => void,
    intervalMs = 60_000,
  ): void {
    if (this.running) return;
    this.running = true;

    const tick = async () => {
      const b = currentBranchGetter();
      await this.publishPresence({
        branch:      b.branch,
        branchType:  b.type,
        branchScope: b.scope,
        branchName:  b.name,
        isRemote:    b.isRemote,
      });
      const map = await this.fetchPresence();
      onUpdate(this.applyAwayLogic(map));
    };

    void tick();
    this.timer = setInterval(() => { void tick(); }, intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private async upsertPresenceInNote(email: string, entry: PresenceEntry): Promise<void> {
    const git = (this.git as any).git;
    let existing: PresenceMap = {};
    try {
      const raw = await git.raw(['notes', '--ref', NOTES_REF, 'show', 'HEAD']);
      existing = JSON.parse(raw.trim());
    } catch { /* no note yet */ }
    existing[email] = entry;
    await git.raw(['notes', '--ref', NOTES_REF, 'add', '-f', '-m', JSON.stringify(existing), 'HEAD']);
  }

  private async deleteFromNote(email: string): Promise<void> {
    const git = (this.git as any).git;
    let existing: PresenceMap = {};
    try {
      const raw = await git.raw(['notes', '--ref', NOTES_REF, 'show', 'HEAD']);
      existing = JSON.parse(raw.trim());
    } catch { return; }
    delete existing[email];
    await git.raw(['notes', '--ref', NOTES_REF, 'add', '-f', '-m', JSON.stringify(existing), 'HEAD']);
  }

  private async readAllNotes(): Promise<PresenceMap> {
    const git = (this.git as any).git;
    try {
      const raw = await git.raw(['notes', '--ref', NOTES_REF, 'show', 'HEAD']);
      return JSON.parse(raw.trim()) as PresenceMap;
    } catch { return {}; }
  }

  private async fetchNotes(): Promise<void> {
    await (this.git as any).git.raw(['fetch', 'origin', `${NOTES_REF}:${NOTES_REF}`]);
  }

  private async pushNotes(): Promise<void> {
    await (this.git as any).git.raw(['push', 'origin', `${NOTES_REF}:${NOTES_REF}`]);
  }

  private applyAwayLogic(map: PresenceMap): PresenceMap {
    const now = Date.now();
    const result: PresenceMap = {};
    for (const [email, entry] of Object.entries(map)) {
      result[email] = {
        ...entry,
        status: (now - new Date(entry.lastSeen).getTime()) > AWAY_AFTER_MS ? 'away' : 'active',
      };
    }
    return result;
  }

  get identity() { return { name: this.userName, email: this.userEmail }; }
}