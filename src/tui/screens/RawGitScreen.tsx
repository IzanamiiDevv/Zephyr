import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme }        from '../theme.js';
import { useAppStore }  from '../store/appStore.js';
import {
  runGitCommand,
  type GitOutputLine,
} from '../../git/RawGitRunner.js';

const MAX_HISTORY    = 10;
const MAX_SCROLL_BUF = 500;

// ── Output line renderer ──────────────────────────────────────────────────

function OutputLine({ line }: { line: GitOutputLine }) {
  const color =
    line.kind === 'error'   ? theme.danger
    : line.kind === 'warning' ? theme.warn
    : line.kind === 'success' ? theme.success
    : line.kind === 'hash'    ? theme.accent
    : line.kind === 'branch'  ? theme.text
    : line.kind === 'header'  ? theme.textDim
    : line.kind === 'dim'     ? theme.textMuted
    : theme.text;

  const bold =
    line.kind === 'header' ||
    line.kind === 'error'  ||
    line.kind === 'success';

  // Highlight embedded hashes inline
  const HASH_RE = /([0-9a-f]{7,40})/g;
  if (line.kind === 'normal' && HASH_RE.test(line.text)) {
    const parts = line.text.split(/([0-9a-f]{7,40})/g);
    return (
      <Box>
        {parts.map((part, i) =>
          /^[0-9a-f]{7,40}$/.test(part) ? (
            <Text key={i} color={theme.accent}>{part}</Text>
          ) : (
            <Text key={i} color={color} bold={bold}>{part}</Text>
          )
        )}
      </Box>
    );
  }

  return <Text color={color} bold={bold}>{line.text}</Text>;
}

// ── Blinking cursor input ─────────────────────────────────────────────────

