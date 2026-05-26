import React from 'react';
import { Box, Text } from 'ink';
import { ZEPHYR_WORDMARK, TAGLINE } from './wordmark.js';
import { theme } from '../theme.js';
import { useAppStore } from '../store/appStore.js';

interface Props { termWidth: number; }

export function Header({ termWidth }: Props) {
  const { repoName, currentBranch } = useAppStore();

  const branchColor =
    currentBranch === 'safe-production' ? theme.success
    : currentBranch === 'production'    ? theme.warn
    : currentBranch === 'main'          ? theme.text
    : theme.accent;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={theme.panel} paddingX={1}>
      {/* ASCII wordmark */}
      <Box flexDirection="column" alignItems="center">
        {ZEPHYR_WORDMARK.map((line, i) => (
          <Text key={i} color={i === 0 ? theme.text : i === 1 ? theme.accent : i === 2 ? theme.textDim : theme.panel}>
            {line}
          </Text>
        ))}
        <Text color={theme.textMuted}>{TAGLINE}</Text>
      </Box>

      {/* Divider */}
      <Text color={theme.panel}>{'─'.repeat(Math.max(0, termWidth - 4))}</Text>

      {/* Repo context row */}
      <Box justifyContent="space-between" paddingX={1}>
        <Box>
          <Text color={theme.textMuted}>repo  </Text>
          <Text color={theme.accent} bold>{repoName}</Text>
        </Box>
        <Box>
          <Text color={theme.textMuted}>branch  </Text>
          <Text color={branchColor} bold>{currentBranch}</Text>
        </Box>
        <Box>
          <Text color={theme.textMuted}>Press </Text>
          <Text color={theme.text} bold>/</Text>
          <Text color={theme.textMuted}> to enter command</Text>
        </Box>
      </Box>
    </Box>
  );
}