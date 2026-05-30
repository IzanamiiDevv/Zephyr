import { createHash }                              from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join }                                    from 'path';

export interface Contributor {
  name:      string;
  email:     string;
  github:    string;
  publicKey: string;
}

export interface ZephyrConfigData {
  version:      string;
  lock:         boolean;
  strict:       boolean;
  owners:       string[];   // additional delegated owners (not the base owner)
  contributors: Contributor[];
}

const DEFAULT_CONFIG: ZephyrConfigData = {
  version:      '1.0.0',
  lock:         false,
  strict:       false,
  owners:       [],
  contributors: [],
};

export function configPath(repoRoot: string)   { return join(repoRoot, 'zephyr.json'); }
export function configExists(repoRoot: string) { return existsSync(configPath(repoRoot)); }

export function readConfig(repoRoot: string): ZephyrConfigData {
  const path = configPath(repoRoot);
  if (!existsSync(path)) return { ...DEFAULT_CONFIG };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<ZephyrConfigData>;
    return {
      version:      parsed.version      ?? '1.0.0',
      lock:         parsed.lock         ?? false,
      strict:       parsed.strict       ?? false,
      owners:       parsed.owners       ?? [],
      contributors: parsed.contributors ?? [],
    };
  } catch { return { ...DEFAULT_CONFIG }; }
}

export function writeConfig(repoRoot: string, data: ZephyrConfigData): void {
  writeFileSync(configPath(repoRoot), JSON.stringify(data, null, 2), 'utf8');
}

// ── Ownership ────────────────────────────────────────────────────────────────

/**
 * Primary rule: first commit author is always the base owner.
 * Secondary: anyone in owners[] is also an owner.
 */
export function isOwner(
  config:            ZephyrConfigData,
  gitUserName:       string,
  firstCommitAuthor: string,
): boolean {
  if (!gitUserName) return false;

  // First commit author is always owner
  if (
    firstCommitAuthor &&
    firstCommitAuthor.toLowerCase() === gitUserName.toLowerCase()
  ) return true;

  // Delegated owners
  return config.owners.some(o => o.toLowerCase() === gitUserName.toLowerCase());
}

export function addOwner(config: ZephyrConfigData, username: string): ZephyrConfigData {
  const already = config.owners.some(o => o.toLowerCase() === username.toLowerCase());
  if (already) return config;
  return { ...config, owners: [...config.owners, username] };
}

export function removeOwner(config: ZephyrConfigData, username: string): ZephyrConfigData {
  return {
    ...config,
    owners: config.owners.filter(o => o.toLowerCase() !== username.toLowerCase()),
  };
}

// ── Key hashing ──────────────────────────────────────────────────────────────

export function hashPrivateKey(privateKey: string): string {
  return createHash('sha256').update(privateKey.trim()).digest('hex');
}

export function verifyKey(privateKey: string, publicKey: string): boolean {
  return hashPrivateKey(privateKey) === publicKey;
}

// ── Contributors ─────────────────────────────────────────────────────────────

export function addContributor(
  config:      ZephyrConfigData,
  contributor: Omit<Contributor, 'publicKey'>,
  privateKey:  string,
): ZephyrConfigData {
  const publicKey = hashPrivateKey(privateKey);
  const existing  = config.contributors.filter(c => c.email !== contributor.email);
  return { ...config, contributors: [...existing, { ...contributor, publicKey }] };
}

export function removeContributor(config: ZephyrConfigData, email: string): ZephyrConfigData {
  return { ...config, contributors: config.contributors.filter(c => c.email !== email) };
}

export function verifyContributorKey(
  config:     ZephyrConfigData,
  email:      string,
  privateKey: string,
): Contributor | null {
  const c = config.contributors.find(c => c.email === email);
  if (!c || !verifyKey(privateKey, c.publicKey)) return null;
  return c;
}

export function requiresKeyAuth(
  config:            ZephyrConfigData,
  gitUserName:       string,
  firstCommitAuthor: string,
): boolean {
  if (config.contributors.length === 0) return false;
  if (isOwner(config, gitUserName, firstCommitAuthor)) return false;
  return true;
}