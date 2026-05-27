import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppStore } from '../store/appStore.js';
import { parseBranch } from '../../git/BranchParser.js';

function StatusRow({ label, value, valueColor }: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <Box gap={2}>
      <Text color={theme.textMuted}>{label.padEnd(18)}</Text>
      <Text color={valueColor ?? theme.text}>{value}</Text>
    </Box>
  );
}

export function StatusScreen() {
  const {
    branchStatus, statusLoading,
    safeProdStatus, safeProdLastCheck,
    refreshStatus, currentBranch,
  } = useAppStore();

  // Refresh on mount
  useEffect(() => { void refreshStatus(); }, []);

  const parsed = parseBranch(currentBranch);

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

  const conflictLabel =
    !branchStatus         ? '—'
    : branchStatus.conflictRisk ? '⚠ files overlap with production'
    : '✔ no overlap detected';

  const conflictColor =
    !branchStatus         ? theme.textMuted
    : branchStatus.conflictRisk ? theme.warn
    : theme.success;

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Box gap={2}>
        <Text color={theme.text} bold>Branch Status</Text>
        {statusLoading && <Text color={theme.textMuted} dimColor>refreshing…</Text>}
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Current branch info */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>CURRENT BRANCH</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          <StatusRow
            label="branch"
            value={currentBranch}
            valueColor={theme.accent}
          />
          {parsed.kind === 'dev' && (
            <>
              <StatusRow label="type"  value={parsed.type}  valueColor={theme.text} />
              <StatusRow label="scope" value={parsed.scope} valueColor={theme.text} />
            </>
          )}
          <StatusRow
            label="ahead / behind"
            value={aheadBehindLabel}
            valueColor={aheadBehindColor}
          />
          <StatusRow
            label="conflict risk"
            value={conflictLabel}
            valueColor={conflictColor}
          />
          <StatusRow
            label="working tree"
            value={
              !branchStatus ? '—'
              : branchStatus.isDirty
                ? `dirty  (${branchStatus.stagedCount} staged, ${branchStatus.unstagedCount} unstaged)`
                : 'clean'
            }
            valueColor={
              !branchStatus         ? theme.textMuted
              : branchStatus.isDirty ? theme.warn
              : theme.success
            }
          />
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Last commit */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>LAST COMMIT</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          <StatusRow label="message" value={branchStatus?.lastCommit ?? '—'} />
          <StatusRow label="author"  value={branchStatus?.lastAuthor ?? '—'} />
          <StatusRow label="date"    value={branchStatus?.lastDate   ?? '—'} valueColor={theme.textMuted} />
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Safe-prod tracker */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>SAFE-PRODUCTION TRACKER</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          <StatusRow
            label="status"
            value={safeProdStatus.toUpperCase()}
            valueColor={
              safeProdStatus === 'synced'   ? theme.success
              : safeProdStatus === 'behind' ? theme.warn
              : safeProdStatus === 'error'  ? theme.danger
              : theme.accent
            }
          />
          <StatusRow label="last checked" value={safeProdLastCheck} valueColor={theme.textDim} />
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.textMuted} dimColor>Press </Text>
        <Text color={theme.accent}>R</Text>
        <Text color={theme.textMuted} dimColor> to refresh</Text>
      </Box>
    </Box>
  );
}