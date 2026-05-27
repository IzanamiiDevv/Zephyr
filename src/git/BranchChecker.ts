import type { GitService } from './GitService.js';

export const CORE_BRANCHES = ['main', 'production', 'safe-production'] as const;
export type CoreBranch = typeof CORE_BRANCHES[number];

export interface BranchCheckResult {
  allPresent: boolean;
  missing:    CoreBranch[];
  isOwner:    boolean;
  remoteUrl:  string | null;
  repoSlug:   string | null;
}

export async function checkCoreBranches(git: GitService): Promise<BranchCheckResult> {
  const info = await git.getRepoInfo();

  try { await git.fetchRemote('origin'); } catch { /* offline */ }

  let remoteBranches: string[] = [];
  try {
    const result = await (git as any).git.raw(['branch', '-r', '--format=%(refname:short)']);
    remoteBranches = result
      .split('\n')
      .map((b: string) => b.trim().replace(/^origin\//, ''))
      .filter(Boolean);
  } catch { /* no remote */ }

  let localBranches: string[] = [];
  try {
    const result = await (git as any).git.raw(['branch', '--format=%(refname:short)']);
    localBranches = result.split('\n').map((b: string) => b.trim()).filter(Boolean);
  } catch { /* empty repo */ }

  const allBranches = new Set([...remoteBranches, ...localBranches]);
  const missing = CORE_BRANCHES.filter(b => !allBranches.has(b)) as CoreBranch[];

  let isOwner = false;
  try {
    const userEmail        = await (git as any).git.raw(['config', 'user.email']);
    const firstCommitEmail = await (git as any).git.raw([
      'log', '--reverse', '--format=%ae', '--max-count=1',
    ]);
    isOwner = userEmail.trim() === firstCommitEmail.trim();
  } catch { isOwner = false; }

  let repoSlug: string | null = null;
  const remoteUrl = info.remoteUrl;
  if (remoteUrl) {
    const match = remoteUrl
      .replace(/^git@github\.com:/, '')
      .replace(/^https:\/\/github\.com\//, '')
      .replace(/\.git$/, '')
      .match(/^([^/]+\/[^/]+)/);
    repoSlug = match?.[1] ?? null;
  }

  return { allPresent: missing.length === 0, missing, isOwner, remoteUrl, repoSlug };
}

export async function createMissingBranches(
  git: GitService,
  missing: CoreBranch[],
): Promise<{ branch: CoreBranch; ok: boolean; error?: string }[]> {
  const results = [];
  for (const branch of missing) {
    try {
      await (git as any).git.raw(['branch', branch]);
      results.push({ branch, ok: true });
    } catch (err) {
      results.push({ branch, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}

export function buildMissingBranchIssueUrl(repoSlug: string, missing: CoreBranch[]): string {
  const title = encodeURIComponent('[Zephyr] Missing core branches detected');
  const body  = encodeURIComponent(
    `## Missing Core Branches\n\n` +
    `The following core branches required by Zephyr are not present:\n\n` +
    missing.map(b => `- \`${b}\``).join('\n') +
    `\n\n## Required Branch Structure\n\n` +
    `| Branch | Purpose |\n|---|---|\n` +
    `| \`main\` | Public release viewpoint |\n` +
    `| \`production\` | Active merge target (PR required) |\n` +
    `| \`safe-production\` | Stable CI-managed copy of production |\n\n` +
    `_This issue was opened automatically by Zephyr._`
  );
  return `https://github.com/${repoSlug}/issues/new?title=${title}&body=${body}`;
}