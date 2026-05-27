import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme }           from '../theme.js';
import { useAppStore }     from '../store/appStore.js';
import { parseBranch }     from '../../git/BranchParser.js';
import { NewBranchWizard } from '../components/wizards/NewBranchWizard.js';
import { RegisterWizard }  from '../components/wizards/RegisterWizard.js';
import { DeleteWizard }    from '../components/wizards/DeleteWizard.js';

type ActiveWizard = 'none' | 'new' | 'sub' | 'register' | 'delete';

export function BranchesScreen() {
  const { localBranches, currentBranch, refreshBranches } = useAppStore();
  const [wizard, setWizard] = useState<ActiveWizard>('none');

  useEffect(() => { void refreshBranches(); }, []);

  useInput((input) => {
    if (wizard !== 'none') return;
    if (input.toLowerCase() === 'n') { setWizard('new');      return; }
    if (input.toLowerCase() === 'r') { setWizard('register'); return; }
    if (input.toLowerCase() === 'd') { setWizard('delete');   return; }
    if (input.toLowerCase() === 's') { setWizard('sub');      return; }
  });

  const closeWizard = async () => {
    setWizard('none');
    await refreshBranches();
  };

  if (wizard === 'new') {
    return <Box flexDirection="column" padding={2}><NewBranchWizard onClose={closeWizard} /></Box>;
  }
  if (wizard === 'sub') {
    return <Box flexDirection="column" padding={2}><NewBranchWizard onClose={closeWizard} copyOf={currentBranch} /></Box>;
  }
  if (wizard === 'register') {
    return <Box flexDirection="column" padding={2}><RegisterWizard onClose={closeWizard} /></Box>;
  }
  if (wizard === 'delete') {
    return <Box flexDirection="column" padding={2}><DeleteWizard onClose={closeWizard} /></Box>;
  }

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text color={theme.text} bold>Branch Management</Text>
      <Text color={theme.textMuted}>
        All new branches originate from{' '}
        <Text color={theme.success}>safe-production</Text>
        {' '}unless explicitly approved.
      </Text>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>ACTIONS</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {[
            ['N', 'New branch',      'Create production/<type>/<scope>/<name> from safe-production'],
            ['S', 'Sub-branch',      `Fork from current branch (${currentBranch})`],
            ['R', 'Register branch', 'Push local branch to remote + open PR'],
            ['D', 'Delete branch',   'Remove local + remote after merge'],
          ].map(([key, label, desc]) => (
            <Box key={key} gap={2}>
              <Text color={theme.bg} backgroundColor={theme.panel}>{` ${key} `}</Text>
              <Text color={theme.text} bold>{(label ?? '').padEnd(20)}</Text>
              <Text color={theme.textMuted}>{desc}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>
          LOCAL BRANCHES <Text color={theme.textMuted} dimColor>({localBranches.length})</Text>
        </Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {localBranches.length === 0 ? (
            <Text color={theme.textMuted} dimColor>Loading branches…</Text>
          ) : (
            localBranches.map((b) => {
              const parsed    = parseBranch(b.name);
              const isCurrent = b.name === currentBranch;
              const typeColor =
                parsed.kind === 'core'      ? theme.success
                : parsed.kind === 'dev'     ? theme.accent
                : parsed.kind === 'release' ? theme.warn
                : theme.textMuted;
              const typeLabel =
                parsed.kind === 'dev'       ? `${parsed.type}(${parsed.scope})`
                : parsed.kind === 'release' ? `release/${parsed.version}`
                : parsed.kind === 'core'    ? parsed.name
                : '—';

              return (
                <Box key={b.name} gap={2}>
                  <Text color={isCurrent ? theme.accent : theme.textMuted}>
                    {isCurrent ? '▶' : ' '}
                  </Text>
                  <Text color={isCurrent ? theme.text : theme.textMuted} bold={isCurrent}>
                    {b.name.padEnd(48)}
                  </Text>
                  <Text color={typeColor}>{typeLabel}</Text>
                  {parsed.kind === 'dev' && parsed.isCopy && (
                    <Text color={theme.warn}> [copy]</Text>
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Box>
  );
}