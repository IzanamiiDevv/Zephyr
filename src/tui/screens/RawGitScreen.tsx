import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';

const EXAMPLE_CMDS = [
  'git log --oneline -10',
  'git diff HEAD~1',
  'git stash list',
  'git remote -v',
  'git fetch --all',
];

export function RawGitScreen() {
  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text color={theme.text} bold>Raw Git Passthrough</Text>
      <Text color={theme.textMuted}>
        Execute any git command directly. Output is rendered with syntax highlighting.
        Zephyr branch rules do <Text color={theme.warn}>not</Text> apply here — use with care.
      </Text>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>HOW TO USE</Text>
        <Box marginTop={1}>
          <Text color={theme.textMuted}>
            Press <Text color={theme.accent}>/</Text> to open the command bar,
            then type your git command (with or without the{' '}
            <Text color={theme.accent}>git</Text> prefix).
          </Text>
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>EXAMPLE COMMANDS</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {EXAMPLE_CMDS.map(cmd => (
            <Box key={cmd} gap={2}>
              <Text color={theme.textMuted}>$</Text>
              <Text color={theme.accent}>{cmd}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>OUTPUT</Text>
        <Box marginTop={1} borderStyle="single" borderColor={theme.panel} padding={1} flexDirection="column">
          <Text color={theme.textMuted} dimColor>
            ○  Command output renders here in Layer 2 (git integration).
          </Text>
        </Box>
      </Box>
    </Box>
  );
}