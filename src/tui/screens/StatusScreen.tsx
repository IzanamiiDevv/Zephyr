import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppStore } from '../store/appStore.js';

export function StatusScreen() {
  const { currentBranch, safeProdStatus, safeProdLastCheck } = useAppStore();

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text color={theme.text} bold>Branch Status</Text>
      <Text color={theme.textMuted}>
        Live status of your current branch against upstream and production.
      </Text>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>CURRENT BRANCH</Text>
        <Box marginTop={1} flexDirection="column" gap={0}>
          {[
            ['branch',        <Text color={theme.accent} bold>{currentBranch}</Text>],
            ['ahead/behind',  <Text color={theme.textMuted} dimColor>— loads in Layer 2</Text>],
            ['conflict risk', <Text color={theme.textMuted} dimColor>— loads in Layer 2</Text>],
            ['last commit',   <Text color={theme.textMuted} dimColor>— loads in Layer 2</Text>],
          ].map(([label, value]) => (
            <Box key={String(label)} gap={2}>
              <Text color={theme.textMuted}>{String(label).padEnd(16)}</Text>
              {value}
            </Box>
          ))}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>SAFE-PRODUCTION TRACKER</Text>
        <Box marginTop={1} flexDirection="column" gap={0}>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'status'.padEnd(16)}</Text>
            <Text color={
              safeProdStatus === 'synced'   ? theme.success
              : safeProdStatus === 'behind' ? theme.warn
              : safeProdStatus === 'error'  ? theme.danger
              : theme.accent
            } bold>{safeProdStatus.toUpperCase()}</Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'last checked'.padEnd(16)}</Text>
            <Text color={theme.textDim}>{safeProdLastCheck}</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}