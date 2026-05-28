import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme }              from '../theme.js';
import { useAppStore }        from '../store/appStore.js';
import { TextInput }          from '../components/wizards/TextInput.js';
import {
  CreateContributorWizard,
  DeleteContributorWizard,
} from '../components/wizards/ContributorWizard.js';
import {
  writeConfig,
  isOwner,
  type ZephyrConfigData,
} from '../../git/ZephyrConfig.js';

type View =
  | 'main'
  | 'set-owner'
  | 'add-contributor'
  | 'delete-contributor'
  | 'confirm-lock'
  | 'confirm-init';

export function ConfigurationScreen() {
  const {
    gitService, repoName,
    setFooterMessage, zephyrConfig,
    setZephyrConfig, userEmail,
  } = useAppStore();

  const [view,     setView]     = useState<View>('main');
  const [selected, setSelected] = useState(0);

  const repoRoot   = (gitService as any)?.repoRoot ?? process.cwd();
  const config     = zephyrConfig;
  const ownerAccess = isOwner(config, userEmail);

  function saveConfig(updated: ZephyrConfigData) {
    writeConfig(repoRoot, updated);
    setZephyrConfig(updated);
    setFooterMessage('✔ zephyr.json saved');
    setTimeout(() => setFooterMessage(null), 3000);
  }

  if (!ownerAccess) {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.danger} bold>✖ Access Denied</Text>
        <Text color={theme.textMuted}>
          The Configuration screen is only accessible to the repository owner.
        </Text>
        <Box gap={2} marginTop={1}>
          <Text color={theme.textMuted}>{'configured owner'.padEnd(20)}</Text>
          <Text color={theme.accent}>{config.ownerEmail || '(not set)'}</Text>
        </Box>
        <Box gap={2}>
          <Text color={theme.textMuted}>{'your email'.padEnd(20)}</Text>
          <Text color={theme.textDim}>{userEmail || '(unknown)'}</Text>
        </Box>
      </Box>
    );
  }

  const MENU_ITEMS = [
    { key: 'lock',   label: config.lock ? 'Unlock Repository'   : 'Lock Repository',  danger: !config.lock },
    { key: 'owner',  label: 'Set Owner Email',                                         danger: false },
    { key: 'add',    label: 'Add Contributor',                                         danger: false },
    { key: 'delete', label: 'Remove Contributor',                                      danger: true  },
    { key: 'init',   label: 'Re-initialize zephyr.json',                               danger: true  },
  ];

  useInput((input, key) => {
    if (view !== 'main') return;
    if (key.upArrow)   { setSelected(i => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setSelected(i => Math.min(MENU_ITEMS.length - 1, i + 1)); return; }
    if (key.return) {
      const item = MENU_ITEMS[selected];
      if (!item) return;
      if (item.key === 'lock')   { setView('confirm-lock');       return; }
      if (item.key === 'owner')  { setView('set-owner');          return; }
      if (item.key === 'add')    { setView('add-contributor');    return; }
      if (item.key === 'delete') { setView('delete-contributor'); return; }
      if (item.key === 'init')   { setView('confirm-init');       return; }
    }
  });

  if (view === 'set-owner') {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.text} bold>Set Owner Email</Text>
        <Text color={theme.textMuted} dimColor>
          Current: <Text color={theme.accent}>{config.ownerEmail || '(not set)'}</Text>
        </Text>
        <TextInput
          label="Owner email"
          hint="must match git config user.email"
          value={config.ownerEmail}
          onChange={(v) => saveConfig({ ...config, ownerEmail: v })}
          onSubmit={(v) => { saveConfig({ ...config, ownerEmail: v }); setView('main'); }}
          onCancel={() => setView('main')}
          placeholder="e.g. owner@example.com"
        />
      </Box>
    );
  }

  if (view === 'add-contributor') {
    return (
      <Box flexDirection="column" padding={2}>
        <CreateContributorWizard
          config={config}
          onSave={(updated) => { saveConfig(updated); setView('main'); }}
          onClose={() => setView('main')}
        />
      </Box>
    );
  }

  if (view === 'delete-contributor') {
    return (
      <Box flexDirection="column" padding={2}>
        <DeleteContributorWizard
          config={config}
          onSave={(updated) => { saveConfig(updated); setView('main'); }}
          onClose={() => setView('main')}
        />
      </Box>
    );
  }

  if (view === 'confirm-lock') {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.warn} bold>
          {config.lock ? '⚠ Unlock Repository?' : '⚠ Lock Repository?'}
        </Text>
        <Text color={theme.textMuted}>
          {config.lock
            ? 'Unlocking will allow all contributors to use Zephyr again.'
            : 'Locking will block ALL users (except you) from using Zephyr.'}
        </Text>
        <Box gap={3} marginTop={1}>
          <Text color={theme.bg} backgroundColor={config.lock ? theme.accent : theme.danger} bold>
            {config.lock ? ' Y — unlock ' : ' Y — lock '}
          </Text>
          <Text color={theme.textMuted}>N / Esc — cancel</Text>
        </Box>
        <YNInput
          onYes={() => { saveConfig({ ...config, lock: !config.lock }); setView('main'); }}
          onNo={() => setView('main')}
        />
      </Box>
    );
  }

  if (view === 'confirm-init') {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.danger} bold>⚠ Re-initialize zephyr.json?</Text>
        <Text color={theme.textMuted}>
          This will reset all settings including contributors and lock status.
        </Text>
        <Box gap={3} marginTop={1}>
          <Text color={theme.bg} backgroundColor={theme.danger} bold>{' Y — reset '}</Text>
          <Text color={theme.textMuted}>N / Esc — cancel</Text>
        </Box>
        <YNInput
          onYes={() => {
            saveConfig({ lock: false, ownerEmail: config.ownerEmail, contributors: [], version: '1.0.0' });
            setView('main');
          }}
          onNo={() => setView('main')}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Box justifyContent="space-between">
        <Text color={theme.text} bold>Configuration</Text>
        <Text color={theme.accent} dimColor>Owner access</Text>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>CURRENT STATE</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'repo'.padEnd(18)}</Text>
            <Text color={theme.accent} bold>{repoName}</Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'owner email'.padEnd(18)}</Text>
            <Text color={theme.text}>{config.ownerEmail || '(not set)'}</Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'lock status'.padEnd(18)}</Text>
            <Text color={config.lock ? theme.danger : theme.success} bold>
              {config.lock ? 'LOCKED' : 'unlocked'}
            </Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'contributors'.padEnd(18)}</Text>
            <Text color={theme.text}>{config.contributors.length}</Text>
          </Box>
        </Box>
      </Box>

      {config.contributors.length > 0 && (
        <>
          <Text color={theme.panel}>{'─'.repeat(60)}</Text>
          <Box flexDirection="column" gap={0}>
            <Text color={theme.textDim} bold>CONTRIBUTORS</Text>
            <Box flexDirection="column" marginTop={1} gap={0}>
              {config.contributors.map(c => (
                <Box key={c.email} gap={2}>
                  <Text color={theme.accent}>●</Text>
                  <Text color={theme.text} bold>{c.name.padEnd(20)}</Text>
                  <Text color={theme.textMuted}>{c.email}</Text>
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>ACTIONS</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {MENU_ITEMS.map((item, i) => {
            const isSel  = i === selected;
            const color  = item.danger ? theme.danger : theme.accent;
            return (
              <Box key={item.key}>
                {isSel
                  ? <Text color={theme.bg} backgroundColor={color} bold>{` ▶ ${item.label.padEnd(34)} `}</Text>
                  : <Text color={theme.textMuted}>{'   '}{item.label}</Text>
                }
              </Box>
            );
          })}
        </Box>
      </Box>

      <Text color={theme.textMuted} dimColor>↑↓ navigate  Enter select</Text>
    </Box>
  );
}

function YNInput({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  useInput((input, key) => {
    if (input.toLowerCase() === 'y') { onYes(); return; }
    if (input.toLowerCase() === 'n' || key.escape) { onNo(); return; }
  });
  return null;
}