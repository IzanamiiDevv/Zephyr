import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';

const QUICK_ACTIONS = [
  { key: '/branches', label: 'Manage Branches',  hint: 'create, register, switch' },
  { key: '/status',   label: 'Branch Status',    hint: 'ahead/behind, conflict risk' },
  { key: '/commits',  label: 'Commits & Push',   hint: 'auto-prefixed conventional commits' },
  { key: '/git',      label: 'Raw Git',           hint: 'passthrough git commands' },
];

export function HomeScreen() {
  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Box flexDirection="column" marginBottom={1}>
        <Text color={theme.text} bold>Welcome to Zephyr</Text>
        <Text color={theme.textMuted}>
          Your structured git workflow orchestrator. Navigate with{' '}
          <Text color={theme.accent}>Tab</Text> or type{' '}
          <Text color={theme.accent}>/command</Text> to get started.
        </Text>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>QUICK ACTIONS</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {QUICK_ACTIONS.map(({ key, label, hint }) => (
            <Box key={key} gap={2}>
              <Text color={theme.accent}>{key.padEnd(14)}</Text>
              <Text color={theme.text} bold>{label.padEnd(22)}</Text>
              <Text color={theme.textMuted}>{hint}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>BRANCH MODEL</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {[
            ['main',                             'public release viewpoint'],
            ['release/*',                        'clean release — no temp files'],
            ['production',                       'active merge target — PR required'],
            ['safe-production',                  'stable copy of production (CI managed)'],
            ['production/<type>/<scope>/<name>', 'your dev branch — deleted on merge'],
          ].map(([branch, desc]) => (
            <Box key={branch} gap={2}>
              <Text color={theme.accent}>{(branch ?? '').padEnd(38)}</Text>
              <Text color={theme.textMuted}>{desc}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.textMuted} dimColor>
          ⚠  Layer 1 — TUI Shell only. Git functions active in Layer 2.
        </Text>
      </Box>
    </Box>
  );
}