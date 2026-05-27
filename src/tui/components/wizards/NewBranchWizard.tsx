import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { WizardShell }  from './WizardShell.js';
import { SelectInput }  from './SelectInput.js';
import { TextInput }    from './TextInput.js';
import { theme }        from '../../theme.js';
import { BRANCH_TYPES, type BranchType, buildBranchName } from '../../../git/BranchParser.js';
import { createBranch } from '../../../git/BranchWorkflows.js';
import { useAppStore }  from '../../store/appStore.js';

type Step = 'type' | 'scope' | 'name' | 'source-warn' | 'confirm' | 'done' | 'error';

interface Props {
  onClose: () => void;
  copyOf?: string;
}

const TYPE_OPTIONS = BRANCH_TYPES.map(t => ({
  value: t,
  label: t,
  hint:
    t === 'feat'      ? 'A new feature'
    : t === 'fix'     ? 'A bug fix'
    : t === 'refactor'? 'Code restructure'
    : t === 'docs'    ? 'Documentation only'
    : t === 'style'   ? 'Formatting, no logic'
    : 'Build, tooling, deps',
}));

export function NewBranchWizard({ onClose, copyOf }: Props) {
  const { gitService, setRepoContext, refreshBranches, setFooterMessage } = useAppStore();

  const [step,    setStep]    = useState<Step>('type');
  const [type,    setType]    = useState<BranchType>('feat');
  const [scope,   setScope]   = useState('');
  const [name,    setName]    = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<string | null>(null);

  const sourceBranch  = copyOf ?? 'safe-production';
  const needsApproval = sourceBranch !== 'safe-production' && !sourceBranch.startsWith('production/');

  const previewName = type && scope && name
    ? buildBranchName(type, scope, name, copyOf)
    : null;

  const STEPS = [
    { label: 'Type',    done: step !== 'type' },
    { label: 'Scope',   done: ['name','source-warn','confirm','done','error'].includes(step) },
    { label: 'Name',    done: ['source-warn','confirm','done','error'].includes(step) },
    { label: 'Confirm', done: ['done','error'].includes(step) },
  ];

  const currentStepIndex =
    step === 'type'        ? 0
    : step === 'scope'     ? 1
    : step === 'name'      ? 2
    : 3;

  useInput((_, key) => { if (key.escape) onClose(); });

  async function handleConfirm() {
    if (!gitService) return;
    setLoading(true);
    setError(null);

    const res = await createBranch(gitService, {
      type, scope, name,
      sourceBranch,
      approved: true,
      copyOf,
    });

    setLoading(false);

    if (!res.ok) {
      setError(res.message);
      setStep('error');
      return;
    }

    if (res.branch) {
      const info = await gitService.getRepoInfo();
      setRepoContext(info.name, res.branch);
    }
    await refreshBranches();
    setResult(res.branch ?? null);
    setStep('done');
    setFooterMessage(`✔ Created branch: ${res.branch}`);
    setTimeout(() => setFooterMessage(null), 5000);
  }

  if (step === 'done') {
    return (
      <WizardShell title={copyOf ? 'Sub-Branch Created' : 'Branch Created'} steps={STEPS} current={3}>
        <Box flexDirection="column" gap={1} marginTop={1}>
          <Text color={theme.success} bold>✔ Branch ready</Text>
          <Box gap={2}>
            <Text color={theme.textMuted}>branch</Text>
            <Text color={theme.accent} bold>{result}</Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>prefix</Text>
            <Text color={theme.text}>{type}({scope}):</Text>
          </Box>
          <Text color={theme.textMuted} dimColor>You are now on this branch. Press any key to close.</Text>
        </Box>
      </WizardShell>
    );
  }

  if (step === 'error') {
    return (
      <WizardShell title="Branch Creation Failed" steps={STEPS} current={currentStepIndex} error={error}>
        <Box marginTop={1}>
          <Text color={theme.textMuted}>Press Esc to close.</Text>
        </Box>
      </WizardShell>
    );
  }

  return (
    <WizardShell
      title={copyOf ? `Sub-branch of: ${copyOf}` : 'New Branch'}
      steps={STEPS}
      current={currentStepIndex}
      error={error}
      warning={warning}
    >
      <Box flexDirection="column" gap={1} marginTop={1}>
        <Box gap={2}>
          <Text color={theme.textMuted}>from</Text>
          <Text color={sourceBranch === 'safe-production' ? theme.success : theme.warn} bold>
            {sourceBranch}
          </Text>
        </Box>

        {previewName && (
          <Box gap={2}>
            <Text color={theme.textMuted}>preview</Text>
            <Text color={theme.accent}>{previewName}</Text>
          </Box>
        )}

        <Text color={theme.panel}>{'─'.repeat(50)}</Text>

        {step === 'type' && (
          <SelectInput
            options={TYPE_OPTIONS}
            placeholder="select branch type"
            onSelect={(v) => { setType(v as BranchType); setStep('scope'); }}
            onCancel={onClose}
          />
        )}

        {step === 'scope' && (
          <TextInput
            label="Scope"
            hint="area of code this affects e.g. auth, ui, api"
            value={scope}
            onChange={setScope}
            onSubmit={() => setStep('name')}
            onCancel={onClose}
            placeholder="e.g. auth"
          />
        )}

        {step === 'name' && (
          <TextInput
            label="Branch name"
            hint="short description of the work"
            value={name}
            onChange={setName}
            onSubmit={() => {
              if (needsApproval) {
                setWarning(`Branching from "${sourceBranch}" instead of safe-production. Confirm to proceed.`);
                setStep('source-warn');
              } else {
                setStep('confirm');
              }
            }}
            onCancel={onClose}
            placeholder="e.g. login-page"
          />
        )}

        {step === 'source-warn' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.warn} bold>⚠ Non-standard source branch</Text>
            <Text color={theme.textMuted}>
              Branching from <Text color={theme.warn}>{sourceBranch}</Text> instead of{' '}
              <Text color={theme.success}>safe-production</Text>. Are you sure?
            </Text>
            <Box gap={3} marginTop={1}>
              <Text color={theme.bg} backgroundColor={theme.accent} bold>{' Y — proceed '}</Text>
              <Text color={theme.textMuted}>N / Esc — cancel</Text>
            </Box>
            <ApprovalInput
              onApprove={() => { setWarning(null); setStep('confirm'); }}
              onCancel={onClose}
            />
          </Box>
        )}

        {step === 'confirm' && previewName && (
          <Box flexDirection="column" gap={1}>
            <Box gap={2}>
              <Text color={theme.textMuted}>{'branch'.padEnd(14)}</Text>
              <Text color={theme.accent} bold>{previewName}</Text>
            </Box>
            <Box gap={2}>
              <Text color={theme.textMuted}>{'from'.padEnd(14)}</Text>
              <Text color={theme.text}>{sourceBranch}</Text>
            </Box>
            <Box gap={2}>
              <Text color={theme.textMuted}>{'commit prefix'.padEnd(14)}</Text>
              <Text color={theme.text}>{type}({scope}):</Text>
            </Box>
            <Box gap={3} marginTop={1}>
              {loading ? (
                <Text color={theme.accent}>Creating branch…</Text>
              ) : (
                <>
                  <Text color={theme.bg} backgroundColor={theme.accent} bold>{' Enter — create '}</Text>
                  <Text color={theme.textMuted}>Esc — cancel</Text>
                </>
              )}
            </Box>
            {!loading && <ConfirmInput onConfirm={handleConfirm} onCancel={onClose} />}
          </Box>
        )}
      </Box>
    </WizardShell>
  );
}

function ApprovalInput({ onApprove, onCancel }: { onApprove: () => void; onCancel: () => void }) {
  useInput((input, key) => {
    if (input.toLowerCase() === 'y') { onApprove(); return; }
    if (input.toLowerCase() === 'n' || key.escape) { onCancel(); return; }
  });
  return null;
}

function ConfirmInput({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  useInput((_, key) => {
    if (key.return) { onConfirm(); return; }
    if (key.escape) { onCancel(); return; }
  });
  return null;
}   