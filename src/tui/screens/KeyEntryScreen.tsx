import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../theme.js';
import { verifyKey, type ZephyrConfigData } from '../../git/ZephyrConfig.js';

interface Props {
  config:    ZephyrConfigData;
  userEmail: string;
  onSuccess: () => void;
  onExit:    () => void;
}

const MAX_ATTEMPTS = 5;

export function KeyEntryScreen({ config, userEmail, onSuccess, onExit }: Props) {
  const [key,       setKey]       = useState('');
  const [masked,    setMasked]    = useState('');
  const [error,     setError]     = useState<string | null>(null);
  const [attempts,  setAttempts]  = useState(0);
  const [cursorVis, setCursorVis] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setCursorVis(v => !v), 530);
    return () => clearInterval(t);
  }, []);

  const contributor = config.contributors.find(c => c.email === userEmail);
  const displayName = contributor?.name ?? userEmail;

  useInput((input, k) => {
    if (k.escape || (k.ctrl && input === 'c')) { onExit(); return; }

    if (k.return) {
      const c = config.contributors.find(c => c.email === userEmail);
      if (!c) { setError('Your email is not registered as a contributor.'); return; }

      if (verifyKey(key, c.publicKey)) { onSuccess(); return; }

      const next = attempts + 1;
      setAttempts(next);
      setKey('');
      setMasked('');

      if (next >= MAX_ATTEMPTS) {
        setError(`Too many failed attempts (${MAX_ATTEMPTS}/${MAX_ATTEMPTS}). Exiting.`);
        setTimeout(onExit, 2000);
        return;
      }
      setError(`Incompatible key. ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next === 1 ? '' : 's'} remaining.`);
      return;
    }

    if (k.backspace || k.delete) {
      setKey(v => v.slice(0, -1));
      setMasked(v => v.slice(0, -1));
      return;
    }

    if (input && !k.ctrl && !k.meta) {
      setKey(v => v + input);
      setMasked(v => v + '●');
      setError(null);
    }
  });

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text color={theme.text} bold>Contributor Authentication</Text>
      <Text color={theme.textMuted}>This repository requires a key to access Zephyr.</Text>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Box gap={2}>
          <Text color={theme.textMuted}>{'identity'.padEnd(12)}</Text>
          <Text color={theme.accent} bold>{displayName}</Text>
        </Box>
        <Box gap={2}>
          <Text color={theme.textMuted}>{'email'.padEnd(12)}</Text>
          <Text color={theme.textDim}>{userEmail}</Text>
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={1}>
        <Text color={theme.textDim} bold>ENTER YOUR PRIVATE KEY</Text>
        <Text color={theme.textMuted} dimColor>
          Enter the private key given to you by the repository owner.
        </Text>

        <Box borderStyle="single" borderColor={error ? theme.danger : theme.accent} paddingX={1} marginTop={1}>
          <Text color={theme.accent} bold>{'> '}</Text>
          <Text color={theme.text}>{masked}</Text>
          <Text color={cursorVis ? theme.cursor : theme.bg}>{'█'}</Text>
        </Box>

        {error && (
          <Box borderStyle="single" borderColor={theme.danger} paddingX={1}>
            <Text color={theme.danger}>✖  {error}</Text>
          </Box>
        )}

        {attempts > 0 && (
          <Box gap={1}>
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
              <Text key={i} color={i < attempts ? theme.danger : theme.textMuted}>
                {i < attempts ? '✖' : '○'}
              </Text>
            ))}
          </Box>
        )}
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>
      <Text color={theme.textMuted} dimColor>Enter to verify  Esc to exit</Text>
    </Box>
  );
}