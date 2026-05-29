import type { GitService } from './GitService.js';

export interface DiffFile {
  path:       string;
  insertions: number;
  deletions:  number;
  status:     'added' | 'modified' | 'deleted' | 'renamed' | 'unknown';
}

export interface DiffSummary {
  files:      DiffFile[];
  totalAdded: number;
  totalDel:   number;
}

export interface PullResult {
  ok:       boolean;
  message:  string;
  summary?: DiffSummary;
}

export interface SwitchResult {
  ok:      boolean;
  message: string;
  branch?: string;
}

export async function pullCurrentBranch(git: GitService): Promise<PullResult> {
  try {
    const branch = await git.getCurrentBranch();
    const gitRaw = (git as any).git;

    const status = await git.getStatus();
    if (status.files.length > 0) {
      return {
        ok:      false,
        message: `Cannot pull: you have ${status.files.length} uncommitted change${status.files.length === 1 ? '' : 's'}.\nCommit or stash your changes first.`,
      };
    }

    await gitRaw.pull('origin', branch);
    const summary = await getDiffSummary(git, 'HEAD~1', 'HEAD');
    return { ok: true, message: `Pulled latest changes for "${branch}".`, summary };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('CONFLICT') || msg.includes('conflict')) {
      return { ok: false, message: `Pull resulted in merge conflicts.\nResolve conflicts manually then run: git merge --continue` };
    }
    if (msg.includes('Already up to date')) {
      return { ok: true, message: 'Already up to date.' };
    }
    return { ok: false, message: `Pull failed: ${msg}` };
  }
}

export async function getDiffSummary(git: GitService, from: string, to: string): Promise<DiffSummary> {
  try {
    const raw: string = await (git as any).git.raw(['diff', '--numstat', from, to]);
    const lines = raw.trim().split('\n').filter(Boolean);
    let totalAdded = 0;
    let totalDel   = 0;

    const files: DiffFile[] = lines.map(line => {
      const parts = line.split('\t');
      const ins   = parseInt(parts[0] ?? '0', 10) || 0;
      const del   = parseInt(parts[1] ?? '0', 10) || 0;
      const path  = parts[2] ?? '';
      totalAdded += ins;
      totalDel   += del;
      const isRenamed = path.includes('=>');
      const status: DiffFile['status'] =
        ins > 0 && del === 0 ? 'added'
        : del > 0 && ins === 0 ? 'deleted'
        : isRenamed ? 'renamed'
        : 'modified';
      return { path, insertions: ins, deletions: del, status };
    });

    return { files, totalAdded, totalDel };
  } catch {
    return { files: [], totalAdded: 0, totalDel: 0 };
  }
}

export async function getDiffVsProduction(git: GitService): Promise<DiffSummary> {
  try {
    const branch = await git.getCurrentBranch();
    const base   = await (git as any).git.raw(['merge-base', branch, 'production']).catch(() => null);
    if (!base) return { files: [], totalAdded: 0, totalDel: 0 };
    return getDiffSummary(git, base.trim(), branch);
  } catch {
    return { files: [], totalAdded: 0, totalDel: 0 };
  }
}

export async function switchBranch(git: GitService, branch: string): Promise<SwitchResult> {
  try {
    const status = await git.getStatus();
    if (status.files.length > 0) {
      return {
        ok:      false,
        message: `Cannot switch: you have ${status.files.length} uncommitted change${status.files.length === 1 ? '' : 's'}.\nCommit or stash first.`,
      };
    }
    await git.switchBranch(branch);
    return { ok: true, message: `Switched to "${branch}".`, branch };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Switch failed: ${msg}` };
  }
}

export async function stashChanges(git: GitService): Promise<{ ok: boolean; message: string }> {
  try {
    await (git as any).git.stash(['push', '-m', 'zephyr: auto-stash']);
    return { ok: true, message: 'Changes stashed.' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Stash failed: ${msg}` };
  }
}

export async function popStash(git: GitService): Promise<{ ok: boolean; message: string }> {
  try {
    await (git as any).git.stash(['pop']);
    return { ok: true, message: 'Stash applied.' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Stash pop failed: ${msg}` };
  }
}