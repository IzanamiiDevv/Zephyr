import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../theme.js';

interface Step {
  label: string;
  done:  boolean;
}

interface Props {
  title:    string;
  steps:    Step[];
  current:  number;
  children: React.ReactNode;
  error?:   string | null;
  warning?: string | null;
}

export function WizardShell({ title, steps, current, children, error, warning }: Props) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.accent}
      paddingX={2}
      paddingY={1}
      gap={1}
    >
      <Box justifyContent="space-between">
        <Text color={theme.text} bold>{title}</Text>
        <Text color={theme.textMuted}>Esc to cancel</Text>
      </Box>

      <Box gap={1}>
        {steps.map((step, i) => {
          const isCurrent = i === current;
          const isDone    = step.done;
          return (
            <Box key={step.label} gap={1}>
              {i > 0 && <Text color={theme.textMuted}>›</Text>}
              <Text
                color={
                  isDone      ? theme.success
                  : isCurrent ? theme.accent
                  : theme.textMuted
                }
                bold={isCurrent}
              >
                {isDone ? '✔ ' : isCurrent ? '● ' : '○ '}
                {step.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Text color={theme.panel}>{'─'.repeat(54)}</Text>

      {error && (
        <Box borderStyle="single" borderColor={theme.danger} paddingX={1}>
          <Text color={theme.danger}>✖  {error}</Text>
        </Box>
      )}

      {warning && (
        <Box borderStyle="single" borderColor={theme.warn} paddingX={1}>
          <Text color={theme.warn}>⚠  {warning}</Text>
        </Box>
      )}

      {children}
    </Box>
  );
}