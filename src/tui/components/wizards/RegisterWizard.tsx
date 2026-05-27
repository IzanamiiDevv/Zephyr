import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { WizardShell } from './WizardShell.js';
import { SelectInput } from './SelectInput.js';
import { theme }       from '../../theme.js';
import { useAppStore } from '../../store/appStore.js';
import { registerBranch, openPullRequestInBrowser } from '../../../git/BranchWorkflows.js';
import { parseBranch } from '../../../git/BranchParser.js';

type Step = 'select' | 'confirm' | 'push' | 'pr-prompt' | 'done' | 'error';

interface Props { onClose: () => void; }

export function RegisterWizard({ onClose }: Props) {
  const { gitService, localBranches, currentBranch, setFooterMessage } = useAppStore();

  const [step,           setStep]           = useState<Step>('select');
  const [selectedBranch, setSelectedBranch] = useState(currentBranch);
  const [error,          setError]          = useState<string | null>(null);
  const [pushResult,     setPushResult]     = useState<string | null>(null);
  const [loading,        setLoading]        = useState(false);

  const STEPS = [
    { label: 'Select', done: step !== 'select' },
    { label: 'Push',   done: ['pr-prompt','done','error'].includes(step) },
    { label: 'PR',     done: ['done','error'].includes(step) },
  ];

  const currentStepIdx =
    step === 'select' || step === 'confirm' ? 0
    : step === 'push'                       ? 1
    : 2;

  useInput((_, key) => { if (key.escape) onClose(); });

  const branchOptions = localBranches.map(b => ({
    value: b.name,
    label: b.name,
    hint:  b.name === currentBranch ? '← current' : '',
  }));

  async function handlePush() {
    if (!gitService) return;
    setLoading(true);
    setStep('push');
    const res = await registerBranch(gitService, selectedBranch);
    setLoading(false);
    if (!res.ok) { setError(res.message); setStep('error'); return; }
    setPushResult(res.message);
    setStep('pr-prompt');
  }

  async function handleOpenPR() {
    if (!gitService) return;
    setLoading(true);
    const res = await openPullRequestInBrowser(gitService, selectedBranch);
    setLoading(false);
    if (!res.ok) { setError(res.message); setStep('error'); return; }
    setFooterMessage('✔ PR page opened in browser');
    setTimeout(() => setFooterMessage(null), 4000);
    setStep('done');
  }

  const parsed = parseBranch(selectedBranch);

  if (step === 'done') {
    return (
      <WizardShell title="Branch Registered" steps={STEPS} current={2}>
        <Box flexDirection="column" gap={1} marginTop={1}>
          <Text color={theme.success} bold>✔ Done</Text>
          <Text color={theme.textMuted}>{pushResult}</Text>
          <Text color={theme.textMuted} dimColor>Press any key to close.</Text>
        </Box>
      </WizardShell>
    );
  }

  if (step === 'error') {
    return (
      <WizardShell title="Registration Failed" steps={STEPS} current={currentStepIdx} error={error}>
        <Box marginTop={1}><Text color={theme.textMuted}>Press Esc to close.</Text></Box>
      </WizardShell>
    );
  }

  if (step === 'push') {
    return (
      <WizardShell title="Register Branch" steps={STEPS} current={1}>
        <Box marginTop={1}>
          <Text color={theme.accent}>Pushing {selectedBranch} to origin…</Text>
        </Box>
      </WizardShell>
    );
  }

  if (step === 'pr-prompt') {
    return (
      <WizardShell title="Register Branch" steps={STEPS} current={2}>
        <Box flexDirection="column" gap={1} marginTop={1}>
          <Text color={theme.success}>✔ {pushResult}</Text>
          <Text color={theme.panel}>{'─'.repeat(50)}</Text>
          <Text color={theme.text} bold>Open a pull request?</Text>
          <Text color={theme.textMuted}>
            Opens GitHub in your browser:{' '}
            <Text color={theme.accent}>{selectedBranch}</Text>
            {' → '}
            <Text color={theme.text}>production</Text>
          </Text>
          <Box gap={3} marginTop={1}>
            <Text color={theme.bg} backgroundColor={theme.accent} bold>{' Y — open browser '}</Text>
            <Text color={theme.textMuted}>N — finish without PR</Text>
          </Box>
        </Box>
        <PRPromptInput onYes={handleOpenPR} onNo={() => setStep('done')} onCancel={onClose} />
      </WizardShell>
    );
  }

  return (
    <WizardShell title="Register Branch" steps={STEPS} current={currentStepIdx}>
      <Box flexDirection="column" gap={1} marginTop={1}>
        {step === 'select' && (
          <>
            <Text color={theme.textMuted}>Select a branch to push to remote:</Text>
            <SelectInput
              options={branchOptions}
              placeholder="type to filter branches"
              onSelect={(v) => { setSelectedBranch(v); setStep('confirm'); }}
              onCancel={onClose}
            />
          </>
        )}

        {step === 'confirm' && (
          <Box flexDirection="column" gap={1}>
            <Box gap={2}>
              <Text color={theme.textMuted}>{'branch'.padEnd(14)}</Text>
              <Text color={theme.accent} bold>{selectedBranch}</Text>
            </Box>
            {parsed.kind === 'dev' && (
              <>
                <Box gap={2}>
                  <Text color={theme.textMuted}>{'type'.padEnd(14)}</Text>
                  <Text color={theme.text}>{parsed.type}</Text>
                </Box>
                <Box gap={2}>
                  <Text color={theme.textMuted}>{'scope'.padEnd(14)}</Text>
                  <Text color={theme.text}>{parsed.scope}</Text>
                </Box>
              </>
            )}
            <Box gap={2}>
              <Text color={theme.textMuted}>{'remote'.padEnd(14)}</Text>
              <Text color={theme.text}>origin/{selectedBranch}</Text>
            </Box>
            <Box gap={3} marginTop={1}>
              {loading ? (
                <Text color={theme.accent}>Pushing…</Text>
              ) : (
                <>
                  <Text color={theme.bg} backgroundColor={theme.accent} bold>{' Enter — push '}</Text>
                  <Text color={theme.textMuted}>Esc — cancel</Text>
                </>
              )}
            </Box>
            {!loading && <ConfirmInput onConfirm={handlePush} onCancel={onClose} />}
          </Box>
        )}
      </Box>
    </WizardShell>
  );
}

function PRPromptInput({ onYes, onNo, onCancel }: { onYes: () => void; onNo: () => void; onCancel: () => void }) {
  useInput((input, key) => {
    if (input.toLowerCase() === 'y') { onYes(); return; }
    if (input.toLowerCase() === 'n') { onNo();  return; }
    if (key.escape)                  { onCancel(); return; }
  });
  return null;
}

function ConfirmInput({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  useInput((_, key) => {
    if (key.return) { onConfirm(); return; }
    if (key.escape) { onCancel();  return; }
  });
  return null;
}