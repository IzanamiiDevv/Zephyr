import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppStore, type SafeProdStatus } from '../store/appStore.js';

interface Props { termWidth: number; }

function SafeProdDot({ status }: { status: SafeProdStatus }) {
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    if (status !== 'checking') return;
    const t = setInterval(() => setBlink(b => !b), 600);
    return () => clearInterval(t);
  }, [status]);

  const dotColor =
    status === 'synced'   ? theme.success
    : status === 'behind' ? theme.warn
    : status === 'error'  ? theme.danger
    : blink               ? theme.accent
    : theme.textMuted;

  const label =
    status === 'synced'   ? 'safe-prod synced'
    : status === 'behind' ? 'safe-prod BEHIND — pull needed'
    : status === 'error'  ? 'safe-prod check failed'
    : 'safe-prod checking…';

  return (
    <Box gap={1}>
      <Text color={dotColor}>●</Text>
      <Text color={status === 'behind' ? theme.warn : theme.textMuted}>{label}</Text>
    </Box>
  );
}

export function Footer({ termWidth: _ }: Props) {
  const { safeProdStatus, safeProdLastCheck, footerMessage, networkStatus } = useAppStore();

  return (
    <Box borderStyle="single" borderColor={theme.panel} paddingX={1} justifyContent="space-between">
      <Box gap={2}>
        <SafeProdDot status={safeProdStatus} />
        {networkStatus === 'offline' && (
          <Box gap={1}>
            <Text color={theme.danger}>●</Text>
            <Text color={theme.danger}>offline</Text>
          </Box>
        )}
      </Box>

      {footerMessage && <Text color={theme.accent}>{footerMessage}</Text>}

      <Box gap={2}>
        <Text color={theme.textMuted}>checked {safeProdLastCheck}</Text>
        <Text color={theme.textMuted}>
          <Text color={theme.text}>/</Text>cmd{'  '}
          <Text color={theme.text}>Tab</Text>nav{'  '}
          <Text color={theme.text}>Esc</Text>close{'  '}
          <Text color={theme.text}>q</Text>quit
        </Text>
      </Box>
    </Box>
  );
}