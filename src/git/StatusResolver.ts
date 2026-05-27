import type { GitService, AheadBehind } from './GitService.js';

export interface BranchStatus {
  branch:       string;
  ahead:        number;
  behind:       number;
  conflictRisk: boolean;
  lastCommit:   string;
  lastAuthor:   string;
  lastDate:     string;
  isDirty:      boolean;
  stagedCount:  number;
  unstagedCount: number;
}

export async function resolveBranchStatus(
  git: GitService,
): Promise<BranchStatus> {
  const [branch, aheadBehind, commits, status] = await Promise.all([
    git.getCurrentBranch(),
    git.getAheadBehind(await git.getCurrentBranch()).catch((): AheadBehind => ({ ahead: 0, behind: 0 })),
    git.getRecentCommits(1),
    git.getStatus(),
  ]);

  const conflictRisk = await git.hasConflictRisk('production').catch(() => false);

  const last = commits[0];

  return {
    branch,
    ahead:         aheadBehind.ahead,
    behind:        aheadBehind.behind,
    conflictRisk,
    lastCommit:    last?.message  ?? '—',
    lastAuthor:    last?.author   ?? '—',
    lastDate:      last?.date     ?? '—',
    isDirty:       status.files.length > 0,
    stagedCount:   status.staged.length,
    unstagedCount: status.files.filter(f => f.index !== 'A' && f.working_dir !== ' ').length,
  };
}