import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme }               from '../theme.js';
import { useAppStore }         from '../store/appStore.js';
import { parseBranch, commitPrefix, BRANCH_TYPES } from '../../git/BranchParser.js';
import {
  commitChanges,
  pushCurrentBranch,
  amendLastCommit,
  buildPrefixedMessage,
  type CommitResult,
} from '../../git/CommitWorkflows.js';
import type { CommitInfo } from '../../git/GitService.js';

type View = 'main' | 'write' | 'push-prompt' | 'amend' | 'error';

function InlineInput({
  value, onChange, onSubmit, onCancel, placeholder,
}: {
  value:       string;
  onChange:    (v: string) => void;
  onSubmit:    (v: string) => void;
  onCancel:    () => void;
  placeholder: string;
}) {
  const [cur, setCur] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setCur(v => !v), 530);
    return () => clearInterval(t);
  }, []);

  useInput((input, key) => {
    if (key.escape)                  { onCancel(); return; }
    if (key.return)                  { if (value.trim()) onSubmit(value.trim()); return; }
    if (key.backspace || key.delete) { onChange(value.slice(0, -1)); return; }
    if (input && !key.ctrl && !key.meta) { onChange(value + input); }
  });

  return (
    <Box borderStyle="single" borderColor={theme.accent} paddingX={1}>
      <Text color={theme.accent} bold>{'> '}</Text>
      {value
        ? <Text color={theme.text}>{value}</Text>
        : <Text color={theme.textMuted} dimColor>{placeholder}</Text>
      }
      <Text color={cur ? theme.cursor : theme.bg}>{'█'}</Text>
    </Box>
  );
}

const TYPE_COLORS: Record<string, string> = {
  feat:     theme.success,
  fix:      theme.danger,
  refactor: theme.accent,
  docs:     theme.textDim,
  style:    theme.panel,
  chore:    theme.textMuted,
};

