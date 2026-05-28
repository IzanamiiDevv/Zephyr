import { simpleGit, type SimpleGit, type StatusResult, type LogResult } from 'simple-git';

export interface BranchInfo {
  name:      string;
  current:   boolean;
  remote:    boolean;
  tracking?: string;
}

export interface AheadBehind {
  ahead:  number;
  behind: number;
}

export interface CommitInfo {
  hash:    string;
  date:    string;
  message: string;
  author:  string;
}

export interface RepoInfo {
  name:          string;
  root:          string;
  currentBranch: string;
  remoteUrl:     string | null;
}

export class GitService {
  private git: SimpleGit;
  private repoRoot: string;

  constructor(cwd: string) {
    this.repoRoot = cwd;
    this.git = simpleGit({ baseDir: cwd, binary: 'git', maxConcurrentProcesses: 4 });
  }

  async isGitRepo(): Promise<boolean> {
    try {
      await this.git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  async getRepoInfo(): Promise<RepoInfo> {
    const [root, branch, remotes] = await Promise.all([
      this.git.revparse(['--show-toplevel']),
      this.git.revparse(['--abbrev-ref', 'HEAD']),
      this.git.getRemotes(true),
    ]);

    const rootPath  = root.trim();
    const repoName  = rootPath.split(/[\\/]/).pop() ?? rootPath;
    const remoteUrl = remotes[0]?.refs?.fetch ?? null;

    return {
      name:          repoName,
      root:          rootPath,
      currentBranch: branch.trim(),
      remoteUrl,
    };
  }


  async getCurrentBranch(): Promise<string> {
    const result = await this.git.revparse(['--abbrev-ref', 'HEAD']);
    return result.trim();
  }

  async getAllBranches(): Promise<BranchInfo[]> {
    const result = await this.git.branch(['-a', '--format=%(refname:short)|%(upstream:short)']);
    const current = await this.getCurrentBranch();

    return result.all
      .filter(b => !b.startsWith('HEAD'))
      .map(line => {
        const [name, tracking] = line.split('|');
        const isRemote = (name ?? '').startsWith('remotes/') || (name ?? '').startsWith('origin/');
        return {
          name:    (name ?? '').replace(/^(remotes\/|origin\/)/, ''),
          current: (name ?? '').trim() === current,
          remote:  isRemote,
          tracking: tracking?.trim() || undefined,
        };
      });
  }

  async getLocalBranches(): Promise<BranchInfo[]> {
    const all = await this.getAllBranches();
    return all.filter(b => !b.remote);
  }

  async createBranch(name: string, from: string): Promise<void> {
    await this.git.checkoutBranch(name, from);
  }

  async switchBranch(name: string): Promise<void> {
    await this.git.checkout(name);
  }

  async deleteBranch(name: string, force = false): Promise<void> {
    const flag = force ? '-D' : '-d';
    await this.git.branch([flag, name]);
  }

  async deleteRemoteBranch(name: string, remote = 'origin'): Promise<void> {
    await this.git.push([remote, '--delete', name]);
  }


  async getStatus(): Promise<StatusResult> {
    return this.git.status();
  }

  async getAheadBehind(branch: string, remote = 'origin'): Promise<AheadBehind> {
    try {
      const tracking = `${remote}/${branch}`;
      const result   = await this.git.raw([
        'rev-list', '--left-right', '--count', `${tracking}...HEAD`,
      ]);
      const [behind = '0', ahead = '0'] = result.trim().split(/\s+/);
      return { ahead: parseInt(ahead, 10), behind: parseInt(behind, 10) };
    } catch {
      return { ahead: 0, behind: 0 };
    }
  }

  async hasConflictRisk(targetBranch = 'production'): Promise<boolean> {
    try {
      await this.git.raw(['merge-tree', 'HEAD', targetBranch]);
      const current = await this.getCurrentBranch();
      const base    = await this.git.raw(['merge-base', current, targetBranch]);
      const diff    = await this.git.raw([
        'diff', '--name-only', base.trim(), current,
      ]);
      const prodDiff = await this.git.raw([
        'diff', '--name-only', base.trim(), targetBranch,
      ]);

      const ourFiles  = new Set(diff.trim().split('\n').filter(Boolean));
      const prodFiles = new Set(prodDiff.trim().split('\n').filter(Boolean));

      for (const f of ourFiles) {
        if (prodFiles.has(f)) return true;
      }
      return false;
    } catch {
      return false;
    }
  }


  async getRecentCommits(count = 10): Promise<CommitInfo[]> {
    const log: LogResult = await this.git.log({ maxCount: count });
    return log.all.map(c => ({
      hash:    c.hash.slice(0, 7),
      date:    c.date,
      message: c.message,
      author:  c.author_name,
    }));
  }

  async commit(message: string): Promise<void> {
    await this.git.commit(message);
  }

  async stageAll(): Promise<void> {
    await this.git.add('.');
  }

  async push(branch: string, remote = 'origin', setUpstream = false): Promise<void> {
    if (setUpstream) {
      await this.git.push([remote, branch, '--set-upstream']);
    } else {
      await this.git.push(remote, branch);
    }
  }


  async fetchRemote(remote = 'origin'): Promise<void> {
    await this.git.fetch([remote, '--prune']);
  }

  async getSafeProdAheadBehind(): Promise<AheadBehind> {
    try {
      await this.git.fetch(['origin', 'safe-production']);
      return this.getAheadBehind('safe-production');
    } catch {
      return { ahead: 0, behind: 0 };
    }
  }

  async remoteBranchExists(branch: string, remote = 'origin'): Promise<boolean> {
    try {
      const result = await this.git.raw(['ls-remote', '--heads', remote, branch]);
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  async pushBranch(branch: string, remote = 'origin'): Promise<void> {
    const exists = await this.remoteBranchExists(branch, remote);
    await this.git.push([remote, branch, ...(exists ? [] : ['--set-upstream'])]);
  }
}