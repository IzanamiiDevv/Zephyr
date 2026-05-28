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
  lock:         boolean;
  ownerEmail:   string;
  contributors: Contributor[];
  version:      string;
}

const DEFAULT_CONFIG: ZephyrConfigData = {
  lock: false, ownerEmail: '', contributors: [], version: '1.0.0',
};

export function configPath(repoRoot: string)   { return join(repoRoot, 'zephyr.json'); }
export function configExists(repoRoot: string) { return existsSync(configPath(repoRoot)); }

export function readConfig(repoRoot: string): ZephyrConfigData {
  const path = configPath(repoRoot);
  if (!existsSync(path)) return { ...DEFAULT_CONFIG };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<ZephyrConfigData>;
    return {
      lock:         parsed.lock         ?? false,
      ownerEmail:   parsed.ownerEmail   ?? '',
      contributors: parsed.contributors ?? [],
      version:      parsed.version      ?? '1.0.0',
    };
  } catch { return { ...DEFAULT_CONFIG }; }
}

export function writeConfig(repoRoot: string, data: ZephyrConfigData): void {
  writeFileSync(configPath(repoRoot), JSON.stringify(data, null, 2), 'utf8');
}

export function hashPrivateKey(privateKey: string): string {
  return createHash('sha256').update(privateKey.trim()).digest('hex');
}

export function verifyKey(privateKey: string, publicKey: string): boolean {
  return hashPrivateKey(privateKey) === publicKey;
}

export function addContributor(
  config: ZephyrConfigData,
  contributor: Omit<Contributor, 'publicKey'>,
  privateKey: string,
): ZephyrConfigData {
  const publicKey = hashPrivateKey(privateKey);
  const existing  = config.contributors.filter(c => c.email !== contributor.email);
  return { ...config, contributors: [...existing, { ...contributor, publicKey }] };
}

export function removeContributor(config: ZephyrConfigData, email: string): ZephyrConfigData {
  return { ...config, contributors: config.contributors.filter(c => c.email !== email) };
}

export function authenticateContributor(
  config: ZephyrConfigData, email: string, privateKey: string,
): Contributor | null {
  const c = config.contributors.find(c => c.email === email);
  if (!c || !verifyKey(privateKey, c.publicKey)) return null;
  return c;
}

export function isOwner(config: ZephyrConfigData, email: string): boolean {
  return !!config.ownerEmail && config.ownerEmail.trim() === email.trim();
}

export function requiresKeyAuth(config: ZephyrConfigData, userEmail: string): boolean {
  if (config.contributors.length === 0) return false;
  if (isOwner(config, userEmail)) return false;
  return true;
}