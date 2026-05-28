import React from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../theme.js';

export function LockedScreen() {
  useInput((input, key) => {
    if (key.ctrl && input === 'c') process.exit(0);
    if (input === 'q') process.exit(0);
  });

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" padding={4} gap={2}>
      <Box flexDirection="column" alignItems="center" gap={0}>
        <Text color={theme.danger}>{'    ███████    '}</Text>
        <Text color={theme.danger}>{'  ██       ██  '}</Text>
        <Text color={theme.danger}>{'  ██       ██  '}</Text>
        <Text color={theme.danger}>{'████████████████'}</Text>
        <Text color={theme.danger}>{'█               █'}</Text>
        <Text color={theme.danger}>{'█      ███      █'}</Text>
        <Text color={theme.danger}>{'█      █ █      █'}</Text>
        <Text color={theme.danger}>{'████████████████'}</Text>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(50)}</Text>

      <Box flexDirection="column" alignItems="center" gap={1}>
        <Text color={theme.danger} bold>REPOSITORY LOCKED FROM ZEPHYR ACTIONS</Text>
        <Text color={theme.textMuted}>This repository has been locked by the owner.</Text>
        <Text color={theme.textMuted}>No actions can be performed through Zephyr until unlocked.</Text>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(50)}</Text>

      <Box flexDirection="column" alignItems="center" gap={0}>
        <Text color={theme.textMuted} dimColor>Contact the repository owner to unlock.</Text>
        <Text color={theme.textMuted} dimColor>
          Press <Text color={theme.accent}>q</Text> or <Text color={theme.accent}>Ctrl+C</Text> to exit.
        </Text>
      </Box>
    </Box>
  );
}