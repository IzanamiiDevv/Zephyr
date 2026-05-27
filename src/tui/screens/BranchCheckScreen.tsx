import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { execSync } from 'child_process';
import { theme } from '../theme.js';
import { useAppStore } from '../store/appStore.js';
import {
  createMissingBranches,
  buildMissingBranchIssueUrl,
  type CoreBranch,
} from '../../git/BranchChecker.js';

interface Props {
  missing:   CoreBranch[];
  isOwner:   boolean;
  repoSlug:  string | null;
  onDone:    () => void;
}

export function BranchCheckScreen({ missing, isOwner, repoSlug, onDone }: Props) {
  const { gitService, setFooterMessage } = useAppStore();
  const [loading,      setLoading]      = useState(false);
  const [results,      setResults]      = useState<{ branch: string; ok: boolean; error?: string }[]>([]);
  const [done,         setDone]         = useState(false);
  const [issueOpened,  setIssueOpened]  = useState(false);

  useInput(async (input, key) => {
    if (loading) return;

    if (done || issueOpened) {
      if (key.return || key.escape || input) { onDone(); return; }
    }

    if (isOwner) {
      if (key.return || input.toLowerCase() === 'y') {
        if (!gitService) return;
        setLoading(true);
        const res = await createMissingBranches(gitService, missing);
        setResults(res);
        setLoading(false);
        setDone(true);
        const allOk = res.every(r => r.ok);
        setFooterMessage(allOk ? '✔ Core branches created' : '⚠ Some branches failed');
        setTimeout(() => setFooterMessage(null), 4000);
        return;
      }
      if (input.toLowerCase() === 'n' || key.escape) { onDone(); return; }
    } else {
      if (key.return || input.toLowerCase() === 'y') {
        if (!repoSlug) { onDone(); return; }
        const url = buildMissingBranchIssueUrl(repoSlug, missing);
        try {
          const cmd = process.platform === 'win32'
            ? `start "" "${url}"`
            : process.platform === 'darwin'
            ? `open "${url}"`
            : `xdg-open "${url}"`;
          execSync(cmd, { stdio: 'ignore' });
          setIssueOpened(true);
        } catch { onDone(); }
        return;
      }
      if (input.toLowerCase() === 'n' || key.escape) { onDone(); return; }
    }
  });

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text color={theme.warn} bold>⚠ MISSING CORE BRANCHES</Text>
      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>BRANCHES NOT FOUND</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {missing.map(b => (
            <Box key={b} gap={2}>
              <Text color={theme.danger}>✖</Text>
              <Text color={theme.text} bold>{b}</Text>
              <Text color={theme.textMuted}>
                {b === 'main'           ? 'public release viewpoint'
                : b === 'production'    ? 'active merge target'
                : 'CI-managed stable copy'}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {!done && !issueOpened && (
        isOwner ? (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} bold>You appear to be the repository owner.</Text>
            <Text color={theme.textMuted}>
              Zephyr can create the missing branches from the current HEAD.
            </Text>
            <Box gap={3} marginTop={1}>
              {loading ? (
                <Text color={theme.accent}>Creating branches…</Text>
              ) : (
                <>
                  <Text color={theme.bg} backgroundColor={theme.accent} bold>{' Y — create branches '}</Text>
                  <Text color={theme.textMuted}>N / Esc — skip</Text>
                </>
              )}
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} bold>You are not the repository owner.</Text>
            <Text color={theme.textMuted}>
              Zephyr can open a GitHub issue to notify the owner.
            </Text>
            <Box gap={3} marginTop={1}>
              <Text color={theme.bg} backgroundColor={theme.accent} bold>{' Y — open GitHub issue '}</Text>
              <Text color={theme.textMuted}>N / Esc — skip</Text>
            </Box>
          </Box>
        )
      )}

      {done && results.length > 0 && (
        <Box flexDirection="column" gap={0}>
          {results.map(r => (
            <Box key={r.branch} gap={2}>
              <Text color={r.ok ? theme.success : theme.danger}>{r.ok ? '✔' : '✖'}</Text>
              <Text color={theme.text}>{r.branch}</Text>
              {r.error && <Text color={theme.danger}>{r.error}</Text>}
            </Box>
          ))}
          <Text color={theme.textMuted} dimColor>Press any key to continue.</Text>
        </Box>
      )}

      {issueOpened && (
        <Box flexDirection="column" gap={1}>
          <Text color={theme.success}>✔ GitHub issue opened in browser.</Text>
          <Text color={theme.textMuted}>
            The repo owner will be notified. Press any key to continue.
          </Text>
        </Box>
      )}

      {!done && !issueOpened && (
        <Text color={theme.textMuted} dimColor>
          Note: Zephyr will still load but branch workflows require core branches.
        </Text>
      )}
    </Box>
  );
}