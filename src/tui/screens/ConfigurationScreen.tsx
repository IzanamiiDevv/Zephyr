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
  addOwner,
  removeOwner,
  type ZephyrConfigData,
} from '../../git/ZephyrConfig.js';

type View =
  | 'main'
  | 'add-owner'
  | 'remove-owner'
  | 'add-contributor'
  | 'delete-contributor'
  | 'confirm-lock'
  | 'confirm-init';

export function ConfigurationScreen() {
  const {
    gitService, repoName,
    setFooterMessage, zephyrConfig,
    setZephyrConfig, userName, isOwner,
  } = useAppStore();

  const [view,           setView]           = useState<View>('main');
  const [selected,       setSelected]       = useState(0);
  const [removeSelected, setRemoveSelected] = useState(0);

  const repoRoot = (gitService as any)?.repoRoot ?? process.cwd();
  const config   = zephyrConfig;

  function saveConfig(updated: ZephyrConfigData) {
    writeConfig(repoRoot, updated);
    setZephyrConfig(updated);
    setFooterMessage('✔ zephyr.json saved');
    setTimeout(() => setFooterMessage(null), 3000);
  }

  // ── Non-owner ────────────────────────────────────────────────────────
  if (!isOwner) {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.danger} bold>✖ Access Denied</Text>
        <Text color={theme.textMuted}>
          The Configuration screen is only accessible to repository owners.
        </Text>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Box gap={2}>
          <Text color={theme.textMuted}>{'your username'.padEnd(20)}</Text>
          <Text color={theme.textDim}>{userName || '(unknown)'}</Text>
        </Box>
        <Box gap={2}>
          <Text color={theme.textMuted}>{'owners'.padEnd(20)}</Text>
          {config.owners.length === 0
            ? <Text color={theme.textMuted} dimColor>(none defined)</Text>
            : <Text color={theme.accent}>{config.owners.join(', ')}</Text>
          }
        </Box>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Text color={theme.textMuted} dimColor>
          {config.owners.length === 0
            ? 'No owners defined. Contact whoever set up this repository.'
            : 'Contact one of the listed owners to get access.'
          }
        </Text>
      </Box>
    );
  }

  const MENU_ITEMS = [
    { key: 'lock',         label: config.lock   ? 'Unlock Repository'          : 'Lock Repository',          danger: !config.lock   },
    { key: 'strict',       label: config.strict ? 'Disable Strict Mode (CI/CD)': 'Enable Strict Mode (CI/CD)',danger: false          },
    { key: 'add-owner',    label: 'Add Owner',                                                                 danger: false          },
    { key: 'remove-owner', label: 'Remove Owner',                                                              danger: true           },
    { key: 'add',          label: 'Add Contributor',                                                           danger: false          },
    { key: 'delete',       label: 'Remove Contributor',                                                        danger: true           },
    { key: 'init',         label: 'Re-initialize zephyr.json',                                                 danger: true           },
  ];

  useInput((input, key) => {
    if (view !== 'main') return;
    if (key.upArrow)   { setSelected(i => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setSelected(i => Math.min(MENU_ITEMS.length - 1, i + 1)); return; }
    if (key.return) {
      const item = MENU_ITEMS[selected];
      if (!item) return;
      if (item.key === 'lock')         { setView('confirm-lock');                                  return; }
      if (item.key === 'strict')       { saveConfig({ ...config, strict: !config.strict });        return; }
      if (item.key === 'add-owner')    { setView('add-owner');                                     return; }
      if (item.key === 'remove-owner') { setView('remove-owner');                                  return; }
      if (item.key === 'add')          { setView('add-contributor');                               return; }
      if (item.key === 'delete')       { setView('delete-contributor');                            return; }
      if (item.key === 'init')         { setView('confirm-init');                                  return; }
    }
  });

  // ── Add owner ─────────────────────────────────────────────────────────
  if (view === 'add-owner') {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.text} bold>Add Owner</Text>
        <Text color={theme.textMuted} dimColor>
          Enter a GitHub username exactly as set in{' '}
          <Text color={theme.accent}>git config user.name</Text>.
          Case-insensitive.
        </Text>
        <TextInput
          label="GitHub username"
          hint="e.g. rafaeloli"
          value=""
          onChange={() => {}}
          onSubmit={(v) => { saveConfig(addOwner(config, v.trim())); setView('main'); }}
          onCancel={() => setView('main')}
          placeholder="e.g. rafaeloli"
        />
      </Box>
    );
  }

  // ── Remove owner ──────────────────────────────────────────────────────
  if (view === 'remove-owner') {
    const owners = config.owners;
    if (owners.length === 0) {
      return (
        <Box flexDirection="column" padding={2} gap={1}>
          <Text color={theme.textMuted}>No owners to remove.</Text>
          <Text color={theme.textMuted} dimColor>Press Esc to go back.</Text>
          <EscInput onEsc={() => setView('main')} />
        </Box>
      );
    }
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.text} bold>Remove Owner</Text>
        <Text color={theme.warn} dimColor>
          ⚠ Removing yourself will lock you out of Config.
        </Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {owners.map((o, i) => {
            const isSel = i === removeSelected;
            return (
              <Box key={o}>
                {isSel
                  ? <Text color={theme.bg} backgroundColor={theme.danger} bold>
                      {` ▶ ${o.padEnd(30)} `}
                    </Text>
                  : <Text color={theme.textMuted}>{'   '}{o}</Text>
                }
              </Box>
            );
          })}
        </Box>
        <Text color={theme.textMuted} dimColor>↑↓ navigate  Enter remove  Esc cancel</Text>
        <RemoveOwnerInput
          owners={owners}
          selected={removeSelected}
          setSelected={setRemoveSelected}
          onRemove={(u) => { saveConfig(removeOwner(config, u)); setView('main'); }}
          onCancel={() => setView('main')}
        />
      </Box>
    );
  }

  // ── Add contributor ───────────────────────────────────────────────────
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

  // ── Delete contributor ────────────────────────────────────────────────
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

  // ── Confirm lock ──────────────────────────────────────────────────────
  if (view === 'confirm-lock') {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.warn} bold>
          {config.lock ? '⚠ Unlock Repository?' : '⚠ Lock Repository?'}
        </Text>
        <Text color={theme.textMuted}>
          {config.lock
            ? 'Unlocking will allow all users to access Zephyr again.'
            : 'Locking will block ALL non-owners from using Zephyr.'}
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

  // ── Confirm re-init ───────────────────────────────────────────────────
  if (view === 'confirm-init') {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.danger} bold>⚠ Re-initialize zephyr.json?</Text>
        <Text color={theme.textMuted}>
          Resets all settings. Owners array is preserved so you keep access.
        </Text>
        <Box gap={3} marginTop={1}>
          <Text color={theme.bg} backgroundColor={theme.danger} bold>{' Y — reset '}</Text>
          <Text color={theme.textMuted}>N / Esc — cancel</Text>
        </Box>
        <YNInput
          onYes={() => {
            saveConfig({
              version:      '1.0.0',
              lock:         false,
              strict:       false,
              owners:       config.owners,
              contributors: [],
            });
            setView('main');
          }}
          onNo={() => setView('main')}
        />
      </Box>
    );
  }

  // ── Main menu ─────────────────────────────────────────────────────────
  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Box justifyContent="space-between">
        <Text color={theme.text} bold>Configuration</Text>
        <Text color={theme.accent} dimColor>Owner: {userName}</Text>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Current state */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>CURRENT STATE</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'repo'.padEnd(16)}</Text>
            <Text color={theme.accent} bold>{repoName}</Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'lock'.padEnd(16)}</Text>
            <Text color={config.lock ? theme.danger : theme.success} bold>
              {config.lock ? 'LOCKED' : 'unlocked'}
            </Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'strict mode'.padEnd(16)}</Text>
            <Text color={config.strict ? theme.accent : theme.textMuted} bold>
              {config.strict ? 'ON — CI/CD enforcing' : 'off'}
            </Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'owners'.padEnd(16)}</Text>
            <Text color={theme.text}>
              {config.owners.length === 0
                ? '(none — everyone is owner)'
                : config.owners.join(', ')
              }
            </Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'contributors'.padEnd(16)}</Text>
            <Text color={theme.text}>{config.contributors.length}</Text>
          </Box>
        </Box>
      </Box>

      {/* Contributors list */}
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

      {/* CI/CD notice */}
      <Box borderStyle="single" borderColor={config.strict ? theme.accent : theme.panel} paddingX={1}>
        <Text color={theme.textMuted} dimColor>
          🛡 Zephyr Guardian CI/CD is{' '}
          {config.strict
            ? <Text color={theme.accent} bold>ACTIVE</Text>
            : <Text color={theme.textMuted}>inactive</Text>
          }
          {'. '}
          {config.strict
            ? 'Unauthorized zephyr.json edits and bad branch names are auto-rejected on PRs.'
            : 'Enable strict mode to activate remote policy enforcement.'
          }
        </Text>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Actions */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>ACTIONS</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {MENU_ITEMS.map((item, i) => {
            const isSel = i === selected;
            const color = item.danger ? theme.danger : theme.accent;
            return (
              <Box key={item.key}>
                {isSel
                  ? <Text color={theme.bg} backgroundColor={color} bold>
                      {` ▶ ${item.label.padEnd(38)} `}
                    </Text>
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function YNInput({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  useInput((input, key) => {
    if (input.toLowerCase() === 'y') { onYes(); return; }
    if (input.toLowerCase() === 'n' || key.escape) { onNo(); return; }
  });
  return null;
}

function EscInput({ onEsc }: { onEsc: () => void }) {
  useInput((_, key) => { if (key.escape) onEsc(); });
  return null;
}

function RemoveOwnerInput({ owners, selected, setSelected, onRemove, onCancel }: {
  owners:      string[];
  selected:    number;
  setSelected: (fn: (i: number) => number) => void;
  onRemove:    (username: string) => void;
  onCancel:    () => void;
}) {
  useInput((_, key) => {
    if (key.escape)    { onCancel(); return; }
    if (key.upArrow)   { setSelected(i => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setSelected(i => Math.min(owners.length - 1, i + 1)); return; }
    if (key.return) {
      const target = owners[selected];
      if (target) onRemove(target);
    }
  });
  return null;
}