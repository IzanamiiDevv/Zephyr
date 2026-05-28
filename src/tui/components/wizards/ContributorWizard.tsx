import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { WizardShell } from './WizardShell.js';
import { TextInput }   from './TextInput.js';
import { theme }       from '../../theme.js';
import {
  addContributor,
  removeContributor,
  hashPrivateKey,
  type ZephyrConfigData,
} from '../../../git/ZephyrConfig.js';

// ── Create Wizard ─────────────────────────────────────────────────────────────

type CreateStep = 'name' | 'email' | 'github' | 'key' | 'confirm' | 'done' | 'error';

interface CreateProps {
  config:  ZephyrConfigData;
  onSave:  (updated: ZephyrConfigData) => void;
  onClose: () => void;
}

export function CreateContributorWizard({ config, onSave, onClose }: CreateProps) {
  const [step,    setStep]    = useState<CreateStep>('name');
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [github,  setGithub]  = useState('');
  const [privKey, setPrivKey] = useState('');
  const [error,   setError]   = useState<string | null>(null);

  const STEPS = [
    { label: 'Name',    done: step !== 'name' },
    { label: 'Email',   done: ['github','key','confirm','done','error'].includes(step) },
    { label: 'GitHub',  done: ['key','confirm','done','error'].includes(step) },
    { label: 'Key',     done: ['confirm','done','error'].includes(step) },
    { label: 'Confirm', done: ['done','error'].includes(step) },
  ];

  const currentStepIdx =
    step === 'name'     ? 0
    : step === 'email'  ? 1
    : step === 'github' ? 2
    : step === 'key'    ? 3
    : 4;

  useInput((_, key) => { if (key.escape) onClose(); });

  function handleConfirm() {
    if (!name.trim())    { setError('Name is required.');   setStep('error'); return; }
    if (!email.trim())   { setError('Email is required.');  setStep('error'); return; }
    if (!privKey.trim()) { setError('Key is required.');    setStep('error'); return; }

    if (config.contributors.find(c => c.email === email.trim())) {
      setError(`Contributor with email "${email}" already exists.`);
      setStep('error');
      return;
    }

    const updated = addContributor(
      config,
      { name: name.trim(), email: email.trim(), github: github.trim() },
      privKey.trim(),
    );
    onSave(updated);
    setStep('done');
  }

  if (step === 'done') {
    return (
      <WizardShell title="Contributor Added" steps={STEPS} current={4}>
        <Box flexDirection="column" gap={1} marginTop={1}>
          <Text color={theme.success} bold>✔ Contributor created</Text>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'name'.padEnd(12)}</Text>
            <Text color={theme.text}>{name}</Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'email'.padEnd(12)}</Text>
            <Text color={theme.text}>{email}</Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'public key'.padEnd(12)}</Text>
            <Text color={theme.accent}>{hashPrivateKey(privKey).slice(0, 16)}…</Text>
          </Box>
          <Text color={theme.textMuted} dimColor>
            Share the private key with the contributor securely. Press any key to close.
          </Text>
        </Box>
      </WizardShell>
    );
  }

  if (step === 'error') {
    return (
      <WizardShell title="Error" steps={STEPS} current={currentStepIdx} error={error}>
        <Box marginTop={1}>
          <Text color={theme.textMuted}>Press Esc to close.</Text>
        </Box>
      </WizardShell>
    );
  }

  return (
    <WizardShell title="New Contributor" steps={STEPS} current={currentStepIdx} error={error}>
      <Box flexDirection="column" gap={1} marginTop={1}>

        {step === 'name' && (
          <TextInput
            label="Contributor name"
            hint="full name or username"
            value={name}
            onChange={setName}
            onSubmit={() => setStep('email')}
            onCancel={onClose}
            placeholder="e.g. Jane Doe"
          />
        )}

        {step === 'email' && (
          <TextInput
            label="Email address"
            hint="must match their git config email"
            value={email}
            onChange={setEmail}
            onSubmit={() => setStep('github')}
            onCancel={onClose}
            placeholder="e.g. jane@example.com"
          />
        )}

        {step === 'github' && (
          <TextInput
            label="GitHub profile"
            hint="optional — press Enter to skip"
            value={github}
            onChange={setGithub}
            onSubmit={() => setStep('key')}
            onCancel={onClose}
            placeholder="e.g. https://github.com/janedoe"
          />
        )}

        {step === 'key' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.textDim} bold>CREATE PRIVATE KEY</Text>
            <Text color={theme.textMuted} dimColor>
              This is the secret the contributor will type to authenticate.
              Share it with them securely. The stored hash cannot be reversed.
            </Text>
            <MaskedTextInput
              label="Private key"
              onSubmit={(v) => { setPrivKey(v); setStep('confirm'); }}
              onCancel={onClose}
            />
          </Box>
        )}

        {step === 'confirm' && (
          <Box flexDirection="column" gap={1}>
            <Box gap={2}>
              <Text color={theme.textMuted}>{'name'.padEnd(14)}</Text>
              <Text color={theme.text} bold>{name}</Text>
            </Box>
            <Box gap={2}>
              <Text color={theme.textMuted}>{'email'.padEnd(14)}</Text>
              <Text color={theme.text}>{email}</Text>
            </Box>
            <Box gap={2}>
              <Text color={theme.textMuted}>{'github'.padEnd(14)}</Text>
              <Text color={theme.text}>{github || '—'}</Text>
            </Box>
            <Box gap={2}>
              <Text color={theme.textMuted}>{'public key'.padEnd(14)}</Text>
              <Text color={theme.accent}>{hashPrivateKey(privKey).slice(0, 24)}…</Text>
            </Box>
            <Box gap={3} marginTop={1}>
              <Text color={theme.bg} backgroundColor={theme.accent} bold>{' Enter — save '}</Text>
              <Text color={theme.textMuted}>Esc — cancel</Text>
            </Box>
            <ConfirmInput onConfirm={handleConfirm} onCancel={onClose} />
          </Box>
        )}
      </Box>
    </WizardShell>
  );
}

