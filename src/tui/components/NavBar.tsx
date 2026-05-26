import React from 'react';
import { Box, Text, useInput } from 'ink';
import { theme, SCREENS, type ScreenId } from '../theme.js';
import { useAppStore } from '../store/appStore.js';

interface Props { termWidth: number; }

export function NavBar({ termWidth: _ }: Props) {
  const { activeScreen, setScreen, inputActive } = useAppStore();

  useInput((_, key) => {
    if (inputActive) return;
    if (key.tab) {
      const idx = SCREENS.findIndex(s => s.id === activeScreen);
      const next = SCREENS[(idx + 1) % SCREENS.length];
      setScreen(next!.id as ScreenId);
    }
  });

  return (
    <Box borderStyle="single" borderColor={theme.panel} paddingX={1}>
      <Box gap={1}>
        {SCREENS.map((screen, i) => {
          const isActive = screen.id === activeScreen;
          return (
            <Box key={screen.id}>
              {i > 0 && <Text color={theme.textMuted}>  │  </Text>}
              <Box paddingX={1}>
                {isActive ? (
                  <Text color={theme.bg} backgroundColor={theme.accent} bold>
                    {` ${screen.label} `}
                  </Text>
                ) : (
                  <Text color={theme.textMuted}>{screen.label}</Text>
                )}
              </Box>
            </Box>
          );
        })}
        <Text color={theme.textMuted}>{'  │  '}</Text>
        <Text color={theme.textMuted} dimColor>Tab to switch</Text>
      </Box>
    </Box>
  );
}