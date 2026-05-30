import { parseBranch, BRANCH_TYPES, type BranchType } from './BranchParser.js';

export interface ValidationResult {
  valid:    boolean;
  errors:   string[];
  warnings: string[];
}

export function validateNewBranchName(name: string): ValidationResult {
  const errors:   string[] = [];
  const warnings: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push('Branch name cannot be empty.');
    return { valid: false, errors, warnings };
  }

  const parsed = parseBranch(name);

  if (parsed.kind === 'core') {
    errors.push(`"${name}" is a protected core branch and cannot be created manually.`);
    return { valid: false, errors, warnings };
  }

  if (parsed.kind === 'release') {
    warnings.push('Release branches are typically managed by CI/CD. Are you sure?');
    return { valid: true, errors, warnings };
  }

  if (parsed.kind === 'unknown') {
    errors.push(
      `Branch name does not follow Zephyr convention.\n` +
      `Expected: prod-<type>/<scope>/<name>\n` +
      `Example:  prod-feat/auth/login-page\n` +
      `Types: ${BRANCH_TYPES.join(', ')}`
    );
    return { valid: false, errors, warnings };
  }

  if (parsed.kind === 'dev') {
    if (!BRANCH_TYPES.includes(parsed.type as BranchType)) {
      errors.push(`Invalid type "${parsed.type}". Must be one of: ${BRANCH_TYPES.join(', ')}`);
    }
    if (!parsed.scope || parsed.scope.length < 1) {
      errors.push('Scope cannot be empty.');
    }
    if (!parsed.name || parsed.name.length < 1) {
      errors.push('Branch name segment cannot be empty.');
    }
    if (parsed.scope.length > 30) {
      warnings.push('Scope is quite long. Keep it concise.');
    }
    if (parsed.name.length > 50) {
      warnings.push('Name segment is quite long. Keep it concise.');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateSourceBranch(
  sourceBranch:    string,
  requireApproval = false,
): ValidationResult {
  const errors:   string[] = [];
  const warnings: string[] = [];

  if (sourceBranch === 'safe-production') {
    return { valid: true, errors, warnings };
  }

  if (sourceBranch === 'production') {
    if (!requireApproval) {
      errors.push(
        'Branching from "production" requires explicit approval.\n' +
        'Confirm in the prompt to proceed.'
      );
      return { valid: false, errors, warnings };
    }
    warnings.push('Branching from "production" directly.');
    return { valid: true, errors, warnings };
  }

  const parsed = parseBranch(sourceBranch);
  if (parsed.kind === 'dev') {
    if (!requireApproval) {
      errors.push(
        `Branching from dev branch "${sourceBranch}" requires explicit approval.\n` +
        'This creates a sub-branch (copyof). Confirm in the prompt to proceed.'
      );
      return { valid: false, errors, warnings };
    }
    warnings.push(`Creating sub-branch from "${sourceBranch}".`);
    return { valid: true, errors, warnings };
  }

  if (sourceBranch === 'main') {
    errors.push('Cannot branch from "main". Use safe-production as your base.');
    return { valid: false, errors, warnings };
  }

  errors.push(`Unknown source branch "${sourceBranch}". Use safe-production.`);
  return { valid: false, errors, warnings };
}

export function validateCommitMessage(
  message:        string,
  expectedPrefix: string | null,
): ValidationResult {
  const errors:   string[] = [];
  const warnings: string[] = [];

  if (!message || message.trim().length === 0) {
    errors.push('Commit message cannot be empty.');
    return { valid: false, errors, warnings };
  }

  if (expectedPrefix) {
    if (!message.startsWith(expectedPrefix)) {
      errors.push(
        `Commit message must start with "${expectedPrefix}".\n` +
        `Example: ${expectedPrefix} your message here`
      );
      return { valid: false, errors, warnings };
    }
    const body = message.slice(expectedPrefix.length).trim();
    if (body.length === 0) {
      errors.push('Commit message body cannot be empty after the prefix.');
      return { valid: false, errors, warnings };
    }
    if (body.length > 72) {
      warnings.push('Commit subject is over 72 characters. Consider shortening.');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}