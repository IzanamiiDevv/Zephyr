import React from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../theme.js';
import { useAppStore } from '../store/appStore.js';
import { bootstrapRepo } from '../../git/RepoBootstrap.js';

export function ErrorScreen() {
  const { repoError, setRepoContext, setGitService, setRepoError } = useAppStore();

  // Allow user to retry by pressing R
  useInput(async (input) => {
    if (input.toLowerCase() === 'r') {
      const result = await bootstrapRepo(process.cwd());
      if (result.ok && result.git) {
        setGitService(result.git);
        setRepoContext(result.repoName, result.currentBranch);
      } else {
        setRepoError(result.error);
      }
    }
    if (input.toLowerCase() === 'q') {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      {/* Error header */}
      <Box gap={2}>
        <Text color={theme.danger} bold>✖ NOT A GIT REPOSITORY</Text>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Error detail */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.danger}
        padding={1}
        gap={1}
      >
        {(repoError ?? '').split('\n').map((line, i) => (
          <Text key={i} color={i === 0 ? theme.warn : theme.textMuted}>
            {line}
          </Text>
        ))}
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Instructions */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>WHAT TO DO</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          <Box gap={2}>
            <Text color={theme.textMuted}>1.</Text>
            <Text color={theme.textMuted}>
              Open a new terminal in your git repository directory
            </Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>2.</Text>
            <Text color={theme.textMuted}>
              Run <Text color={theme.accent}>npm run dev</Text> from inside that directory
            </Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>3.</Text>
            <Text color={theme.textMuted}>
              Or press <Text color={theme.accent}>R</Text> to retry in the current directory
            </Text>
          </Box>
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Keybinds */}
      <Box gap={4}>
        <Box gap={1}>
          <Text color={theme.bg} backgroundColor={theme.accent}>{' R '}</Text>
          <Text color={theme.textMuted}>Retry current directory</Text>
        </Box>
        <Box gap={1}>
          <Text color={theme.bg} backgroundColor={theme.panel}>{' Q '}</Text>
          <Text color={theme.textMuted}>Quit Zephyr</Text>
        </Box>
      </Box>
    </Box>
  );
}