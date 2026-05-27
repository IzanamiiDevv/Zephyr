import { GitService } from './GitService.js';

export interface BootstrapResult {
  ok:            boolean;
  git:           GitService | null;
  repoName:      string;
  currentBranch: string;
  error:         string | null;
}

export async function bootstrapRepo(cwd: string): Promise<BootstrapResult> {
  const git = new GitService(cwd);

  const isRepo = await git.isGitRepo();

  if (!isRepo) {
    return {
      ok:            false,
      git:           null,
      repoName:      '',
      currentBranch: '',
      error:         `No git repository found in:\n${cwd}\n\nNavigate to a git repo directory and restart Zephyr.`,
    };
  }

  try {
    const info = await git.getRepoInfo();
    return {
      ok:            true,
      git,
      repoName:      info.name,
      currentBranch: info.currentBranch,
      error:         null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok:            false,
      git:           null,
      repoName:      '',
      currentBranch: '',
      error:         `Failed to read repo info:\n${msg}`,
    };
  }
}