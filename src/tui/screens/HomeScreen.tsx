import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppStore } from '../store/appStore.js';
import { parseBranch } from '../../git/BranchParser.js';

const QUICK_ACTIONS = [
  { key: '/branches', label: 'Manage Branches',  hint: 'create, register, switch' },
  { key: '/status',   label: 'Branch Status',    hint: 'ahead/behind, conflict risk' },
  { key: '/commits',  label: 'Commits & Push',   hint: 'auto-prefixed conventional commits' },
  { key: '/git',      label: 'Raw Git',           hint: 'passthrough git commands' },
];

export function HomeScreen() {
  const { repoName, currentBranch, branchStatus, localBranches } = useAppStore();
  const parsed = parseBranch(currentBranch);

  const branchTypeLabel =
    parsed.kind === 'dev'
      ? `${parsed.type}(${parsed.scope})`
      : parsed.kind === 'core'
      ? parsed.name
      : currentBranch;

  return (
    <Box flexDirection="column" padding={2} gap={1}>

      {/* Repo summary */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.text} bold>Welcome to Zephyr</Text>
        <Box gap={2} marginTop={1}>
          <Box gap={1}>
            <Text color={theme.textMuted}>repo</Text>
            <Text color={theme.accent} bold>{repoName || '—'}</Text>
          </Box>
          <Text color={theme.textMuted}>·</Text>
          <Box gap={1}>
            <Text color={theme.textMuted}>branch</Text>
            <Text color={theme.text} bold>{branchTypeLabel || '—'}</Text>
          </Box>
          <Text color={theme.textMuted}>·</Text>
          <Box gap={1}>
            <Text color={theme.textMuted}>branches</Text>
            <Text color={theme.text} bold>{localBranches.length}</Text>
          </Box>
          {branchStatus && (
            <>
              <Text color={theme.textMuted}>·</Text>
              <Box gap={1}>
                <Text color={branchStatus.isDirty ? theme.warn : theme.success}>
                  {branchStatus.isDirty ? '● dirty' : '● clean'}
                </Text>
              </Box>
            </>
          )}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Quick actions */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>QUICK ACTIONS</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {QUICK_ACTIONS.map(({ key, label, hint }) => (
            <Box key={key} gap={2}>
              <Text color={theme.accent}>{key.padEnd(14)}</Text>
              <Text color={theme.text} bold>{label.padEnd(22)}</Text>
              <Text color={theme.textMuted}>{hint}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Branch model */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>BRANCH MODEL</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {[
            ['main',                             'public release viewpoint'],
            ['release/*',                        'clean release — no temp files'],
            ['production',                       'active merge target — PR required'],
            ['safe-production',                  'stable copy of production (CI managed)'],
            ['production/<type>/<scope>/<name>', 'your dev branch — deleted on merge'],
          ].map(([branch, desc]) => (
            <Box key={branch} gap={2}>
              <Text color={theme.accent}>{(branch ?? '').padEnd(38)}</Text>
              <Text color={theme.textMuted}>{desc}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}