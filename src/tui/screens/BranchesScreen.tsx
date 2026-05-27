import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppStore } from '../store/appStore.js';
import { parseBranch } from '../../git/BranchParser.js';

export function BranchesScreen() {
  const { localBranches, currentBranch, refreshBranches } = useAppStore();

  useEffect(() => { void refreshBranches(); }, []);

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text color={theme.text} bold>Branch Management</Text>
      <Text color={theme.textMuted}>
        All new branches must originate from{' '}
        <Text color={theme.success}>safe-production</Text>
        {' '}unless explicitly approved.
      </Text>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Actions hint */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>AVAILABLE ACTIONS</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {[
            ['N', 'New branch',      'Create production/<type>/<scope>/<name>'],
            ['R', 'Register branch', 'Push local branch to remote'],
            ['P', 'Pull request',    'Open PR into production'],
            ['S', 'Sub-branch',      'Fork from an existing production/* branch'],
            ['D', 'Delete branch',   'Remove local + remote after merge'],
          ].map(([key, label, desc]) => (
            <Box key={key} gap={2}>
              <Text color={theme.bg} backgroundColor={theme.panel}>{` ${key} `}</Text>
              <Text color={theme.text} bold>{(label ?? '').padEnd(20)}</Text>
              <Text color={theme.textMuted}>{desc}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Live branch list */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>LOCAL BRANCHES</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {localBranches.length === 0 ? (
            <Text color={theme.textMuted} dimColor>Loading branches…</Text>
          ) : (
            localBranches.map((b) => {
              const parsed  = parseBranch(b.name);
              const isCurrent = b.name === currentBranch;

              const typeColor =
                parsed.kind === 'core'    ? theme.success
                : parsed.kind === 'dev'   ? theme.accent
                : parsed.kind === 'release' ? theme.warn
                : theme.textMuted;

              const typeLabel =
                parsed.kind === 'dev'     ? `${parsed.type}(${parsed.scope})`
                : parsed.kind === 'release' ? `release/${parsed.version}`
                : parsed.kind === 'core'  ? parsed.name
                : 'unknown';

              return (
                <Box key={b.name} gap={2}>
                  <Text color={isCurrent ? theme.accent : theme.textMuted}>
                    {isCurrent ? '▶' : ' '}
                  </Text>
                  <Text color={isCurrent ? theme.text : theme.textMuted} bold={isCurrent}>
                    {b.name.padEnd(45)}
                  </Text>
                  <Text color={typeColor}>{typeLabel}</Text>
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Box>
  );
}