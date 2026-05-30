import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme }       from '../theme.js';
import { useAppStore } from '../store/appStore.js';
import { writeConfig, type ZephyrConfigData } from '../../git/ZephyrConfig.js';

interface Props { onDone: () => void; }

export function InitScreen({ onDone }: Props) {
  const {
    gitService, repoName,
    userName, setZephyrConfig,
    setFooterMessage,
  } = useAppStore();

  const [step,    setStep]    = useState<'confirm' | 'done'>('confirm');
  const [loading, setLoading] = useState(false);

  const repoRoot = (gitService as any)?.repoRoot ?? process.cwd();

  useInput(async (input, key) => {
    if (loading) return;

    if (step === 'confirm') {
      if (input.toLowerCase() === 'y' || key.return) {
        setLoading(true);

        const config: ZephyrConfigData = {
          version:      '1.0.0',
          lock:         false,
          strict:       false,
          owners:       [],
          contributors: [],
        };

        writeConfig(repoRoot, config);
        setZephyrConfig(config);
        setLoading(false);
        setFooterMessage('✔ zephyr.json created');
        setTimeout(() => setFooterMessage(null), 3000);
        setStep('done');
        return;
      }

      if (input.toLowerCase() === 'n' || key.escape) {
        // Owner chose to skip — go to app without zephyr.json
        onDone();
        return;
      }
    }

    if (step === 'done') {
      onDone();
    }
  });

  return (
    <Box flexDirection="column" padding={2} gap={1}>

      {/* Header */}
      <Text color={theme.text} bold>Initialize Zephyr</Text>
      <Text color={theme.textMuted}>
        This repository does not have a <Text color={theme.accent}>zephyr.json</Text> yet.
      </Text>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Repo info */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>REPOSITORY</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'name'.padEnd(16)}</Text>
            <Text color={theme.accent} bold>{repoName}</Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'detected owner'.padEnd(16)}</Text>
            <Text color={theme.success} bold>{userName}</Text>
          </Box>
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* What gets created */}
      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>WHAT GETS CREATED</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          <Text color={theme.textMuted}>
            A <Text color={theme.accent}>zephyr.json</Text> file at the repo root with:
          </Text>
          <Box paddingLeft={2} flexDirection="column" gap={0} marginTop={1}>
            <Text color={theme.textDim}>{'{'}</Text>
            <Text color={theme.textDim}>{'  "version": "1.0.0",'}</Text>
            <Text color={theme.textDim}>{'  "lock": false,'}</Text>
            <Text color={theme.textDim}>{'  "strict": false,'}</Text>
            <Text color={theme.textDim}>{'  "owners": [],'}</Text>
            <Text color={theme.textDim}>{'  "contributors": []'}</Text>
            <Text color={theme.textDim}>{'}'}</Text>
          </Box>
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {step === 'confirm' && (
        <Box flexDirection="column" gap={1}>
          <Text color={theme.textMuted}>
            You are the project owner (first commit author).
            Only you can initialize Zephyr.
          </Text>
          <Box gap={3} marginTop={1}>
            {loading ? (
              <Text color={theme.accent}>Creating zephyr.json…</Text>
            ) : (
              <>
                <Text color={theme.bg} backgroundColor={theme.accent} bold>
                  {' Y — initialize '}
                </Text>
                <Text color={theme.textMuted}>N / Esc — skip for now</Text>
              </>
            )}
          </Box>
        </Box>
      )}

      {step === 'done' && (
        <Box flexDirection="column" gap={1}>
          <Text color={theme.success} bold>✔ zephyr.json created successfully.</Text>
          <Text color={theme.textMuted}>
            You can now configure contributors and settings in the{' '}
            <Text color={theme.accent}>/config</Text> screen.
          </Text>
          <Text color={theme.textMuted} dimColor>Press any key to continue.</Text>
        </Box>
      )}
    </Box>
  );
}