export function CommitsScreen() {
  const {
    gitService, currentBranch,
    refreshStatus, setFooterMessage,
  } = useAppStore();

  const [view,        setView]        = useState<View>('main');
  const [msgBody,     setMsgBody]     = useState('');
  const [amendMsg,    setAmendMsg]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [lastResult,  setLastResult]  = useState<CommitResult | null>(null);
  const [recentLogs,  setRecentLogs]  = useState<CommitInfo[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const parsed      = parseBranch(currentBranch);
  const prefix      = commitPrefix(parsed) ?? '';
  const isDevBranch = parsed.kind === 'dev';
  const preview     = msgBody.trim()
    ? buildPrefixedMessage(currentBranch, msgBody.trim())
    : prefix ? `${prefix} …` : '…';

  useEffect(() => { void loadLogs(); }, []);

  async function loadLogs() {
    if (!gitService) return;
    setLogsLoading(true);
    try {
      const logs = await gitService.getRecentCommits(5);
      setRecentLogs(logs);
    } catch { /* ignore */ }
    setLogsLoading(false);
  }

  useInput(async (input) => {
    if (view !== 'main' || loading) return;
    if (input.toLowerCase() === 'c') { setMsgBody(''); setView('write'); return; }
    if (input.toLowerCase() === 'a') {
      const last = recentLogs[0];
      if (last) { setAmendMsg(last.message); setView('amend'); }
      return;
    }
    if (input.toLowerCase() === 'r') { await loadLogs(); return; }
  });

  async function handleCommit(body: string) {
    if (!gitService) return;
    const fullMsg = buildPrefixedMessage(currentBranch, body);
    setLoading(true);
    const result = await commitChanges(gitService, fullMsg);
    setLoading(false);
    if (!result.ok) { setError(result.message); setView('error'); return; }
    setLastResult(result);
    await loadLogs();
    await refreshStatus();
    setView('push-prompt');
  }

  async function handleAmend(msg: string) {
    if (!gitService) return;
    setLoading(true);
    const result = await amendLastCommit(gitService, msg);
    setLoading(false);
    if (!result.ok) { setError(result.message); setView('error'); return; }
    setFooterMessage(`✔ Amended: ${result.hash}`);
    setTimeout(() => setFooterMessage(null), 3000);
    await loadLogs();
    setView('main');
  }

  async function handlePush() {
    if (!gitService) return;
    setLoading(true);
    const result = await pushCurrentBranch(gitService, currentBranch);
    setLoading(false);
    if (!result.ok) { setError(result.message); setView('error'); return; }
    setFooterMessage(`✔ ${result.message}`);
    setTimeout(() => setFooterMessage(null), 4000);
    setView('main');
  }

  // ── Write view ─────────────────────────────────────────────────────────
  if (view === 'write') {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.text} bold>Write Commit Message</Text>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Box flexDirection="column" gap={0}>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'branch'.padEnd(14)}</Text>
            <Text color={theme.accent}>{currentBranch}</Text>
          </Box>
          {prefix && (
            <Box gap={2}>
              <Text color={theme.textMuted}>{'auto-prefix'.padEnd(14)}</Text>
              <Text color={theme.text} bold>{prefix}</Text>
            </Box>
          )}
          <Box gap={2}>
            <Text color={theme.textMuted}>{'preview'.padEnd(14)}</Text>
            <Text color={theme.textDim}>{preview}</Text>
          </Box>
        </Box>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Box flexDirection="column" gap={1}>
          <Text color={theme.textDim} bold>
            {prefix ? 'MESSAGE BODY' : 'COMMIT MESSAGE'}
          </Text>
          {prefix && (
            <Text color={theme.textMuted} dimColor>
              Just type the description — prefix is added automatically.
            </Text>
          )}
          {loading ? (
            <Text color={theme.accent}>Committing…</Text>
          ) : (
            <InlineInput
              value={msgBody}
              onChange={setMsgBody}
              onSubmit={handleCommit}
              onCancel={() => { setView('main'); setMsgBody(''); }}
              placeholder={prefix
                ? 'e.g. add login form validation'
                : 'feat(auth): add login form'
              }
            />
          )}
        </Box>
        <Text color={theme.textMuted} dimColor>Enter to commit  Esc to cancel</Text>
      </Box>
    );
  }

  // ── Push prompt view ───────────────────────────────────────────────────
  if (view === 'push-prompt') {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.success} bold>✔ Commit successful</Text>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Box flexDirection="column" gap={0}>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'hash'.padEnd(12)}</Text>
            <Text color={theme.accent}>{lastResult?.hash ?? '—'}</Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'message'.padEnd(12)}</Text>
            <Text color={theme.text}>
              {lastResult?.message.replace('Committed: ', '')}
            </Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'branch'.padEnd(12)}</Text>
            <Text color={theme.accent}>{currentBranch}</Text>
          </Box>
        </Box>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Text color={theme.text} bold>Push to remote?</Text>
        <Text color={theme.textMuted}>
          Push <Text color={theme.accent}>{currentBranch}</Text> to origin.
        </Text>
        <Box gap={3} marginTop={1}>
          {loading ? (
            <Text color={theme.accent}>Pushing…</Text>
          ) : (
            <>
              <Text color={theme.bg} backgroundColor={theme.accent} bold>
                {' Y — push now '}
              </Text>
              <Text color={theme.textMuted}>N — skip push</Text>
            </>
          )}
        </Box>
        {!loading && (
          <PushPromptInput onYes={handlePush} onNo={() => setView('main')} />
        )}
      </Box>
    );
  }

  // ── Amend view ─────────────────────────────────────────────────────────
  if (view === 'amend') {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.text} bold>Amend Last Commit</Text>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Box gap={2}>
          <Text color={theme.textMuted}>{'current'.padEnd(12)}</Text>
          <Text color={theme.textDim}>{recentLogs[0]?.message ?? '—'}</Text>
        </Box>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Box flexDirection="column" gap={1}>
          <Text color={theme.textDim} bold>NEW MESSAGE</Text>
          {loading ? (
            <Text color={theme.accent}>Amending…</Text>
          ) : (
            <InlineInput
              value={amendMsg}
              onChange={setAmendMsg}
              onSubmit={handleAmend}
              onCancel={() => setView('main')}
              placeholder="Updated commit message"
            />
          )}
        </Box>
        <Text color={theme.textMuted} dimColor>Enter to amend  Esc to cancel</Text>
      </Box>
    );
  }

  // ── Error view ─────────────────────────────────────────────────────────
  if (view === 'error') {
    return (
      <Box flexDirection="column" padding={2} gap={1}>
        <Text color={theme.danger} bold>✖ Operation Failed</Text>
        <Text color={theme.panel}>{'─'.repeat(60)}</Text>
        <Box borderStyle="single" borderColor={theme.danger} paddingX={1}>
          {(error ?? '').split('\n').map((line, i) => (
            <Text key={i} color={theme.danger}>{line}</Text>
          ))}
        </Box>
        <EscInput onEsc={() => setView('main')} />
        <Text color={theme.textMuted} dimColor>Press Esc to go back.</Text>
      </Box>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────
  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Box justifyContent="space-between">
        <Text color={theme.text} bold>Commits</Text>
        {logsLoading && <Text color={theme.textMuted} dimColor>loading…</Text>}
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>CURRENT BRANCH</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'branch'.padEnd(14)}</Text>
            <Text color={theme.accent} bold>{currentBranch}</Text>
          </Box>
          {isDevBranch && parsed.kind === 'dev' && (
            <>
              <Box gap={2}>
                <Text color={theme.textMuted}>{'type'.padEnd(14)}</Text>
                <Text color={TYPE_COLORS[parsed.type] ?? theme.text}>{parsed.type}</Text>
              </Box>
              <Box gap={2}>
                <Text color={theme.textMuted}>{'scope'.padEnd(14)}</Text>
                <Text color={theme.text}>{parsed.scope}</Text>
              </Box>
              <Box gap={2}>
                <Text color={theme.textMuted}>{'auto-prefix'.padEnd(14)}</Text>
                <Text color={theme.text} bold>{prefix}</Text>
              </Box>
            </>
          )}
          {!isDevBranch && (
            <Box gap={2}>
              <Text color={theme.textMuted}>{'prefix'.padEnd(14)}</Text>
              <Text color={theme.textMuted} dimColor>none — not a dev branch</Text>
            </Box>
          )}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>ACTIONS</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {[
            ['C', 'New commit',  'Write message, auto-prefix applied'],
            ['A', 'Amend last', 'Edit the most recent commit message'],
            ['R', 'Refresh',    'Reload commit history'],
          ].map(([key, label, desc]) => (
            <Box key={key} gap={2}>
              <Text color={theme.bg} backgroundColor={theme.panel}>{` ${key} `}</Text>
              <Text color={theme.text} bold>{(label ?? '').padEnd(18)}</Text>
              <Text color={theme.textMuted}>{desc}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>
          RECENT COMMITS{' '}
          <Text color={theme.textMuted} dimColor>(last 5)</Text>
        </Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {recentLogs.length === 0 && !logsLoading ? (
            <Text color={theme.textMuted} dimColor>No commits yet.</Text>
          ) : (
            recentLogs.map((log, i) => (
              <Box key={log.hash} gap={2}>
                <Text color={theme.accent}>{log.hash}</Text>
                <Text color={i === 0 ? theme.text : theme.textMuted}>
                  {log.message.length > 48
                    ? log.message.slice(0, 46) + '…'
                    : log.message.padEnd(48)
                  }
                </Text>
                <Text color={theme.textMuted} dimColor>{log.author}</Text>
              </Box>
            ))
          )}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color={theme.textDim} bold>COMMIT TYPE REFERENCE</Text>
        <Box flexDirection="row" gap={3} marginTop={1} flexWrap="wrap">
          {BRANCH_TYPES.map(t => (
            <Text key={t} color={TYPE_COLORS[t] ?? theme.text} bold>{t}</Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function PushPromptInput({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  useInput((input, key) => {
    if (input.toLowerCase() === 'y') { onYes(); return; }
    if (input.toLowerCase() === 'n' || key.escape) { onNo(); return; }
  });
  return null;
}

function EscInput({ onEsc }: { onEsc: () => void }) {
  useInput((_, key) => { if (key.escape) onEsc(); });
  return null;
}