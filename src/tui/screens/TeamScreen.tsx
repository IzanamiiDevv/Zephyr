import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppStore } from '../store/appStore.js';
import type { PresenceEntry } from '../../git/TeamService.js';

function PresenceRow({ entry, isSelf }: { entry: PresenceEntry; isSelf: boolean }) {
  const isAway     = entry.status === 'away';
  const dotColor   = isAway ? theme.textMuted : theme.success;
  const branchLabel =
    entry.branchType && entry.branchScope
      ? `${entry.branchType}(${entry.branchScope}): ${entry.branchName}`
      : entry.branch;

  const now      = new Date();
  const diffMin  = Math.floor((now.getTime() - new Date(entry.lastSeen).getTime()) / 60_000);
  const timeAgo  = diffMin < 1 ? 'just now' : diffMin < 60 ? `${diffMin}m ago` : `${Math.floor(diffMin/60)}h ago`;

  return (
    <Box flexDirection="column" gap={0} marginBottom={1}>
      <Box gap={2}>
        <Text color={dotColor}>{isAway ? '○' : '●'}</Text>
        <Text color={isSelf ? theme.accent : theme.text} bold>
          {entry.name || entry.email}{isSelf ? ' (you)' : ''}
        </Text>
        {isAway && <Text color={theme.textMuted} dimColor>[away]</Text>}
        <Text color={theme.textMuted} dimColor>{timeAgo}</Text>
      </Box>
      <Box gap={2} paddingLeft={3}>
        <Text color={theme.textMuted}>working on</Text>
        {entry.isRemote
          ? <Text color={theme.accent}>{branchLabel}</Text>
          : <Text color={theme.warn}>local {branchLabel}</Text>
        }
      </Box>
    </Box>
  );
}

export function TeamScreen() {
  const { teamPresence, networkStatus } = useAppStore();
  const entries = Object.values(teamPresence);
  const active  = entries.filter(e => e.status === 'active');
  const away    = entries.filter(e => e.status === 'away');

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Box justifyContent="space-between">
        <Text color={theme.text} bold>Team Panel</Text>
        <Box gap={2}>
          <Text color={networkStatus === 'online' ? theme.success : theme.danger}>
            {networkStatus === 'online' ? '● online' : '○ offline'}
          </Text>
          <Text color={theme.textMuted} dimColor>refreshes every 60s</Text>
        </Box>
      </Box>

      <Text color={theme.textMuted}>
        Presence via git notes (<Text color={theme.accent}>refs/notes/zephyr-presence</Text>).
      </Text>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {networkStatus === 'offline' && (
        <Box borderStyle="single" borderColor={theme.warn} paddingX={1}>
          <Text color={theme.warn}>⚠ Offline — showing last known presence data.</Text>
        </Box>
      )}

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>ACTIVE ({active.length})</Text>
        <Box flexDirection="column" marginTop={1}>
          {active.length === 0 ? (
            <Text color={theme.textMuted} dimColor>No active developers detected.</Text>
          ) : (
            active.map(e => <PresenceRow key={e.email} entry={e} isSelf={false} />)
          )}
        </Box>
      </Box>

      {away.length > 0 && (
        <>
          <Text color={theme.panel}>{'─'.repeat(60)}</Text>
          <Box flexDirection="column" gap={0}>
            <Text color={theme.textDim} bold>
              AWAY ({away.length} — no update in 30+ min)
            </Text>
            <Box flexDirection="column" marginTop={1}>
              {away.map(e => <PresenceRow key={e.email} entry={e} isSelf={false} />)}
            </Box>
          </Box>
        </>
      )}

      {entries.length === 0 && (
        <Text color={theme.textMuted} dimColor>
          No presence data yet. Will appear after first 60s sync.
        </Text>
      )}
    </Box>
  );
}