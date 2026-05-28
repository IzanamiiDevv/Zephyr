import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme }        from '../theme.js';
import { useAppStore }  from '../store/appStore.js';
import { writeConfig }  from '../../git/ZephyrConfig.js';

interface Props {
  onUnlock: () => void;
}

export function LockedScreen({ onUnlock }: Props) {
  const { isOwner, zephyrConfig, setZephyrConfig, gitService } = useAppStore();
  const [asking, setAsking] = useState(false);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') { process.exit(0); return; }
    if (input === 'q' && !asking)  { process.exit(0); return; }

    // Owner can press U to start unlock prompt
    if (isOwner && input.toLowerCase() === 'u' && !asking) {
      setAsking(true);
      return;
    }

    if (asking) {
      if (input.toLowerCase() === 'y') {
        // Unlock — write to zephyr.json
        const repoRoot = (gitService as any)?.repoRoot ?? process.cwd();
        const updated  = { ...zephyrConfig, lock: false };
        writeConfig(repoRoot, updated);
        setZephyrConfig(updated);
        onUnlock();
        return;
      }
      if (input.toLowerCase() === 'n' || key.escape) {
        setAsking(false);
        return;
      }
    }
  });

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" padding={4} gap={2}>

      {/* Lock icon */}
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

      {/* Owner unlock prompt */}
      {isOwner && !asking && (
        <Box flexDirection="column" alignItems="center" gap={1}>
          <Text color={theme.accent} bold>You are an owner of this repository.</Text>
          <Box gap={3}>
            <Text color={theme.bg} backgroundColor={theme.accent} bold>{' U — unlock '}</Text>
            <Text color={theme.textMuted}>q — quit</Text>
          </Box>
        </Box>
      )}

      {isOwner && asking && (
        <Box flexDirection="column" alignItems="center" gap={1}>
          <Text color={theme.warn} bold>⚠ Unlock this repository?</Text>
          <Text color={theme.textMuted}>
            This will set <Text color={theme.accent}>lock: false</Text> in zephyr.json
            and allow all users back in.
          </Text>
          <Box gap={3} marginTop={1}>
            <Text color={theme.bg} backgroundColor={theme.accent} bold>{' Y — unlock '}</Text>
            <Text color={theme.textMuted}>N / Esc — cancel</Text>
          </Box>
        </Box>
      )}

      {!isOwner && (
        <Box flexDirection="column" alignItems="center" gap={0}>
          <Text color={theme.textMuted} dimColor>Contact the repository owner to unlock.</Text>
          <Text color={theme.textMuted} dimColor>
            Press <Text color={theme.accent}>q</Text> or{' '}
            <Text color={theme.accent}>Ctrl+C</Text> to exit.
          </Text>
        </Box>
      )}
    </Box>
  );
}