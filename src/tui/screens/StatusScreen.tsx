import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme }           from '../theme.js';
import { useAppStore }     from '../store/appStore.js';
import { parseBranch }     from '../../git/BranchParser.js';
import {
  pullCurrentBranch,
  getDiffVsProduction,
  switchBranch,
  type DiffSummary,
} from '../../git/StatusWorkflows.js';

type View =
  | 'main'
  | 'pull-confirm'
  | 'pulling'
  | 'pull-result'
  | 'diff'
  | 'switch'
  | 'error';

function DiffFileList({ summary, title }: { summary: DiffSummary; title: string }) {
  const MAX_SHOW = 20;
  const shown    = summary.files.slice(0, MAX_SHOW);

  const statusColor = (s: string) =>
    s === 'added'   ? theme.success
    : s === 'deleted' ? theme.danger
    : s === 'renamed' ? theme.warn
    : theme.text;

  const statusChar = (s: string) =>
    s === 'added'   ? 'A'
    : s === 'deleted' ? 'D'
    : s === 'renamed' ? 'R'
    : 'M';

  return (
    <Box flexDirection="column" gap={0}>
      <Box justifyContent="space-between">
        <Text color={theme.textDim} bold>{title}</Text>
        <Box gap={3}>
          <Text color={theme.success}>+{summary.totalAdded}</Text>
          <Text color={theme.danger}>-{summary.totalDel}</Text>
          <Text color={theme.textMuted}>
            {summary.files.length} file{summary.files.length !== 1 ? 's' : ''}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginTop={1} gap={0}>
        {shown.length === 0 ? (
          <Text color={theme.textMuted} dimColor>No changes.</Text>
        ) : (
          shown.map(f => (
            <Box key={f.path} gap={2}>
              <Text color={statusColor(f.status)} bold>{statusChar(f.status)}</Text>
              <Text color={theme.text}>
                {f.path.length > 44
                  ? '…' + f.path.slice(-43)
                  : f.path.padEnd(46)
                }
              </Text>
              <Text color={theme.success} dimColor>+{f.insertions}</Text>
              <Text color={theme.danger}  dimColor>-{f.deletions}</Text>
            </Box>
          ))
        )}
        {summary.files.length > MAX_SHOW && (
          <Text color={theme.textMuted} dimColor>
            …and {summary.files.length - MAX_SHOW} more files
          </Text>
        )}
      </Box>
    </Box>
  );
}

