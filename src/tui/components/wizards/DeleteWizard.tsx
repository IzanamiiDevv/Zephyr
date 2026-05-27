import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { WizardShell }  from './WizardShell.js';
import { SelectInput }  from './SelectInput.js';
import { theme }        from '../../theme.js';
import { useAppStore }  from '../../store/appStore.js';
import { deleteBranch } from '../../../git/BranchWorkflows.js';

type Step = 'select' | 'confirm' | 'force-warn' | 'done' | 'error';

interface Props { onClose: () => void; }

const PROTECTED = ['main', 'production', 'safe-production'];

export function DeleteWizard({ onClose }: Props) {
  const {
    gitService, localBranches, currentBranch,
    refreshBranches, setRepoContext, setFooterMessage,
  } = useAppStore();

  const [step,       setStep]       = useState<Step>('select');
  const [target,     setTarget]     = useState('');
  const [delRemote,  setDelRemote]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);

  const STEPS = [
    { label: 'Select',  done: step !== 'select' },
    { label: 'Confirm', done: ['force-warn','done','error'].includes(step) },
    { label: 'Delete',  done: ['done','error'].includes(step) },
  ];

  const currentStepIdx =
    step === 'select'       ? 0
    : step === 'confirm'    ? 1
    : step === 'force-warn' ? 1
    : 2;

  useInput((_, key) => { if (key.escape) onClose(); });

  const branchOptions = localBranches
    .filter(b => !PROTECTED.includes(b.name))
    .map(b => ({
      value: b.name,
      label: b.name,
      hint:  b.name === currentBranch ? '← current' : '',
    }));

  async function attemptDelete(force: boolean) {
    if (!gitService) return;
    setLoading(true);
    setError(null);

    const res = await deleteBranch(gitService, {
      branch: target, force, deleteRemote: delRemote,
    });

    setLoading(false);

    if (!res.ok) {
      if (res.message.includes('not fully merged')) {
        setStep('force-warn');
        return;
      }
      setError(res.message);
      setStep('error');
      return;
    }

    await refreshBranches();

    if (target === currentBranch) {
      const info = await gitService.getRepoInfo();
      setRepoContext(info.name, info.currentBranch);
    }

    setFooterMessage(`✔ Deleted branch: ${target}`);
    setTimeout(() => setFooterMessage(null), 4000);
    setStep('done');
  }

  if (step === 'done') {
    return (
      <WizardShell title="Branch Deleted" steps={STEPS} current={2}>
        <Box flexDirection="column" gap={1} marginTop={1}>
          <Text color={theme.success} bold>✔ Branch deleted</Text>
          <Text color={theme.textMuted}>{target}</Text>
          <Text color={theme.textMuted} dimColor>Press any key to close.</Text>
        </Box>
      </WizardShell>
    );
  }

  if (step === 'error') {
    return (
      <WizardShell title="Delete Failed" steps={STEPS} current={currentStepIdx} error={error}>
        <Box marginTop={1}><Text color={theme.textMuted}>Press Esc to close.</Text></Box>
      </WizardShell>
    );
  }

  if (step === 'force-warn') {
    return (
      <WizardShell
        title="Branch Not Fully Merged"
        steps={STEPS}
        current={1}
        warning={`"${target}" has unmerged commits. Force-delete will permanently lose this work.`}
      >
        <Box flexDirection="column" gap={1} marginTop={1}>
          <Text color={theme.danger} bold>⚠ This branch has unmerged commits.</Text>
          <Text color={theme.textMuted}>
            Force-deleting will permanently discard any unmerged work.
          </Text>
          <Box gap={3} marginTop={1}>
            <Text color={theme.bg} backgroundColor={theme.danger} bold>{' Y — force delete '}</Text>
            <Text color={theme.textMuted}>N / Esc — cancel</Text>
          </Box>
        </Box>
        <YNInput onYes={() => attemptDelete(true)} onNo={onClose} onCancel={onClose} />
      </WizardShell>
    );
  }

  return (
    <WizardShell title="Delete Branch" steps={STEPS} current={currentStepIdx}>
      <Box flexDirection="column" gap={1} marginTop={1}>
        {step === 'select' && (
          <>
            <Text color={theme.textMuted}>Select a branch to delete:</Text>
            {branchOptions.length === 0 ? (
              <Text color={theme.textMuted} dimColor>No deletable branches found.</Text>
            ) : (
              <SelectInput
                options={branchOptions}
                placeholder="type to filter branches"
                onSelect={(v) => { setTarget(v); setStep('confirm'); }}
                onCancel={onClose}
              />
            )}
          </>
        )}

        {step === 'confirm' && (
          <Box flexDirection="column" gap={1}>
            <Box gap={2}>
              <Text color={theme.textMuted}>{'branch'.padEnd(16)}</Text>
              <Text color={theme.danger} bold>{target}</Text>
            </Box>
            <Box gap={2} marginTop={1}>
              <Text color={theme.textMuted}>{'delete remote'.padEnd(16)}</Text>
              <Text color={delRemote ? theme.danger : theme.textMuted} bold>
                {delRemote ? 'YES' : 'no'}
              </Text>
              <Text color={theme.textMuted} dimColor>(T to toggle)</Text>
            </Box>
            <Box gap={3} marginTop={1}>
              {loading ? (
                <Text color={theme.accent}>Deleting…</Text>
              ) : (
                <>
                  <Text color={theme.bg} backgroundColor={theme.danger} bold>{' Enter — delete '}</Text>
                  <Text color={theme.textMuted}>T toggle remote  Esc cancel</Text>
                </>
              )}
            </Box>
            {!loading && (
              <DeleteConfirmInput
                onConfirm={() => attemptDelete(false)}
                onToggle={() => setDelRemote(v => !v)}
                onCancel={onClose}
              />
            )}
          </Box>
        )}
      </Box>
    </WizardShell>
  );
}

function YNInput({ onYes, onNo, onCancel }: { onYes: () => void; onNo: () => void; onCancel: () => void }) {
  useInput((input, key) => {
    if (input.toLowerCase() === 'y') { onYes(); return; }
    if (input.toLowerCase() === 'n') { onNo();  return; }
    if (key.escape)                  { onCancel(); return; }
  });
  return null;
}

function DeleteConfirmInput({ onConfirm, onToggle, onCancel }: {
  onConfirm: () => void; onToggle: () => void; onCancel: () => void;
}) {
  useInput((input, key) => {
    if (key.return)                  { onConfirm(); return; }
    if (input.toLowerCase() === 't') { onToggle();  return; }
    if (key.escape)                  { onCancel();  return; }
  });
  return null;
}