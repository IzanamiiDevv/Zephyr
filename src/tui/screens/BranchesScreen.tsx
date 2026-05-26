import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';

const BRANCH_ACTIONS = [
  { key: 'N', label: 'New branch',      desc: 'Create production/<type>/<scope>/<name> from safe-production' },
  { key: 'R', label: 'Register branch', desc: 'Push local branch to remote, make accessible to team' },
  { key: 'P', label: 'Pull request',    desc: 'Open PR into production branch' },
  { key: 'S', label: 'Sub-branch',      desc: 'Fork from an existing production/* branch' },
  { key: 'D', label: 'Delete branch',   desc: 'Remove local + remote branch after merge' },
];

export function BranchesScreen() {
  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text color={theme.text} bold>Branch Management</Text>
      <Text color={theme.textMuted}>
        All new branches must originate from{' '}
        <Text color={theme.success}>safe-production</Text>
        {' '}unless explicitly approved.
      </Text>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>AVAILABLE ACTIONS</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {BRANCH_ACTIONS.map(({ key, label, desc }) => (
            <Box key={key} gap={2}>
              <Text color={theme.bg} backgroundColor={theme.panel}>{` ${key} `}</Text>
              <Text color={theme.text} bold>{label.padEnd(20)}</Text>
              <Text color={theme.textMuted}>{desc}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>LOCAL BRANCHES</Text>
        <Box marginTop={1}>
          <Text color={theme.textMuted} dimColor>
            ○  Branch list loads in Layer 2 (git integration).
          </Text>
        </Box>
      </Box>
    </Box>
  );
}