import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppStore } from '../store/appStore.js';

const COMMIT_TYPES = [
  { type: 'feat',     color: theme.success,   desc: 'A new feature' },
  { type: 'fix',      color: theme.danger,    desc: 'A bug fix' },
  { type: 'refactor', color: theme.accent,    desc: 'Code restructure, no feature change' },
  { type: 'docs',     color: theme.textDim,   desc: 'Documentation only' },
  { type: 'style',    color: theme.panel,     desc: 'Formatting, no logic change' },
  { type: 'chore',    color: theme.textMuted, desc: 'Build, tooling, dependencies' },
];

export function CommitsScreen() {
  const { currentBranch } = useAppStore();
  const parts = currentBranch.split('/');
  const branchType  = parts[1] ?? null;
  const branchScope = parts[2] ?? null;

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text color={theme.text} bold>Commits & Push</Text>
      <Text color={theme.textMuted}>
        Commits are auto-prefixed from your branch name using conventional commits.
      </Text>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>COMMIT PREFIX (from current branch)</Text>
        <Box marginTop={1} gap={2}>
          {branchType && branchScope ? (
            <>
              <Text color={theme.accent} bold>{branchType}</Text>
              <Text color={theme.textMuted}>{'('}</Text>
              <Text color={theme.text}>{branchScope}</Text>
              <Text color={theme.textMuted}>{'):'}</Text>
              <Text color={theme.textMuted} dimColor>{'<your message>'}</Text>
            </>
          ) : (
            <Text color={theme.textMuted} dimColor>
              Not on a production/* branch — no auto-prefix applied.
            </Text>
          )}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>CONVENTIONAL COMMIT TYPES</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {COMMIT_TYPES.map(({ type, color, desc }) => (
            <Box key={type} gap={2}>
              <Text color={color} bold>{type.padEnd(12)}</Text>
              <Text color={theme.textMuted}>{desc}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>RECENT COMMITS</Text>
        <Box marginTop={1}>
          <Text color={theme.textMuted} dimColor>
            ○  Commit history loads in Layer 2 (git integration).
          </Text>
        </Box>
      </Box>
    </Box>
  );
}