function GitInput({
  value,
  onChange,
  onSubmit,
  onHistoryUp,
  onHistoryDown,
}: {
  value:          string;
  onChange:       (v: string) => void;
  onSubmit:       (v: string) => void;
  onHistoryUp:    () => void;
  onHistoryDown:  () => void;
}) {
  const [cur, setCur] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setCur(v => !v), 530);
    return () => clearInterval(t);
  }, []);

  useInput((input, key) => {
    if (key.upArrow)   { onHistoryUp();   return; }
    if (key.downArrow) { onHistoryDown(); return; }
    if (key.return)    { if (value.trim()) onSubmit(value.trim()); return; }
    if (key.backspace || key.delete) { onChange(value.slice(0, -1)); return; }
    if (input && !key.ctrl && !key.meta && !key.escape) { onChange(value + input); }
  });

  return (
    <Box borderStyle="single" borderColor={theme.accent} paddingX={1}>
      <Text color={theme.textMuted}>$ </Text>
      <Text color={theme.text}>{value}</Text>
      <Text color={cur ? theme.cursor : theme.bg}>█</Text>
    </Box>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────

interface OutputBlock {
  cmd:   string;
  lines: GitOutputLine[];
  ok:    boolean;
}

export function RawGitScreen() {
  const { gitService, setFooterMessage } = useAppStore();

  const [input,       setInput]       = useState('');
  const [history,     setHistory]     = useState<string[]>([]);
  const [historyIdx,  setHistoryIdx]  = useState(-1);
  const [output,      setOutput]      = useState<OutputBlock[]>([]);
  const [running,     setRunning]     = useState(false);
  const [scrollTop,   setScrollTop]   = useState(0);

  // Flatten all output lines for scroll calculation
  const allLines: { block: number; line: GitOutputLine }[] = output.flatMap(
    (block, bi) => [
      { block: bi, line: { text: `$ ${block.cmd}`, kind: 'branch' as const } },
      ...block.lines.map(l => ({ block: bi, line: l })),
      { block: bi, line: { text: '', kind: 'dim' as const } },
    ]
  );

  const VISIBLE_LINES = 18;
  const maxScroll     = Math.max(0, allLines.length - VISIBLE_LINES);
  const visibleLines  = allLines.slice(scrollTop, scrollTop + VISIBLE_LINES);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    setScrollTop(maxScroll);
  }, [output.length]);

  // Scroll keybinds — only when not typing
  useInput((input, key) => {
    if (running) return;

    // Scroll output
    if (key.pageDown) { setScrollTop(s => Math.min(maxScroll, s + 5)); return; }
    if (key.pageUp)   { setScrollTop(s => Math.max(0, s - 5)); return; }

    // Clear
    if (input.toLowerCase() === 'c' && !key.ctrl) {
      setOutput([]);
      setScrollTop(0);
      setInput('');
      return;
    }
  });

  // History navigation
  function historyUp() {
    if (history.length === 0) return;
    const newIdx = Math.min(historyIdx + 1, history.length - 1);
    setHistoryIdx(newIdx);
    setInput(history[newIdx] ?? '');
  }

  function historyDown() {
    if (historyIdx <= 0) {
      setHistoryIdx(-1);
      setInput('');
      return;
    }
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    setInput(history[newIdx] ?? '');
  }

  async function handleSubmit(cmd: string) {
    if (!gitService) {
      setFooterMessage('No git repository detected.');
      setTimeout(() => setFooterMessage(null), 3000);
      return;
    }

    // Add to history (deduplicated, most recent first)
    setHistory(prev => {
      const deduped = [cmd, ...prev.filter(c => c !== cmd)];
      return deduped.slice(0, MAX_HISTORY);
    });
    setHistoryIdx(-1);
    setInput('');
    setRunning(true);

    const result = await runGitCommand(gitService, cmd);
    setRunning(false);

    setOutput(prev => {
      const next = [...prev, { cmd, lines: result.lines, ok: result.ok }];
      // Keep buffer bounded
      if (next.length > MAX_SCROLL_BUF) next.shift();
      return next;
    });
  }

  const EXAMPLE_CMDS = [
    'git log --oneline -10',
    'git diff HEAD~1',
    'git remote -v',
    'git branch -a',
    'git stash list',
  ];

  return (
    <Box flexDirection="column" padding={2} gap={1}>

      {/* Header */}
      <Box justifyContent="space-between">
        <Text color={theme.text} bold>Raw Git Passthrough</Text>
        <Box gap={3}>
          {running && <Text color={theme.accent}>running…</Text>}
          {allLines.length > VISIBLE_LINES && (
            <Text color={theme.textMuted} dimColor>
              PgUp/PgDn scroll  {scrollTop + 1}–{Math.min(scrollTop + VISIBLE_LINES, allLines.length)}/{allLines.length}
            </Text>
          )}
          {output.length > 0 && !running && (
            <Text color={theme.textMuted} dimColor>C clear</Text>
          )}
        </Box>
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Output area */}
      <Box
        flexDirection="column"
        height={VISIBLE_LINES}
        overflow="hidden"
      >
        {output.length === 0 ? (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.textMuted} dimColor>
              Type a git command below. With or without the{' '}
              <Text color={theme.accent}>git</Text> prefix.
            </Text>
            <Box flexDirection="column" gap={0} marginTop={1}>
              <Text color={theme.textDim} bold>EXAMPLES</Text>
              {EXAMPLE_CMDS.map(cmd => (
                <Box key={cmd} gap={2}>
                  <Text color={theme.textMuted}>$</Text>
                  <Text color={theme.accent}>{cmd}</Text>
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          visibleLines.map((item, i) => (
            <OutputLine key={i} line={item.line} />
          ))
        )}
      </Box>

      <Text color={theme.panel}>{'─'.repeat(60)}</Text>

      {/* Input */}
      <GitInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onHistoryUp={historyUp}
        onHistoryDown={historyDown}
      />

      {/* Hints */}
      <Box gap={3}>
        <Text color={theme.textMuted} dimColor>↑↓ history</Text>
        <Text color={theme.textMuted} dimColor>PgUp/PgDn scroll</Text>
        <Text color={theme.textMuted} dimColor>C clear</Text>
        {history.length > 0 && (
          <Text color={theme.textMuted} dimColor>
            {history.length} command{history.length !== 1 ? 's' : ''} in history
          </Text>
        )}
      </Box>

    </Box>
  );
}