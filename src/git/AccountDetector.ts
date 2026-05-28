import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface GitAccount {
  name:   string;
  email:  string;
  source: 'global' | 'local' | 'ssh-config';
}

export async function detectGitAccounts(repoRoot: string): Promise<GitAccount[]> {
  const accounts: GitAccount[] = [];
  const seen = new Set<string>();

  const add = (a: GitAccount) => {
    const key = `${a.name}|${a.email}`;
    if (!seen.has(key) && a.email) { seen.add(key); accounts.push(a); }
  };

  // Local repo config
  try {
    const name  = execSync('git config --local user.name',  { cwd: repoRoot, stdio: ['pipe','pipe','pipe'] }).toString().trim();
    const email = execSync('git config --local user.email', { cwd: repoRoot, stdio: ['pipe','pipe','pipe'] }).toString().trim();
    if (name || email) add({ name, email, source: 'local' });
  } catch { /* no local config */ }

  // Global gitconfig
  try {
    const name  = execSync('git config --global user.name',  { stdio: ['pipe','pipe','pipe'] }).toString().trim();
    const email = execSync('git config --global user.email', { stdio: ['pipe','pipe','pipe'] }).toString().trim();
    if (name || email) add({ name, email, source: 'global' });
  } catch { /* no global config */ }

  // includeIf blocks in ~/.gitconfig
  try {
    const gitconfigPath = join(homedir(), '.gitconfig');
    if (existsSync(gitconfigPath)) {
      const content = readFileSync(gitconfigPath, 'utf8');
      const includeMatches = content.matchAll(/\[includeIf[^\]]*\]\s*\n\s*path\s*=\s*(.+)/g);
      for (const match of includeMatches) {
        const includePath = match[1]?.trim().replace('~', homedir());
        if (includePath && existsSync(includePath)) {
          try {
            const sub        = readFileSync(includePath, 'utf8');
            const nameMatch  = sub.match(/name\s*=\s*(.+)/);
            const emailMatch = sub.match(/email\s*=\s*(.+)/);
            const name  = nameMatch?.[1]?.trim()  ?? '';
            const email = emailMatch?.[1]?.trim() ?? '';
            if (email) add({ name, email, source: 'global' });
          } catch { /* skip */ }
        }
      }
    }
  } catch { /* skip */ }

  // SSH config host aliases
  try {
    const sshConfigPath = join(homedir(), '.ssh', 'config');
    if (existsSync(sshConfigPath)) {
      const content     = readFileSync(sshConfigPath, 'utf8');
      const hostMatches = content.matchAll(/Host\s+(github-[^\s]+|github\.com[^\s]*)/g);
      for (const match of hostMatches) {
        const host = match[1]?.trim() ?? '';
        if (host && host !== 'github.com') {
          add({ name: host, email: `(ssh alias: ${host})`, source: 'ssh-config' });
        }
      }
    }
  } catch { /* skip */ }

  return accounts;
}

export function applyAccountToRepo(repoRoot: string, account: GitAccount): void {
  if (account.source === 'ssh-config') return;
  try {
    if (account.name)  execSync(`git config --local user.name "${account.name}"`,   { cwd: repoRoot, stdio: 'ignore' });
    if (account.email && !account.email.startsWith('(ssh'))
      execSync(`git config --local user.email "${account.email}"`, { cwd: repoRoot, stdio: 'ignore' });
  } catch { /* ignore */ }
}