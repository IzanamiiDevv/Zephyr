import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../theme.js';
import { useAppStore } from '../store/appStore.js';

const EXAMPLE_CMDS = [
  'git log --oneline -10',
  'git diff HEAD~1',
  'git stash list',
  'git remote -v',
  'git fetch --all',
];

export function RawGitScreen() {
  const { gitService, setFooterMessage } = useAppStore();
  const [output,  setOutput]  = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [lastCmd, setLastCmd] = useState('');

  useInput(async (input) => {
    if (input.toLowerCase() === 'r' && lastCmd && !running) {
      await runCommand(lastCmd);
    }
    if (input.toLowerCase() === 'c') {
      setOutput([]);
      setLastCmd('');
    }
  });

  async function runCommand(cmd: string) {
    if (!gitService) return;
    setRunning(true);
    setLastCmd(cmd);
    try {
      const raw  = cmd.trim().startsWith('git ') ? cmd.trim().slice(4) : cmd.trim();
      const args = raw.split(/\s+/);
      const result = await (gitService as any).git.raw(args);
      setOutput(result.split('\n').filter((l: string) => l !== ''));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setOutput(msg.split('\n'));
    }
    setRunning(false);
    setFooterMessage(null);
  }

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text color={theme.text} bold>Raw Git Passthrough</Text>
      <Text color={theme.textMuted}>
        Execute any git command directly.
        Zephyr branch rules do <Text color={theme.warn}>not</Text> apply here — use with care.
      </Text>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>HOW TO USE</Text>
        <Box marginTop={1}>
          <Text color={theme.textMuted}>
            Press <Text color={theme.accent}>/</Text> to open the command bar,
            type your git command (with or without the{' '}
            <Text color={theme.accent}>git</Text> prefix), then press Enter.
          </Text>
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>EXAMPLE COMMANDS</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {EXAMPLE_CMDS.map(cmd => (
            <Box key={cmd} gap={2}>
              <Text color={theme.textMuted}>$</Text>
              <Text color={theme.accent}>{cmd}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Box justifyContent="space-between">
          <Text color={theme.textDim} bold>OUTPUT</Text>
          {lastCmd && (
            <Box gap={2}>
              <Text color={theme.textMuted} dimColor>$ {lastCmd}</Text>
              <Text color={theme.textMuted} dimColor>R rerun  C clear</Text>
            </Box>
          )}
        </Box>

        <Box flexDirection="column" marginTop={1} paddingX={1}>
          {running ? (
            <Text color={theme.accent}>Running…</Text>
          ) : output.length === 0 ? (
            <Text color={theme.textMuted} dimColor>
              ○  No output yet. Run a command via the / bar.
            </Text>
          ) : (
            output.slice(-20).map((line, i) => (
              <Text key={i} color={
                line.startsWith('error') || line.startsWith('fatal') ? theme.danger
                : line.startsWith('warning') ? theme.warn
                : theme.text
              }>
                {line}
              </Text>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}