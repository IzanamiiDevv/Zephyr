import { SCREENS } from '../tui/theme.js';

export interface Suggestion {
  value: string;
  label: string;
  desc:  string;
  kind:  'git' | 'zephyr' | 'flag';
}

const GIT_COMMANDS: Suggestion[] = [
  { value: 'git add',                   label: 'git add',                   desc: 'Stage files',                         kind: 'git' },
  { value: 'git add .',                 label: 'git add .',                 desc: 'Stage all changes',                   kind: 'git' },
  { value: 'git commit',                label: 'git commit',                desc: 'Commit staged changes',               kind: 'git' },
  { value: 'git push',                  label: 'git push',                  desc: 'Push to remote',                      kind: 'git' },
  { value: 'git pull',                  label: 'git pull',                  desc: 'Pull from remote',                    kind: 'git' },
  { value: 'git fetch',                 label: 'git fetch',                 desc: 'Fetch remote changes',                kind: 'git' },
  { value: 'git fetch --all',           label: 'git fetch --all',           desc: 'Fetch all remotes',                   kind: 'git' },
  { value: 'git status',                label: 'git status',                desc: 'Show working tree status',            kind: 'git' },
  { value: 'git log',                   label: 'git log',                   desc: 'Show commit log',                     kind: 'git' },
  { value: 'git log --oneline',         label: 'git log --oneline',         desc: 'Compact commit log',                  kind: 'git' },
  { value: 'git log --oneline -10',     label: 'git log --oneline -10',     desc: 'Last 10 commits',                     kind: 'git' },
  { value: 'git diff',                  label: 'git diff',                  desc: 'Show unstaged changes',               kind: 'git' },
  { value: 'git diff HEAD',             label: 'git diff HEAD',             desc: 'All changes since HEAD',              kind: 'git' },
  { value: 'git diff HEAD~1',           label: 'git diff HEAD~1',           desc: 'Diff against previous commit',        kind: 'git' },
  { value: 'git stash',                 label: 'git stash',                 desc: 'Stash working changes',               kind: 'git' },
  { value: 'git stash pop',             label: 'git stash pop',             desc: 'Apply most recent stash',             kind: 'git' },
  { value: 'git stash list',            label: 'git stash list',            desc: 'List all stashes',                    kind: 'git' },
  { value: 'git merge',                 label: 'git merge',                 desc: 'Merge a branch',                      kind: 'git' },
  { value: 'git rebase',                label: 'git rebase',                desc: 'Rebase current branch',               kind: 'git' },
  { value: 'git rebase -i',             label: 'git rebase -i',             desc: 'Interactive rebase',                  kind: 'git' },
  { value: 'git checkout',              label: 'git checkout',              desc: 'Switch branch or restore files',      kind: 'git' },
  { value: 'git checkout -b',           label: 'git checkout -b',           desc: 'Create and switch branch',            kind: 'git' },
  { value: 'git branch',                label: 'git branch',                desc: 'List or manage branches',             kind: 'git' },
  { value: 'git branch -a',             label: 'git branch -a',             desc: 'List all branches',                   kind: 'git' },
  { value: 'git branch -d',             label: 'git branch -d',             desc: 'Delete a branch',                     kind: 'git' },
  { value: 'git remote',                label: 'git remote',                desc: 'Manage remotes',                      kind: 'git' },
  { value: 'git remote -v',             label: 'git remote -v',             desc: 'Show remote URLs',                    kind: 'git' },
  { value: 'git reset',                 label: 'git reset',                 desc: 'Reset HEAD to a state',               kind: 'git' },
  { value: 'git reset --soft HEAD~1',   label: 'git reset --soft HEAD~1',   desc: 'Undo last commit, keep staged',       kind: 'git' },
  { value: 'git reset --hard HEAD~1',   label: 'git reset --hard HEAD~1',   desc: 'Undo last commit, discard changes',   kind: 'git' },
  { value: 'git restore',               label: 'git restore',               desc: 'Restore working tree files',          kind: 'git' },
  { value: 'git restore --staged',      label: 'git restore --staged',      desc: 'Unstage files',                       kind: 'git' },
  { value: 'git tag',                   label: 'git tag',                   desc: 'Create or list tags',                 kind: 'git' },
  { value: 'git cherry-pick',           label: 'git cherry-pick',           desc: 'Apply a specific commit',             kind: 'git' },
  { value: 'git blame',                 label: 'git blame',                 desc: 'Show who changed each line',          kind: 'git' },
  { value: 'git show',                  label: 'git show',                  desc: 'Show a commit or object',             kind: 'git' },
  { value: 'git clean -fd',             label: 'git clean -fd',             desc: 'Remove untracked files',              kind: 'git' },
];

const ZEPHYR_SUGGESTIONS: Suggestion[] = SCREENS.map(s => ({
  value: s.cmd,
  label: s.cmd,
  desc:  `Go to ${s.label} screen`,
  kind:  'zephyr' as const,
})).concat([
  { value: '/help',  label: '/help',  desc: 'Show help',   kind: 'zephyr' },
  { value: '/clear', label: '/clear', desc: 'Clear input', kind: 'zephyr' },
  { value: '/quit',  label: '/quit',  desc: 'Exit Zephyr', kind: 'zephyr' },
]);

export function getSuggestions(input: string): Suggestion[] {
  if (!input) return [...ZEPHYR_SUGGESTIONS, ...GIT_COMMANDS];

  const lower = input.toLowerCase().trim();

  if (lower.startsWith('/')) {
    return ZEPHYR_SUGGESTIONS.filter(s => s.value.startsWith(lower));
  }

  if (lower.startsWith('git ') || lower === 'git') {
    return GIT_COMMANDS.filter(s => s.value.toLowerCase().startsWith(lower));
  }

  const zephyr = ZEPHYR_SUGGESTIONS.filter(s => s.value.startsWith(lower));
  const git    = GIT_COMMANDS.filter(s => s.value.toLowerCase().startsWith(lower));
  return [...zephyr, ...git];
}

export type { Suggestion as AutocompleteSuggestion };