export function StatusScreen() {
  const {
    branchStatus, statusLoading,
    safeProdStatus, safeProdLastCheck,
    refreshStatus, currentBranch,
    gitService, setScreen,
    setFooterMessage, localBranches,
    refreshBranches, setRepoContext,
  } = useAppStore();

  const [view,        setView]        = useState<View>('main');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [diffSummary, setDiffSummary] = useState<DiffSummary | null>(null);
  const [pullSummary, setPullSummary] = useState<DiffSummary | null>(null);
  const [switchSel,   setSwitchSel]   = useState(0);

  const parsed         = parseBranch(currentBranch);
  const switchBranches = localBranches.filter(b => b.name !== currentBranch);
  const safeSwitchSel  = Math.min(switchSel, Math.max(0, switchBranches.length - 1));

  useEffect(() => {
    void refreshStatus();
    void refreshBranches();
  }, []);

  // ── Main view keybinds ───────────────────────────────────────────────
  useInput(async (input) => {
    if (view !== 'main' || loading) return;
    if (input.toLowerCase() === 'r') { await refreshStatus(); return; }
    if (input.toLowerCase() === 'p') { setView('pull-confirm'); return; }
    if (input.toLowerCase() === 'd') {
      if (!gitService) return;
      setLoading(true);
      const summary = await getDiffVsProduction(gitService);
      setLoading(false);
      setDiffSummary(summary);
      setView('diff');
      return;
    }
    if (input.toLowerCase() === 's') { setSwitchSel(0); setView('switch'); return; }
  });

  // ── Pull confirm keybinds ────────────────────────────────────────────
  useInput(async (input, key) => {
    if (view !== 'pull-confirm') return;
    if (key.escape || input.toLowerCase() === 'n') { setView('main'); return; }
    if (input.toLowerCase() === 'y') {
      if (!gitService) return;
      setView('pulling');
      setLoading(true);
      const result = await pullCurrentBranch(gitService);
      setLoading(false);

      if (!result.ok) { setError(result.message); setView('error'); return; }

      setPullSummary(result.summary ?? null);
      await refreshStatus();

      if (result.message === 'Already up to date.') {
        setFooterMessage('✔ Already up to date.');
        setTimeout(() => setFooterMessage(null), 3000);
        setView('main');
        return;
      }

      setView('pull-result');
    }
  });

  // ── Switch keybinds ──────────────────────────────────────────────────
  useInput(async (input, key) => {
    if (view !== 'switch') return;
    if (key.escape) { setView('main'); return; }
    if (key.upArrow)   { setSwitchSel(i => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setSwitchSel(i => Math.min(switchBranches.length - 1, i + 1)); return; }
    if (key.return) {
      const target = switchBranches[safeSwitchSel];
      if (!target || !gitService) return;
      setLoading(true);
      const result = await switchBranch(gitService, target.name);
      setLoading(false);
      if (!result.ok) { setError(result.message); setView('error'); return; }
      const info = await gitService.getRepoInfo();
      setRepoContext(info.name, info.currentBranch);
      await refreshStatus();
      await refreshBranches();
      setFooterMessage(`✔ Switched to "${target.name}"`);
      setTimeout(() => setFooterMessage(null), 3000);
      setView('main');
    }
  });

  // ── Exit sub-views ───────────────────────────────────────────────────
  useInput((input, key) => {
    if (!['pull-result', 'diff', 'error'].includes(view)) return;
    if (key.escape || key.return || input) {
      if (view === 'pull-result') {
        setScreen('staging');
      } else {
        setView('main');
      }
    }
  });

  // ── Pull confirm ─────────────────────────────────────────────────────
  if (view === 'pull-confirm') {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.text} bold>Pull Latest Changes</Text>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Box gap={2}>
          <Text color={theme.textMuted}>{'branch'.padEnd(14)}</Text>
          <Text color={theme.accent} bold>{currentBranch}</Text>
        </Box>
        <Box gap={2}>
          <Text color={theme.textMuted}>{'behind'.padEnd(14)}</Text>
          <Text color={branchStatus?.behind ? theme.danger : theme.success} bold>
            {branchStatus?.behind ?? 0} commit{branchStatus?.behind !== 1 ? 's' : ''}
          </Text>
        </Box>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Text color={theme.textMuted}>
          This will pull from{' '}
          <Text color={theme.accent}>origin/{currentBranch}</Text>.
          Uncommitted changes will block the pull.
        </Text>
        <Box gap={3} marginTop={1}>
          <Text color={theme.bg} backgroundColor={theme.accent} bold>{' Y — pull '}</Text>
          <Text color={theme.textMuted}>N / Esc — cancel</Text>
        </Box>
      </Box>
    );
  }

  // ── Pulling ───────────────────────────────────────────────────────────
  if (view === 'pulling') {
    return (
      <Box flexDirection="column" padding={2} gap={1} justifyContent="center" alignItems="center">
        <Text color={theme.accent}>Pulling from origin/{currentBranch}…</Text>
      </Box>
    );
  }

  // ── Pull result ───────────────────────────────────────────────────────
  if (view === 'pull-result' && pullSummary) {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.success} bold>✔ Pull successful</Text>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <DiffFileList summary={pullSummary} title="CHANGES PULLED" />
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Text color={theme.textMuted} dimColor>
          Press any key to go to Staging to review changes.
        </Text>
      </Box>
    );
  }

  // ── Diff vs production ────────────────────────────────────────────────
  if (view === 'diff' && diffSummary) {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.text} bold>Diff vs Production</Text>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <DiffFileList summary={diffSummary} title={`CHANGES IN ${currentBranch}`} />
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Text color={theme.textMuted} dimColor>Press any key to go back.</Text>
      </Box>
    );
  }

  // ── Switch branch ─────────────────────────────────────────────────────
  if (view === 'switch') {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.text} bold>Switch Branch</Text>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>

        {switchBranches.length === 0 ? (
          <Text color={theme.textMuted} dimColor>
            No other local branches to switch to.
          </Text>
        ) : (
          <Box flexDirection="column" gap={0}>
            {switchBranches.map((b, i) => {
              const isSel     = i === safeSwitchSel;
              const p         = parseBranch(b.name);
              const typeLabel =
                p.kind === 'dev'     ? `${p.type}(${p.scope})`
                : p.kind === 'core'  ? p.name
                : p.kind === 'release' ? `release/${p.version}`
                : '—';

              return (
                <Box key={b.name} gap={2}>
                  {isSel ? (
                    <>
                      <Text color={theme.bg} backgroundColor={theme.accent} bold>
                        {` ▶ ${b.name.padEnd(44)} `}
                      </Text>
                      <Text color={theme.textDim}>{typeLabel}</Text>
                    </>
                  ) : (
                    <>
                      <Text color={theme.textMuted}>{'   '}{b.name.padEnd(46)}</Text>
                      <Text color={theme.textMuted} dimColor>{typeLabel}</Text>
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {loading && <Text color={theme.accent}>Switching…</Text>}
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Text color={theme.textMuted} dimColor>↑↓ navigate  Enter switch  Esc cancel</Text>
      </Box>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (view === 'error') {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.danger} bold>✖ Operation Failed</Text>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Box borderStyle="single" borderColor={theme.danger} paddingX={1}>
          {(error ?? '').split('\n').map((line, i) => (
            <Text key={i} color={theme.danger}>{line}</Text>
          ))}
        </Box>
        <Text color={theme.textMuted} dimColor>Press any key to go back.</Text>
      </Box>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────
  const aheadBehindColor =
    !branchStatus             ? theme.textMuted
    : branchStatus.behind > 0 ? theme.danger
    : branchStatus.ahead  > 0 ? theme.warn
    : theme.success;

  const aheadBehindLabel =
    !branchStatus ? '—'
    : branchStatus.ahead === 0 && branchStatus.behind === 0
    ? 'up to date'
    : `↑ ${branchStatus.ahead} ahead  ↓ ${branchStatus.behind} behind`;

  const conflictColor =
    !branchStatus              ? theme.textMuted
    : branchStatus.conflictRisk ? theme.warn
    : theme.success;

  const conflictLabel =
    !branchStatus              ? '—'
    : branchStatus.conflictRisk ? '⚠ files overlap with production'
    : '✔ no overlap detected';

  return (
    <Box flexDirection="column" padding={2} gap={1}>

      <Box justifyContent="space-between">
        <Text color={theme.text} bold>Branch Status</Text>
        {(statusLoading || loading) && (
          <Text color={theme.textMuted} dimColor>refreshing…</Text>
        )}
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Actions */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>ACTIONS</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {[
            ['P', 'Pull',         'Pull latest changes from remote'],
            ['D', 'Diff vs prod', 'Show file changes vs production'],
            ['S', 'Switch',       'Switch to another local branch'],
            ['R', 'Refresh',      'Reload status data'],
          ].map(([key, label, desc]) => (
            <Box key={key} gap={2}>
              <Text color={theme.bg} backgroundColor={theme.panel}>{` ${key} `}</Text>
              <Text color={theme.text} bold>{(label ?? '').padEnd(16)}</Text>
              <Text color={theme.textMuted}>{desc}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Current branch */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>CURRENT BRANCH</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'branch'.padEnd(18)}</Text>
            <Text color={theme.accent} bold>{currentBranch}</Text>
          </Box>
          {parsed.kind === 'dev' && (
            <>
              <Box gap={2}>
                <Text color={theme.textMuted}>{'type'.padEnd(18)}</Text>
                <Text color={theme.text}>{parsed.type}</Text>
              </Box>
              <Box gap={2}>
                <Text color={theme.textMuted}>{'scope'.padEnd(18)}</Text>
                <Text color={theme.text}>{parsed.scope}</Text>
              </Box>
            </>
          )}
          <Box gap={2}>
            <Text color={theme.textMuted}>{'ahead / behind'.padEnd(18)}</Text>
            <Text color={aheadBehindColor} bold>{aheadBehindLabel}</Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'conflict risk'.padEnd(18)}</Text>
            <Text color={conflictColor}>{conflictLabel}</Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'working tree'.padEnd(18)}</Text>
            <Text color={
              !branchStatus          ? theme.textMuted
              : branchStatus.isDirty ? theme.warn
              : theme.success
            }>
              {!branchStatus ? '—'
                : branchStatus.isDirty
                ? `dirty  (${branchStatus.stagedCount} staged, ${branchStatus.unstagedCount} unstaged)`
                : 'clean'
              }
            </Text>
          </Box>
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Last commit */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>LAST COMMIT</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'message'.padEnd(18)}</Text>
            <Text color={theme.text}>{branchStatus?.lastCommit ?? '—'}</Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'author'.padEnd(18)}</Text>
            <Text color={theme.textDim}>{branchStatus?.lastAuthor ?? '—'}</Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'date'.padEnd(18)}</Text>
            <Text color={theme.textMuted} dimColor>{branchStatus?.lastDate ?? '—'}</Text>
          </Box>
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Safe-prod tracker */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>SAFE-PRODUCTION TRACKER</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'status'.padEnd(18)}</Text>
            <Text color={
              safeProdStatus === 'synced'   ? theme.success
              : safeProdStatus === 'behind' ? theme.warn
              : safeProdStatus === 'error'  ? theme.danger
              : theme.accent
            } bold>
              {safeProdStatus.toUpperCase()}
            </Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'last checked'.padEnd(18)}</Text>
            <Text color={theme.textDim}>{safeProdLastCheck}</Text>
          </Box>
        </Box>
      </Box>

    </Box>
  );
}