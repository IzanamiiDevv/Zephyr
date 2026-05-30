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
  kind:    'dev';
  type:    BranchType;
  scope:   string;
  name:    string;
  isCopy:  boolean;
  copyOf?: string;
  raw:     string;
}

export interface ParsedCoreBranch {
  kind: 'core';
  name: CoreBranch | string;
  raw:  string;
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

/**
 * Parse any branch name into a structured object.
 *
 * Patterns:
 *   prod-<type>/<scope>/<name>
 *   prod-<type>/<scope>/copyof/<name>
 *   release/<version>
 *   main | production | safe-production
 */
export function parseBranch(raw: string): ParsedBranch {
  const name = raw.trim();

  // Core branches
  if (['main', 'production', 'safe-production'].includes(name)) {
    return { kind: 'core', name: name as CoreBranch, raw };
  }

  // Release branches
  if (name.startsWith('release/')) {
    const version = name.slice('release/'.length);
    return { kind: 'release', version, raw };
  }

  // Dev branches: prod-<type>/<scope>/[copyof/]<name>
  const DEV_PREFIX = /^prod-([a-z]+)\/([^/]+)\/(.+)$/;
  const match = name.match(DEV_PREFIX);

  if (match) {
    const type  = match[1] as BranchType;
    const scope = match[2] as string;
    const rest  = match[3] as string;

    if (!BRANCH_TYPES.includes(type)) {
      return { kind: 'unknown', raw };
    }

    // copyof pattern: prod-<type>/<scope>/copyof/<name>
    if (rest.startsWith('copyof/')) {
      const copyName = rest.slice('copyof/'.length);
      return {
        kind:   'dev',
        type,
        scope,
        name:   copyName,
        isCopy: true,
        copyOf: `prod-${type}/${scope}/${copyName}`,
        raw,
      };
    }

    return {
      kind:   'dev',
      type,
      scope,
      name:   rest,
      isCopy: false,
      raw,
    };
  }

  return { kind: 'unknown', raw };
}

/**
 * Build a branch name string from parts.
 * Format: prod-<type>/<scope>/<name>
 */
export function buildBranchName(
  type:   BranchType,
  scope:  string,
  name:   string,
  copyOf?: string,
): string {
  const safeName  = slugify(name);
  const safeScope = slugify(scope);

  if (copyOf) {
    const parsed = parseBranch(copyOf);
    if (parsed.kind === 'dev') {
      return `prod-${parsed.type}/${parsed.scope}/copyof/${parsed.name}`;
    }
  }

  return `prod-${type}/${safeScope}/${safeName}`;
}

/**
 * Convert a human label into a branch-safe slug.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Return the conventional commit prefix from a parsed dev branch.
 * e.g.  feat(auth):
 */
export function commitPrefix(branch: ParsedBranch): string | null {
  if (branch.kind !== 'dev') return null;
  return `${branch.type}(${branch.scope}):`;
}