// ── Delete Wizard ─────────────────────────────────────────────────────────────

interface DeleteProps {
  config:  ZephyrConfigData;
  onSave:  (updated: ZephyrConfigData) => void;
  onClose: () => void;
}

export function DeleteContributorWizard({ config, onSave, onClose }: DeleteProps) {
  const [selected, setSelected] = useState(0);
  const [confirm,  setConfirm]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [deleted,  setDeleted]  = useState('');

  const contributors = config.contributors;

  useInput((input, key) => {
    if (key.escape) { if (confirm) { setConfirm(false); return; } onClose(); return; }

    if (done) { if (key.return || key.escape || input) { onClose(); } return; }

    if (!confirm) {
      if (key.upArrow)   { setSelected(i => Math.max(0, i - 1)); return; }
      if (key.downArrow) { setSelected(i => Math.min(contributors.length - 1, i + 1)); return; }
      if (key.return && contributors[selected]) { setConfirm(true); return; }
    } else {
      if (input.toLowerCase() === 'y') {
        const target = contributors[selected];
        if (!target) return;
        setDeleted(target.name);
        onSave(removeContributor(config, target.email));
        setDone(true);
        return;
      }
      if (input.toLowerCase() === 'n') { setConfirm(false); return; }
    }
  });

  if (contributors.length === 0) {
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text color={theme.textMuted}>No contributors to delete.</Text>
        <Text color={theme.textMuted} dimColor>Press Esc to close.</Text>
      </Box>
    );
  }

  if (done) {
    return (
      <Box flexDirection="column" padding={1} gap={1}>
        <Text color={theme.success} bold>✔ Contributor "{deleted}" removed.</Text>
        <Text color={theme.textMuted} dimColor>Press any key to close.</Text>
      </Box>
    );
  }

  const target = contributors[selected];

  return (
    <Box flexDirection="column" gap={1} padding={1}>
      {!confirm ? (
        <>
          <Text color={theme.textDim} bold>SELECT CONTRIBUTOR TO REMOVE</Text>
          <Box flexDirection="column" marginTop={1} gap={0}>
            {contributors.map((c, i) => {
              const isSel = i === selected;
              return (
                <Box key={c.email} gap={2}>
                  {isSel
                    ? <Text color={theme.bg} backgroundColor={theme.danger} bold>
                        {` ▶ ${c.name.padEnd(20)} `}
                      </Text>
                    : <Text color={theme.textMuted}>{'   '}{c.name.padEnd(22)}</Text>
                  }
                  <Text color={isSel ? theme.textDim : theme.textMuted}>{c.email}</Text>
                </Box>
              );
            })}
          </Box>
          <Text color={theme.textMuted} dimColor>↑↓ navigate  Enter select  Esc cancel</Text>
        </>
      ) : (
        <Box flexDirection="column" gap={1}>
          <Text color={theme.danger} bold>⚠ Remove contributor?</Text>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'name'.padEnd(10)}</Text>
            <Text color={theme.text}>{target?.name}</Text>
          </Box>
          <Box gap={2}>
            <Text color={theme.textMuted}>{'email'.padEnd(10)}</Text>
            <Text color={theme.text}>{target?.email}</Text>
          </Box>
          <Text color={theme.textMuted}>
            This will revoke their access immediately.
          </Text>
          <Box gap={3} marginTop={1}>
            <Text color={theme.bg} backgroundColor={theme.danger} bold>{' Y — remove '}</Text>
            <Text color={theme.textMuted}>N / Esc — cancel</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function MaskedTextInput({
  label, onSubmit, onCancel,
}: { label: string; onSubmit: (v: string) => void; onCancel: () => void }) {
  const [raw,  setRaw]  = useState('');
  const [mask, setMask] = useState('');
  const [cur,  setCur]  = useState(true);

  React.useEffect(() => {
    const t = setInterval(() => setCur(v => !v), 530);
    return () => clearInterval(t);
  }, []);

  useInput((input, key) => {
    if (key.escape)                  { onCancel(); return; }
    if (key.return)                  { if (raw.trim()) onSubmit(raw.trim()); return; }
    if (key.backspace || key.delete) {
      setRaw(v => v.slice(0, -1));
      setMask(v => v.slice(0, -1));
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setRaw(v => v + input);
      setMask(v => v + '●');
    }
  });

  return (
    <Box flexDirection="column" gap={0}>
      <Text color={theme.textMuted}>{label}</Text>
      <Box borderStyle="single" borderColor={theme.accent} paddingX={1} marginTop={1}>
        <Text color={theme.accent} bold>{'> '}</Text>
        <Text color={theme.text}>{mask}</Text>
        <Text color={cur ? theme.cursor : theme.bg}>{'█'}</Text>
      </Box>
      <Text color={theme.textMuted} dimColor>Enter to confirm  Esc to cancel</Text>
    </Box>
  );
}

function ConfirmInput({
  onConfirm, onCancel,
}: { onConfirm: () => void; onCancel: () => void }) {
  useInput((_, key) => {
    if (key.return) { onConfirm(); return; }
    if (key.escape) { onCancel();  return; }
  });
  return null;
}