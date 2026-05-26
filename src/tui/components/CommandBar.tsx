import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme, COMMANDS, SCREENS, type ScreenId } from '../theme.js';
import { useAppStore } from '../store/appStore.js';

interface Props { termWidth: number; }

export function CommandBar({ termWidth: _ }: Props) {
  const {
    inputActive, inputValue,
    setInputActive, setInputValue,
    setScreen, setFooterMessage,
  } = useAppStore();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!inputValue || inputValue === '/') {
      setSuggestions(COMMANDS);
      setSelectedSuggestion(0);
      return;
    }
    const filtered = COMMANDS.filter(c => c.startsWith(inputValue.toLowerCase()));
    setSuggestions(filtered);
    setSelectedSuggestion(0);
  }, [inputValue]);

  useInput((input, key) => {
    if (!inputActive) return;
    if (key.escape)    { setInputActive(false); return; }
    if (key.upArrow)   { setSelectedSuggestion(i => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setSelectedSuggestion(i => Math.min(suggestions.length - 1, i + 1)); return; }
    if (key.tab && suggestions.length > 0) {
      setInputValue(suggestions[selectedSuggestion] ?? inputValue);
      return;
    }
    if (key.return) {
      executeCommand(inputValue || (suggestions[selectedSuggestion] ?? ''));
      return;
    }
    if (key.backspace || key.delete) { setInputValue(inputValue.slice(0, -1)); return; }
    if (input && !key.ctrl && !key.meta) { setInputValue(inputValue + input); }
  });

  function executeCommand(cmd: string) {
    const normalized = cmd.trim().toLowerCase();
    const screenMatch = SCREENS.find(s => s.cmd === normalized);
    if (screenMatch) { setScreen(screenMatch.id as ScreenId); setInputActive(false); return; }
    if (normalized === '/help') {
      setScreen('home');
      setFooterMessage('Help: use Tab or /command to navigate screens');
      setTimeout(() => setFooterMessage(null), 4000);
      setInputActive(false);
      return;
    }
    if (normalized === '/quit' || normalized === '/q') { process.exit(0); }
    if (normalized === '/clear') { setInputActive(false); return; }
    setFooterMessage(`Unknown command: ${cmd}`);
    setTimeout(() => setFooterMessage(null), 3000);
    setInputActive(false);
  }

  if (!inputActive) return null;

  const visibleSuggestions = suggestions.slice(0, 8);

  return (
    <Box flexDirection="column">
      {visibleSuggestions.length > 0 && (
        <Box flexDirection="column" borderStyle="single" borderColor={theme.panel} paddingX={1} marginX={1}>
          {visibleSuggestions.map((cmd, i) => {
            const isSelected = i === selectedSuggestion;
            const screen = SCREENS.find(s => s.cmd === cmd);
            const desc = screen ? screen.label
              : cmd === '/help'  ? 'Show help'
              : cmd === '/quit'  ? 'Exit Zephyr'
              : cmd === '/clear' ? 'Clear input' : '';
            return (
              <Box key={cmd} paddingX={1}>
                {isSelected ? (
                  <Box>
                    <Text color={theme.bg} backgroundColor={theme.accent}>{` ${cmd.padEnd(14)} `}</Text>
                    <Text color={theme.textDim}>{'  '}{desc}</Text>
                  </Box>
                ) : (
                  <Box>
                    <Text color={theme.accent}>{cmd.padEnd(16)}</Text>
                    <Text color={theme.textMuted}>{desc}</Text>
                  </Box>
                )}
              </Box>
            );
          })}
          {suggestions.length > 8 && (
            <Text color={theme.textMuted} dimColor>  +{suggestions.length - 8} more…</Text>
          )}
        </Box>
      )}

      <Box borderStyle="single" borderColor={theme.accent} paddingX={1}>
        <Text color={theme.accent} bold>{'> '}</Text>
        <Text color={theme.text}>{inputValue}</Text>
        <Text color={cursorVisible ? theme.cursor : theme.bg}>█</Text>
        <Text color={theme.textMuted}>{'  ↑↓ select  Tab complete  Enter run  Esc close'}</Text>
      </Box>
    </Box>
  );
}