import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../theme.js';
import { useAppStore, type StagingFile } from '../store/appStore.js';

function statusLabel(f: StagingFile): { label: string; color: string } {
  if (f.index === '?' && f.workingDir === '?') return { label: 'untracked',  color: theme.textMuted };
  if (f.staged && f.workingDir !== ' ' && f.workingDir !== '') return { label: 'modified (partial)', color: theme.warn };
  if (f.staged)              return { label: 'staged',   color: theme.success };
  if (f.workingDir === 'M')  return { label: 'modified', color: theme.warn };
  if (f.workingDir === 'D')  return { label: 'deleted',  color: theme.danger };
  if (f.workingDir === 'A')  return { label: 'added',    color: theme.accent };
  return { label: 'changed', color: theme.textDim };
}

export function StagingScreen() {
  const { stagingFiles, stagingLoading, refreshStaging, gitService, setFooterMessage } = useAppStore();
  const [selected, setSelected] = useState(0);
  const [busy,     setBusy]     = useState(false);

  useEffect(() => { void refreshStaging(); }, []);

  const clamped = Math.min(selected, Math.max(0, stagingFiles.length - 1));
  if (clamped !== selected) setSelected(clamped);

  useInput(async (input, key) => {
    if (busy || stagingLoading) return;
    if (key.upArrow)   { setSelected(i => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setSelected(i => Math.min(stagingFiles.length - 1, i + 1)); return; }

    const file = stagingFiles[selected];
    if (!file || !gitService) return;

    if (input === ' ') {
      setBusy(true);
      try {
        const git = (gitService as any).git;
        if (file.staged) {
          await git.raw(['restore', '--staged', file.path]);
          setFooterMessage(`Unstaged: ${file.path}`);
        } else {
          await git.add(file.path);
          setFooterMessage(`Staged: ${file.path}`);
        }
        setTimeout(() => setFooterMessage(null), 2000);
        await refreshStaging();
      } catch (err) {
        setFooterMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setTimeout(() => setFooterMessage(null), 3000);
      }
      setBusy(false);
      return;
    }

    if (input.toLowerCase() === 'a') {
      setBusy(true);
      try {
        await (gitService as any).git.add('.');
        setFooterMessage('✔ All files staged');
        setTimeout(() => setFooterMessage(null), 2000);
        await refreshStaging();
      } catch (err) {
        setFooterMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setTimeout(() => setFooterMessage(null), 3000);
      }
      setBusy(false);
      return;
    }

    if (input.toLowerCase() === 'u') {
      setBusy(true);
      try {
        await (gitService as any).git.raw(['restore', '--staged', '.']);
        setFooterMessage('✔ All files unstaged');
        setTimeout(() => setFooterMessage(null), 2000);
        await refreshStaging();
      } catch (err) {
        setFooterMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setTimeout(() => setFooterMessage(null), 3000);
      }
      setBusy(false);
      return;
    }

    if (input.toLowerCase() === 'r') { await refreshStaging(); return; }
  });

  const stagedCount   = stagingFiles.filter(f => f.staged).length;
  const unstagedCount = stagingFiles.length - stagedCount;

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Box justifyContent="space-between">
        <Text color={theme.text} bold>Staging</Text>
        <Box gap={3}>
          <Text color={theme.success}>{stagedCount} staged</Text>
          <Text color={theme.warn}>{unstagedCount} unstaged</Text>
          {stagingLoading && <Text color={theme.textMuted} dimColor>loading…</Text>}
          {busy           && <Text color={theme.accent}>working…</Text>}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box gap={3}>
        {[['Space','toggle'],['A','stage all'],['U','unstage all'],['R','refresh']].map(([k,l]) => (
          <Box key={k} gap={1}>
            <Text color={theme.bg} backgroundColor={theme.panel}>{` ${k} `}</Text>
            <Text color={theme.textMuted}>{l}</Text>
          </Box>
        ))}
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {stagingFiles.length === 0 && !stagingLoading ? (
        <Text color={theme.success}>✔ Working tree is clean — nothing to stage.</Text>
      ) : (
        <Box flexDirection="column" gap={0}>
          {stagingFiles.map((f, i) => {
            const isSelected = i === clamped;
            const { label, color } = statusLabel(f);
            return (
              <Box key={f.path} gap={2}>
                <Text color={isSelected ? theme.accent : theme.bg}>▶</Text>
                <Text color={f.staged ? theme.success : theme.textMuted}>
                  {f.staged ? '●' : '○'}
                </Text>
                {isSelected ? (
                  <Text color={theme.bg} backgroundColor={theme.accent}>
                    {` ${f.path.padEnd(46)} `}
                  </Text>
                ) : (
                  <Text color={f.staged ? theme.text : theme.textMuted}>
                    {f.path.padEnd(48)}
                  </Text>
                )}
                <Text color={color}>{label}</Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}