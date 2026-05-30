import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme }        from '../theme.js';
import { useAppStore }  from '../store/appStore.js';
import { writeConfig }  from '../../git/ZephyrConfig.js';

interface Props {
  reason:   string;
  hint:     string;
  onUnlock: () => void;
}

export function LockedScreen({ reason, hint, onUnlock }: Props) {
  const { isOwner, zephyrConfig, setZephyrConfig, gitService } = useAppStore();
  const [asking, setAsking] = useState(false);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') { process.exit(0); return; }
    if (input === 'q' && !asking)  { process.exit(0); return; }

    if (isOwner && input.toLowerCase() === 'u' && !asking) {
      setAsking(true);
      return;
    }

    if (asking) {
      if (input.toLowerCase() === 'y') {
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
        <Text color={theme.danger} bold>ACCESS RESTRICTED</Text>
        <Text color={theme.textMuted}>{reason}</Text>
        <Text color={theme.textMuted} dimColor>{hint}</Text>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(50)}</Text>

      {/* Owner unlock */}
      {isOwner && !asking && (
        <Box flexDirection="column" alignItems="center" gap={1}>
          <Text color={theme.accent} bold>You are the repository owner.</Text>
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
            This sets <Text color={theme.accent}>lock: false</Text> in zephyr.json.
          </Text>
          <Box gap={3} marginTop={1}>
            <Text color={theme.bg} backgroundColor={theme.accent} bold>{' Y — unlock '}</Text>
            <Text color={theme.textMuted}>N / Esc — cancel</Text>
          </Box>
        </Box>
      )}

      {!isOwner && (
        <Text color={theme.textMuted} dimColor>
          Press <Text color={theme.accent}>q</Text> or{' '}
          <Text color={theme.accent}>Ctrl+C</Text> to exit.
        </Text>
      )}
    </Box>
  );
}