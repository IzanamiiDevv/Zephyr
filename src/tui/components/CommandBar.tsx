import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme, SCREENS, type ScreenId } from '../theme.js';
import { useAppStore } from '../store/appStore.js';
import { getSuggestions, type AutocompleteSuggestion } from '../../git/GitAutocomplete.js';

interface Props { termWidth: number; }

export function CommandBar({ termWidth: _ }: Props) {
  const {
    inputActive, inputValue,
    setInputActive, setInputValue,
    setScreen, setFooterMessage,
    gitService,
  } = useAppStore();

  const [suggestions,        setSuggestions]        = useState<AutocompleteSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [cursorVisible,      setCursorVisible]       = useState(true);

  useEffect(() => {
    const t = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const raw     = !inputValue || inputValue === '/' ? '' : inputValue;
    const results = getSuggestions(raw);
    setSuggestions(results);
    setSelectedSuggestion(0);
  }, [inputValue]);

  const safeSelected = Math.min(
    selectedSuggestion,
    Math.max(0, suggestions.length - 1),
  );

  useInput(async (input, key) => {
    if (!inputActive) return;

    if (key.escape)    { setInputActive(false); return; }
    if (key.upArrow)   { setSelectedSuggestion(i => Math.max(0, i - 1)); return; }
    if (key.downArrow) {
      setSelectedSuggestion(i => Math.min(suggestions.length - 1, i + 1));
      return;
    }
    if (key.tab && suggestions.length > 0) {
      setInputValue(suggestions[safeSelected]?.value ?? inputValue);
      return;
    }
    if (key.return) {
      await executeCommand(inputValue || (suggestions[safeSelected]?.value ?? ''));
      return;
    }
    if (key.backspace || key.delete) { setInputValue(inputValue.slice(0, -1)); return; }
    if (input && !key.ctrl && !key.meta) { setInputValue(inputValue + input); }
  });

  async function executeCommand(cmd: string) {
    const normalized = cmd.trim().toLowerCase();

    const screenMatch = SCREENS.find(s => s.cmd === normalized);
    if (screenMatch) {
      setScreen(screenMatch.id as ScreenId);
      setInputActive(false);
      return;
    }

    if (normalized === '/help') {
      setScreen('home');
      setFooterMessage('Help: use Tab or /command to navigate screens');
      setTimeout(() => setFooterMessage(null), 4000);
      setInputActive(false);
      return;
    }
    if (normalized === '/quit' || normalized === '/q') { process.exit(0); }
    if (normalized === '/clear') { setInputActive(false); return; }

    if (normalized.startsWith('git ') || normalized === 'git') {
      if (!gitService) {
        setFooterMessage('No git repo detected.');
        setTimeout(() => setFooterMessage(null), 3000);
        setInputActive(false);
        return;
      }
      try {
        const raw    = cmd.trim().slice(4).trim();
        const args   = raw.split(/\s+/).filter(Boolean);
        await (gitService as any).git.raw(args);
        setFooterMessage(`✔ git ${raw}`);
        setTimeout(() => setFooterMessage(null), 3000);
      } catch (err) {
        const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
        setFooterMessage(`git error: ${msg}`);
        setTimeout(() => setFooterMessage(null), 5000);
      }
      setInputActive(false);
      return;
    }

    setFooterMessage(`Unknown command: ${cmd}`);
    setTimeout(() => setFooterMessage(null), 3000);
    setInputActive(false);
  }

  if (!inputActive) return null;

  const visibleSuggestions = suggestions.slice(0, 8);

  function kindColor(kind: AutocompleteSuggestion['kind']): string {
    if (kind === 'git')    return theme.warn;
    if (kind === 'zephyr') return theme.accent;
    return theme.textDim;
  }

  function kindBadge(kind: AutocompleteSuggestion['kind']): string {
    if (kind === 'git')    return 'git';
    if (kind === 'zephyr') return 'zep';
    return '   ';
  }

  return (
    <Box flexDirection="column">
      {visibleSuggestions.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.panel}
          paddingX={1}
          marginX={1}
        >
          {visibleSuggestions.map((s, i) => {
            const isSelected = i === safeSelected;
            const color      = kindColor(s.kind);
            const badge      = kindBadge(s.kind);
            return (
              <Box key={s.value} paddingX={1} gap={1}>
                <Text color={color} dimColor>{badge}</Text>
                {isSelected ? (
                  <Box gap={2}>
                    <Text color={theme.bg} backgroundColor={color} bold>
                      {` ${s.label.padEnd(28)} `}
                    </Text>
                    <Text color={theme.textDim}>{s.desc.padEnd(32)}</Text>
                  </Box>
                ) : (
                  <Box gap={2}>
                    <Text color={color}>{s.label.padEnd(30)}</Text>
                    <Text color={theme.textMuted}>{s.desc}</Text>
                  </Box>
                )}
              </Box>
            );
          })}
          {suggestions.length > 8 && (
            <Text color={theme.textMuted} dimColor>
              {'  '}+{suggestions.length - 8} more…
            </Text>
          )}
        </Box>
      )}

      <Box borderStyle="single" borderColor={theme.accent} paddingX={1}>
        <Text color={theme.accent} bold>{'> '}</Text>
        <Text color={theme.text}>{inputValue}</Text>
        <Text color={cursorVisible ? theme.cursor : theme.bg}>{'█'}</Text>
        <Text color={theme.textMuted}>
          {'  ↑↓ select  Tab complete  Enter run  Esc close'}
        </Text>
      </Box>
    </Box>
  );
}