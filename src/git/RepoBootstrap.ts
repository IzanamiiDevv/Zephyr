import { GitService } from './GitService.js';

export interface BootstrapResult {
  ok:                 boolean;
  git:                GitService | null;
  repoName:           string;
  currentBranch:      string;
  firstCommitAuthor:  string;
  error:              string | null;
}

export async function bootstrapRepo(cwd: string): Promise<BootstrapResult> {
  const git    = new GitService(cwd);
  const isRepo = await git.isGitRepo();

  if (!isRepo) {
    return {
      ok:                false,
      git:               null,
      repoName:          '',
      currentBranch:     '',
      firstCommitAuthor: '',
      error:
        `No git repository found in:\n${cwd}\n\nNavigate to a git repo directory and restart Zephyr.`,
    };
  }

  try {
    const info = await git.getRepoInfo();

    // Get first commit author — this is the immutable project owner
    let firstCommitAuthor = '';
    try {
      const raw = await (git as any).git.raw([
        'log', '--reverse', '--format=%an', '--max-count=1',
      ]);
      firstCommitAuthor = raw.trim();
    } catch { /* empty repo — no commits yet */ }

    return {
      ok:                true,
      git,
      repoName:          info.name,
      currentBranch:     info.currentBranch,
      firstCommitAuthor,
      error:             null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok:                false,
      git:               null,
      repoName:          '',
      currentBranch:     '',
      firstCommitAuthor: '',
      error:             `Failed to read repo info:\n${msg}`,
    };
  }
}