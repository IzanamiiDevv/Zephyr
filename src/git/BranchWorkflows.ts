import { execSync } from 'child_process';
import type { GitService } from './GitService.js';
import {
  buildBranchName,
  parseBranch,
  type BranchType,
} from './BranchParser.js';
import {
  validateNewBranchName,
  validateSourceBranch,
} from './BranchValidator.js';

export interface CreateBranchOptions {
  type:         BranchType;
  scope:        string;
  name:         string;
  sourceBranch: string;
  approved:     boolean;
  copyOf?:      string;
}

export interface WorkflowResult {
  ok:      boolean;
  message: string;
  branch?: string;
}

export async function createBranch(
  git: GitService,
  opts: CreateBranchOptions,
): Promise<WorkflowResult> {
  const sourceValidation = validateSourceBranch(opts.sourceBranch, opts.approved);
  if (!sourceValidation.valid) {
    return { ok: false, message: sourceValidation.errors.join('\n') };
  }

  let branchName: string;
  if (opts.copyOf) {
    const parsed = parseBranch(opts.copyOf);
    if (parsed.kind === 'dev') {
      branchName = `production/${parsed.type}/${parsed.scope}/copyof/${parsed.name}`;
    } else {
      branchName = buildBranchName(opts.type, opts.scope, opts.name);
    }
  } else {
    branchName = buildBranchName(opts.type, opts.scope, opts.name);
  }

  const nameValidation = validateNewBranchName(branchName);
  if (!nameValidation.valid) {
    return { ok: false, message: nameValidation.errors.join('\n') };
  }

  try {
    await git.createBranch(branchName, opts.sourceBranch);
    return {
      ok:      true,
      message: `Branch created and checked out: ${branchName}`,
      branch:  branchName,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('already exists')) {
      return { ok: false, message: `Branch "${branchName}" already exists.` };
    }
    return { ok: false, message: `Git error: ${msg}` };
  }
}

export async function registerBranch(
  git: GitService,
  branch: string,
): Promise<WorkflowResult> {
  try {
    await git.pushBranch(branch);
    return {
      ok:      true,
      message: `Branch "${branch}" pushed to origin successfully.`,
      branch,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Push failed: ${msg}` };
  }
}

export async function openPullRequestInBrowser(
  git: GitService,
  branch: string,
  targetBranch = 'production',
): Promise<WorkflowResult> {
  try {
    const info = await git.getRepoInfo();
    const remoteUrl = info.remoteUrl ?? '';

    let webUrl = remoteUrl
      .replace(/^git@github\.com:/, 'https://github.com/')
      .replace(/\.git$/, '');

    if (!webUrl.includes('github.com')) {
      return {
        ok:      false,
        message: `Cannot open PR: remote URL is not a GitHub URL.\nRemote: ${remoteUrl}`,
      };
    }

    const prUrl = `${webUrl}/compare/${targetBranch}...${encodeURIComponent(branch)}?expand=1`;

    const platform = process.platform;
    if (platform === 'win32') {
      execSync(`start "" "${prUrl}"`, { stdio: 'ignore' });
    } else if (platform === 'darwin') {
      execSync(`open "${prUrl}"`, { stdio: 'ignore' });
    } else {
      execSync(`xdg-open "${prUrl}"`, { stdio: 'ignore' });
    }

    return {
      ok:      true,
      message: `Opened PR page in browser.\n${prUrl}`,
      branch,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Failed to open browser: ${msg}` };
  }
}

export interface DeleteBranchOptions {
  branch:       string;
  force:        boolean;
  deleteRemote: boolean;
}

export async function deleteBranch(
  git: GitService,
  opts: DeleteBranchOptions,
): Promise<WorkflowResult> {
  const protected_ = ['main', 'production', 'safe-production'];
  if (protected_.includes(opts.branch)) {
    return { ok: false, message: `Cannot delete protected branch "${opts.branch}".` };
  }

  try {
    await git.deleteBranch(opts.branch, opts.force);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not fully merged')) {
      return {
        ok:      false,
        message: `Branch "${opts.branch}" is not fully merged.\nConfirm force-delete to proceed.`,
        branch:  opts.branch,
      };
    }
    return { ok: false, message: `Delete failed: ${msg}` };
  }

  if (opts.deleteRemote) {
    try {
      await git.deleteRemoteBranch(opts.branch);
    } catch {
      return {
        ok:      true,
        message: `Local branch deleted. Remote delete failed (may not exist on remote).`,
        branch:  opts.branch,
      };
    }
  }

  return {
    ok:      true,
    message: `Branch "${opts.branch}" deleted${opts.deleteRemote ? ' locally and remotely' : ' locally'}.`,
    branch:  opts.branch,
  };
}