import type { GitService } from './GitService.js';

export interface GitOutputLine {
  text:  string;
  kind:  'normal' | 'success' | 'error' | 'warning' | 'hash' | 'branch' | 'header' | 'dim';
}

export interface RunResult {
  ok:     boolean;
  lines:  GitOutputLine[];
  raw:    string;
}

const HASH_RE    = /\b[0-9a-f]{7,40}\b/;
const BRANCH_RE  = /\b(main|production|safe-production|HEAD|origin\/\S+)\b/;

/**
 * Classify a single line of git output into a display kind.
 */
export function classifyLine(line: string): GitOutputLine['kind'] {
  const lower = line.toLowerCase().trim();

  if (lower.startsWith('error:') || lower.startsWith('fatal:') || lower.startsWith('hint: conflict')) {
    return 'error';
  }
  if (lower.startsWith('warning:') || lower.includes('conflict')) {
    return 'warning';
  }
  if (
    lower.startsWith('commit ') ||
    lower.startsWith('merge commit') ||
    lower.startsWith('author:') ||
    lower.startsWith('date:')
  ) {
    return 'header';
  }
  if (lower.startsWith('diff --git') || lower.startsWith('index ') || lower.startsWith('@@')) {
    return 'header';
  }
  if (line.startsWith('+') && !line.startsWith('+++')) return 'success';
  if (line.startsWith('-') && !line.startsWith('---')) return 'error';
  if (HASH_RE.test(line) && line.trim().length <= 80) return 'hash';
  if (lower.includes('already up to date') || lower.includes('nothing to commit')) return 'success';
  if (lower.startsWith('on branch') || lower.startsWith('your branch')) return 'branch';
  if (lower.startsWith('  ') || lower.startsWith('\t')) return 'dim';

  return 'normal';
}

/**
 * Parse raw git output string into colored lines.
 */
export function parseOutput(raw: string, isError = false): GitOutputLine[] {
  const lines = raw.split('\n');
  return lines
    .map(line => {
      if (!line && lines.indexOf(line) === lines.length - 1) return null; // skip trailing newline
      const kind = isError ? 'error' : classifyLine(line);
      return { text: line, kind };
    })
    .filter((l): l is GitOutputLine => l !== null);
}

/**
 * Run a raw git command and return parsed output lines.
 */
export async function runGitCommand(
  git: GitService,
  input: string,
): Promise<RunResult> {
  // Strip leading "git " if present
  const stripped = input.trim().startsWith('git ')
    ? input.trim().slice(4).trim()
    : input.trim();

  if (!stripped) {
    return {
      ok:    false,
      lines: [{ text: 'No command entered.', kind: 'error' }],
      raw:   '',
    };
  }

  const args = stripped.split(/\s+/).filter(Boolean);

  try {
    const raw: string = await (git as any).git.raw(args);
    const lines = parseOutput(raw, false);

    if (lines.length === 0) {
      lines.push({ text: '(no output)', kind: 'dim' });
    }

    return { ok: true, lines, raw };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const lines = parseOutput(msg, true);
    return { ok: false, lines, raw: msg };
  }
}