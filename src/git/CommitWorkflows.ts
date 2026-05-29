import type { GitService } from './GitService.js';
import { commitPrefix, parseBranch } from './BranchParser.js';
import { validateCommitMessage }     from './BranchValidator.js';

export interface CommitResult {
  ok:      boolean;
  message: string;
  hash?:   string;
}

export interface PushResult {
  ok:      boolean;
  message: string;
}

export async function commitChanges(
  git:     GitService,
  message: string,
): Promise<CommitResult> {
  const status = await git.getStatus();
  if (status.staged.length === 0) {
    return { ok: false, message: 'Nothing staged. Stage files first in the Staging screen.' };
  }

  const branch     = await git.getCurrentBranch();
  const parsed     = parseBranch(branch);
  const prefix     = commitPrefix(parsed);
  const validation = validateCommitMessage(message, prefix);

  if (!validation.valid) {
    return { ok: false, message: validation.errors.join('\n') };
  }

  try {
    await git.commit(message);
    const log  = await git.getRecentCommits(1);
    const hash = log[0]?.hash ?? '';
    return { ok: true, message: `Committed: ${message}`, hash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Commit failed: ${msg}` };
  }
}

export async function amendLastCommit(
  git:        GitService,
  newMessage: string,
): Promise<CommitResult> {
  try {
    const gitRaw = (git as any).git;
    await gitRaw.raw(['commit', '--amend', '-m', newMessage]);
    const log  = await git.getRecentCommits(1);
    const hash = log[0]?.hash ?? '';
    return { ok: true, message: `Amended: ${newMessage}`, hash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Amend failed: ${msg}` };
  }
}

export async function pushCurrentBranch(
  git:    GitService,
  branch: string,
): Promise<PushResult> {
  try {
    await git.pushBranch(branch);
    return { ok: true, message: `Pushed "${branch}" to origin.` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('no upstream')) {
      try {
        await git.push(branch, 'origin', true);
        return { ok: true, message: `Pushed "${branch}" to origin (upstream set).` };
      } catch (err2) {
        const m2 = err2 instanceof Error ? err2.message : String(err2);
        return { ok: false, message: `Push failed: ${m2}` };
      }
    }
    return { ok: false, message: `Push failed: ${msg}` };
  }
}

export function buildPrefixedMessage(branch: string, body: string): string {
  const parsed = parseBranch(branch);
  const prefix = commitPrefix(parsed);
  if (!prefix) return body;
  if (body.startsWith(prefix)) return body;
  return `${prefix} ${body}`;
}