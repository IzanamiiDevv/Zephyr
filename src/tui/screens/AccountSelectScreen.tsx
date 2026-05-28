import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../theme.js';
import type { GitAccount } from '../../git/AccountDetector.js';

interface Props {
  accounts: GitAccount[];
  onSelect: (account: GitAccount) => void;
}

export function AccountSelectScreen({ accounts, onSelect }: Props) {
  const [selected, setSelected] = useState(0);

  useInput((_, key) => {
    if (key.upArrow)   { setSelected(i => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setSelected(i => Math.min(accounts.length - 1, i + 1)); return; }
    if (key.return) {
      const account = accounts[selected];
      if (account) onSelect(account);
    }
  });

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Box flexDirection="column" gap={0}>
        <Text color={theme.text} bold>Multiple Git Accounts Detected</Text>
        <Text color={theme.textMuted}>
          Select the account to use for this session.
          This prevents GitHub from repeatedly prompting you to choose an account.
        </Text>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>AVAILABLE ACCOUNTS</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {accounts.map((acc, i) => {
            const isSelected = i === selected;
            return (
              <Box key={`${acc.name}|${acc.email}`} flexDirection="column" marginBottom={1}>
                {isSelected ? (
                  <Box gap={2}>
                    <Text color={theme.bg} backgroundColor={theme.accent} bold>
                      {` ▶ ${(acc.name || 'Unknown').padEnd(24)} `}
                    </Text>
                    <Text color={theme.textDim}>{acc.source}</Text>
                  </Box>
                ) : (
                  <Box gap={2}>
                    <Text color={theme.textMuted}>{'   '}{(acc.name || 'Unknown').padEnd(24)}</Text>
                    <Text color={theme.textMuted} dimColor>{acc.source}</Text>
                  </Box>
                )}
                <Box paddingLeft={3} gap={2}>
                  <Text color={theme.textMuted}>email</Text>
                  <Text color={isSelected ? theme.accent : theme.textMuted}>{acc.email}</Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>
      <Text color={theme.textMuted} dimColor>↑↓ navigate  Enter select</Text>
    </Box>
  );
}