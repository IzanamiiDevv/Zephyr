import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../../theme.js';

interface Props {
  label:        string;
  value:        string;
  onChange:     (v: string) => void;
  onSubmit:     (v: string) => void;
  onCancel?:    () => void;
  placeholder?: string;
  hint?:        string;
}

export function TextInput({ label, value, onChange, onSubmit, onCancel, placeholder, hint }: Props) {
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setCursor(v => !v), 530);
    return () => clearInterval(t);
  }, []);

  useInput((input, key) => {
    if (key.escape)  { onCancel?.(); return; }
    if (key.return)  { if (value.trim()) onSubmit(value.trim()); return; }
    if (key.backspace || key.delete) { onChange(value.slice(0, -1)); return; }
    if (input && !key.ctrl && !key.meta) { onChange(value + input); }
  });

  return (
    <Box flexDirection="column" gap={0}>
      <Box gap={2}>
        <Text color={theme.textMuted}>{label}</Text>
        {hint && <Text color={theme.textMuted} dimColor>{hint}</Text>}
      </Box>

      <Box borderStyle="single" borderColor={theme.accent} paddingX={1} marginTop={1}>
        <Text color={theme.accent} bold>{'> '}</Text>
        {value ? (
          <Text color={theme.text}>{value}</Text>
        ) : (
          <Text color={theme.textMuted} dimColor>{placeholder}</Text>
        )}
        <Text color={cursor ? theme.cursor : theme.bg}>█</Text>
      </Box>

      <Text color={theme.textMuted} dimColor>
        {'  '}Enter to confirm  Esc to cancel
      </Text>
    </Box>
  );
}