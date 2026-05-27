import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../../theme.js';

interface Option {
  label: string;
  value: string;
  hint?: string;
}

interface Props {
  options:      Option[];
  onSelect:     (value: string) => void;
  onCancel?:    () => void;
  placeholder?: string;
}

export function SelectInput({ options, onSelect, onCancel, placeholder }: Props) {
  const [query,    setQuery]    = useState('');
  const [selected, setSelected] = useState(0);
  const [mode,     setMode]     = useState<'list' | 'type'>('list');
  const [cursor,   setCursor]   = useState(true);

  useEffect(() => {
    const t = setInterval(() => setCursor(v => !v), 530);
    return () => clearInterval(t);
  }, []);

  const filtered = query.trim()
    ? options.filter(o =>
        o.value.toLowerCase().includes(query.toLowerCase()) ||
        o.label.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  useEffect(() => {
    setSelected(i => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useInput((input, key) => {
    if (key.escape) { onCancel?.(); return; }

    if (mode === 'list') {
      if (key.upArrow)   { setSelected(i => Math.max(0, i - 1)); return; }
      if (key.downArrow) { setSelected(i => Math.min(filtered.length - 1, i + 1)); return; }
      if (key.return) {
        const item = filtered[selected];
        if (item) onSelect(item.value);
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setMode('type');
        setQuery(input);
        return;
      }
    }

    if (mode === 'type') {
      if (key.upArrow)   { setSelected(i => Math.max(0, i - 1)); return; }
      if (key.downArrow) { setSelected(i => Math.min(filtered.length - 1, i + 1)); return; }
      if (key.return) {
        const item = filtered[selected];
        if (item) onSelect(item.value);
        return;
      }
      if (key.backspace || key.delete) {
        const next = query.slice(0, -1);
        setQuery(next);
        if (next === '') setMode('list');
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setQuery(q => q + input);
        return;
      }
    }
  });

  return (
    <Box flexDirection="column" gap={0}>
      <Box borderStyle="single" borderColor={mode === 'type' ? theme.accent : theme.panel} paddingX={1}>
        <Text color={theme.textMuted}>filter  </Text>
        {mode === 'type' ? (
          <>
            <Text color={theme.text}>{query}</Text>
            <Text color={cursor ? theme.cursor : theme.bg}>█</Text>
          </>
        ) : (
          <Text color={theme.textMuted} dimColor>
            {placeholder ?? 'type to filter or use ↑↓ arrows'}
          </Text>
        )}
      </Box>

      <Box flexDirection="column">
        {filtered.length === 0 ? (
          <Box paddingX={2}>
            <Text color={theme.textMuted} dimColor>No matches for "{query}"</Text>
          </Box>
        ) : (
          filtered.map((opt, i) => {
            const isSelected = i === selected;
            return (
              <Box key={opt.value} paddingX={1} gap={2}>
                {isSelected ? (
                  <>
                    <Text color={theme.bg} backgroundColor={theme.accent} bold>
                      {` ${opt.label.padEnd(16)} `}
                    </Text>
                    {opt.hint && <Text color={theme.textDim}>{opt.hint}</Text>}
                  </>
                ) : (
                  <>
                    <Text color={theme.textMuted}>{`  ${opt.label.padEnd(16)}  `}</Text>
                    {opt.hint && <Text color={theme.textMuted} dimColor>{opt.hint}</Text>}
                  </>
                )}
              </Box>
            );
          })
        )}
      </Box>

      <Text color={theme.textMuted} dimColor>
        {'  '}↑↓ navigate  Enter select  type to filter  Esc cancel
      </Text>
    </Box>
  );
}   