export type BranchType = 'feat' | 'refactor' | 'fix' | 'docs' | 'style' | 'chore';

export const BRANCH_TYPES: BranchType[] = [
  'feat', 'refactor', 'fix', 'docs', 'style', 'chore',
];

export type CoreBranch =
  | 'main'
  | 'production'
  | 'safe-production'
  | 'release';

export interface ParsedDevBranch {
  kind:      'dev';
  type:      BranchType;
  scope:     string;
  name:      string;
  isCopy:    boolean;
  copyOf?:   string;
  raw:       string;
}

export interface ParsedCoreBranch {
  kind:   'core';
  name:   CoreBranch | string;
  raw:    string;
}

export interface ParsedReleaseBranch {
  kind:    'release';
  version: string;
  raw:     string;
}

export interface ParsedUnknownBranch {
  kind: 'unknown';
  raw:  string;
}

export type ParsedBranch =
  | ParsedDevBranch
  | ParsedCoreBranch
  | ParsedReleaseBranch
  | ParsedUnknownBranch;

export function parseBranch(raw: string): ParsedBranch {
  const name = raw.trim();

  if (['main', 'production', 'safe-production'].includes(name)) {
    return { kind: 'core', name: name as CoreBranch, raw };
  }

  if (name.startsWith('release/')) {
    const version = name.slice('release/'.length);
    return { kind: 'release', version, raw };
  }

  if (name.startsWith('production/')) {
    const parts = name.split('/');
    if (parts.length >= 4) {
      const type  = parts[1] as BranchType;
      const scope = parts[2] as string;

      if (!BRANCH_TYPES.includes(type)) {
        return { kind: 'unknown', raw };
      }

      if (parts[3] === 'copyof' && parts[4]) {
        return {
          kind:    'dev',
          type,
          scope,
          name:    parts.slice(4).join('/'),
          isCopy:  true,
          copyOf:  `production/${type}/${scope}/${parts.slice(4).join('/')}`,
          raw,
        };
      }

      return {
        kind:   'dev',
        type,
        scope,
        name:   parts.slice(3).join('/'),
        isCopy: false,
        raw,
      };
    }
  }

  return { kind: 'unknown', raw };
}

export function buildBranchName(
  type: BranchType,
  scope: string,
  name: string,
  copyOf?: string,
): string {
  const safeName  = slugify(name);
  const safeScope = slugify(scope);

  if (copyOf) {
    const parsed = parseBranch(copyOf);
    if (parsed.kind === 'dev') {
      return `production/${parsed.type}/${parsed.scope}/copyof/${parsed.name}`;
    }
  }

  return `production/${type}/${safeScope}/${safeName}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function commitPrefix(branch: ParsedBranch): string | null {
  if (branch.kind !== 'dev') return null;
  return `${branch.type}(${branch.scope}):`;
}