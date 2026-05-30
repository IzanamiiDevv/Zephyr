import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { Header }              from './components/Header.js';
import { NavBar }              from './components/NavBar.js';
import { Footer }              from './components/Footer.js';
import { CommandBar }          from './components/CommandBar.js';
import { HomeScreen }          from './screens/HomeScreen.js';
import { BranchesScreen }      from './screens/BranchesScreen.js';
import { StatusScreen }        from './screens/StatusScreen.js';
import { CommitsScreen }       from './screens/CommitsScreen.js';
import { StagingScreen }       from './screens/StagingScreen.js';
import { TeamScreen }          from './screens/TeamScreen.js';
import { RawGitScreen }        from './screens/RawGitScreen.js';
import { ConfigurationScreen } from './screens/ConfigurationScreen.js';
import { ErrorScreen }         from './screens/ErrorScreen.js';
import { BranchCheckScreen }   from './screens/BranchCheckScreen.js';
import { LockedScreen }        from './screens/LockedScreen.js';
import { KeyEntryScreen }      from './screens/KeyEntryScreen.js';
import { AccountSelectScreen } from './screens/AccountSelectScreen.js';
import { InitScreen }          from './screens/InitScreen.js';
import { useAppStore }         from './store/appStore.js';
import { bootstrapRepo }       from '../git/RepoBootstrap.js';
import { SafeProdWatcher }     from '../git/SafeProdWatcher.js';
import { NetworkMonitor }      from '../git/NetworkMonitor.js';
import { TeamService }         from '../git/TeamService.js';
import { checkCoreBranches }   from '../git/BranchChecker.js';
import { parseBranch }         from '../git/BranchParser.js';
import {
  detectGitAccounts,
  applyAccountToRepo,
  type GitAccount,
} from '../git/AccountDetector.js';
import {
  configExists,
  isOwner as checkIsOwner,
  requiresKeyAuth,
} from '../git/ZephyrConfig.js';
import { readConfig, writeConfig } from '../git/ZephyrConfig.js';

// ── Boot phases ────────────────────────────────────────────────────────────
type AppPhase =
  | 'booting'
  | 'account-select'   // multiple git accounts
  | 'init'             // no zephyr.json + user is owner
  | 'not-initialized'  // no zephyr.json + user is NOT owner → LockedScreen
  | 'locked'           // zephyr.json lock: true
  | 'key-entry'        // contributors defined
  | 'branch-check'     // missing core branches
  | 'ready';

function ScreenRouter() {
  const { activeScreen, isGitRepo } = useAppStore();
  if (!isGitRepo) return <ErrorScreen />;
  switch (activeScreen) {
    case 'home':     return <HomeScreen />;
    case 'branches': return <BranchesScreen />;
    case 'status':   return <StatusScreen />;
    case 'commits':  return <CommitsScreen />;
    case 'staging':  return <StagingScreen />;
    case 'team':     return <TeamScreen />;
    case 'rawgit':   return <RawGitScreen />;
    case 'config':   return <ConfigurationScreen />;
    default:         return <HomeScreen />;
  }
}

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const {
    inputActive, setInputActive, setInputValue,
    setSafeProdStatus, setRepoContext, setGitService,
    setRepoError, refreshBranches, refreshStatus,
    setNetworkStatus, setTeamPresence,
    setMissingBranches, setBranchCheckDone,
    setZephyrConfig, setUserIdentity,
    setFirstCommitAuthor, setIsFirstRun,
    isGitRepo, zephyrConfig, userEmail, isOwner,
  } = useAppStore();

  const [termSize, setTermSize] = useState({
    columns: stdout?.columns ?? 80,
    rows:    stdout?.rows    ?? 24,
  });
  const [phase,            setPhase]            = useState<AppPhase>('booting');
  const [accounts,         setAccounts]         = useState<GitAccount[]>([]);
  const [branchCheckProps, setBranchCheckProps] = useState<{
    missing: any[]; isOwner: boolean; repoSlug: string | null;
  } | null>(null);

  const continueInitRef = useRef<((account: GitAccount | null) => Promise<void>) | null>(null);

  // ── Resize ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!stdout) return;
    const onResize = () => {
      process.stdout.write('\x1B[2J\x1B[H');
      setTermSize({ columns: stdout.columns ?? 80, rows: stdout.rows ?? 24 });
    };
    stdout.on('resize', onResize);
    return () => { stdout.off('resize', onResize); };
  }, [stdout]);

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    let safeProdWatcher: SafeProdWatcher | null = null;
    let networkMonitor:  NetworkMonitor  | null = null;
    let teamService:     TeamService     | null = null;
    const cwd = process.cwd();

    async function continueInit(account: GitAccount | null) {
      if (account) applyAccountToRepo(cwd, account);

      // ── 1. Bootstrap repo ──────────────────────────────────────────
      const result = await bootstrapRepo(cwd);
      if (!result.ok || !result.git) {
        setRepoError(result.error);
        setSafeProdStatus('error');
        setPhase('ready');
        return;
      }

      setGitService(result.git);
      setRepoContext(result.repoName, result.currentBranch);
      setFirstCommitAuthor(result.firstCommitAuthor);

      // ── 2. Resolve git identity ────────────────────────────────────
      let gitName  = '';
      let gitEmail = '';
      try {
        gitName  = (await (result.git as any).git.raw(['config', 'user.name'])).trim();
        gitEmail = (await (result.git as any).git.raw(['config', 'user.email'])).trim();
      } catch { /* ignore */ }

      const finalName  = gitName  || account?.name  || '';
      const finalEmail = gitEmail || account?.email || '';

      // ── 3. Check zephyr.json exists ────────────────────────────────
      const hasConfig = configExists(cwd);

      if (!hasConfig) {
        // No zephyr.json yet
        // Owner = first commit author
        const owner = result.firstCommitAuthor
          ? result.firstCommitAuthor.toLowerCase() === finalName.toLowerCase()
          : false;

        setUserIdentity(finalName, finalEmail, owner);

        if (owner) {
          // Owner sees InitScreen
          setIsFirstRun(true);
          setPhase('init');
        } else {
          // Non-owner sees locked screen
          setPhase('not-initialized');
        }
        return;
      }

      // ── 4. Load zephyr config ──────────────────────────────────────
      const config = readConfig(cwd);
      setZephyrConfig(config);

      const owner = checkIsOwner(config, finalName, result.firstCommitAuthor);
      setUserIdentity(finalName, finalEmail, owner);

      // ── 5. Lock check ──────────────────────────────────────────────
      if (config.lock && !owner) { setPhase('locked'); return; }

      // ── 6. Key auth check ──────────────────────────────────────────
      if (requiresKeyAuth(config, finalName, result.firstCommitAuthor)) {
        await Promise.all([refreshBranches(), refreshStatus()]);
        setPhase('key-entry');
        return;
      }

      // ── 7. Load data ───────────────────────────────────────────────
      await Promise.all([refreshBranches(), refreshStatus()]);

      // ── 8. Branch checker ──────────────────────────────────────────
      const check = await checkCoreBranches(result.git);
      if (!check.allPresent) {
        setMissingBranches(check.missing);
        setBranchCheckProps({
          missing:  check.missing,
          isOwner:  owner,
          repoSlug: check.repoSlug,
        });
        setPhase('branch-check');
      } else {
        setBranchCheckDone(true);
        setPhase('ready');
      }

      // ── 9. Background services ─────────────────────────────────────
      safeProdWatcher = new SafeProdWatcher(
        result.git, s => setSafeProdStatus(s), 60_000,
      );
      safeProdWatcher.start();

      teamService = new TeamService(result.git);
      await teamService.init();
      teamService.start(
        () => {
          const { currentBranch: cb, localBranches: lb } = useAppStore.getState();
          const parsed   = parseBranch(cb);
          const isRemote = lb.find(b => b.name === cb)?.remote ?? false;
          return {
            branch: cb,
            type:   parsed.kind === 'dev' ? parsed.type  : '',
            scope:  parsed.kind === 'dev' ? parsed.scope : '',
            name:   parsed.kind === 'dev' ? parsed.name  : cb,
            isRemote,
          };
        },
        map => setTeamPresence(map),
        60_000,
      );
    }

    continueInitRef.current = continueInit;

    async function init() {
      setSafeProdStatus('checking');
      networkMonitor = new NetworkMonitor(s => setNetworkStatus(s), 15_000);
      networkMonitor.start();

      const detectedAccounts = await detectGitAccounts(process.cwd());
      if (detectedAccounts.length > 1) {
        setAccounts(detectedAccounts);
        setPhase('account-select');
        return;
      }

      await continueInit(detectedAccounts[0] ?? null);
    }

    void init();

    return () => {
      safeProdWatcher?.stop();
      networkMonitor?.stop();
      teamService?.stop();
      void teamService?.clearPresence();
    };
  }, []);

  // After init screen completes, re-run from step 4
  async function afterInit() {
    setIsFirstRun(false);
    const cwd    = process.cwd();
    const config = readConfig(cwd);
    setZephyrConfig(config);
    await Promise.all([refreshBranches(), refreshStatus()]);
    setBranchCheckDone(true);
    setPhase('ready');
  }

  // ── Global keybinds ──────────────────────────────────────────────────────
  useInput((input, key) => {
    if (phase === 'locked' || phase === 'not-initialized') return;
    if (input === '/' && !inputActive) {
      setInputActive(true);
      setInputValue('/');
      return;
    }
    if (!inputActive && (input === 'q' || (key.ctrl && input === 'c'))) {
      exit();
    }
  });

  // ── Booting ────────────────────────────────────────────────────────────
  if (phase === 'booting') {
    return (
      <Box flexDirection="column" height={termSize.rows} width={termSize.columns}
        justifyContent="center" alignItems="center" gap={1}>
        <Text color="#408A71" bold>Initializing Zephyr…</Text>
        <Text color="#3D7A63" dimColor>Detecting repository and identity</Text>
      </Box>
    );
  }

  // ── Account select ─────────────────────────────────────────────────────
  if (phase === 'account-select') {
    return (
      <Box flexDirection="column" height={termSize.rows} width={termSize.columns}>
        <Header termWidth={termSize.columns} />
        <Box flexGrow={1} flexDirection="column" overflow="hidden">
          <AccountSelectScreen
            accounts={accounts}
            onSelect={(acc) => { void continueInitRef.current?.(acc); }}
          />
        </Box>
        <Footer termWidth={termSize.columns} />
      </Box>
    );
  }

  // ── First run — owner init ─────────────────────────────────────────────
  if (phase === 'init') {
    return (
      <Box flexDirection="column" height={termSize.rows} width={termSize.columns}>
        <Header termWidth={termSize.columns} />
        <Box flexGrow={1} flexDirection="column" overflow="hidden">
          <InitScreen onDone={afterInit} />
        </Box>
        <Footer termWidth={termSize.columns} />
      </Box>
    );
  }

  // ── Not initialized — non-owner locked ────────────────────────────────
  if (phase === 'not-initialized') {
    return (
      <Box flexDirection="column" height={termSize.rows} width={termSize.columns}>
        <Header termWidth={termSize.columns} />
        <Box flexGrow={1} flexDirection="column" overflow="hidden" justifyContent="center">
          <LockedScreen
            reason="This repository has not been initialized with Zephyr yet."
            hint="Contact the repository owner to initialize Zephyr."
            onUnlock={() => {}} // non-owner cannot unlock
          />
        </Box>
        <Footer termWidth={termSize.columns} />
      </Box>
    );
  }

  // ── Locked ────────────────────────────────────────────────────────────
  if (phase === 'locked') {
    return (
      <Box flexDirection="column" height={termSize.rows} width={termSize.columns}>
        <Header termWidth={termSize.columns} />
        <Box flexGrow={1} flexDirection="column" overflow="hidden" justifyContent="center">
          <LockedScreen
            reason="This repository has been locked by the owner."
            hint="Contact the repository owner to unlock."
            onUnlock={() => setPhase('ready')}
          />
        </Box>
        <Footer termWidth={termSize.columns} />
      </Box>
    );
  }

  // ── Key entry ─────────────────────────────────────────────────────────
  if (phase === 'key-entry') {
    return (
      <Box flexDirection="column" height={termSize.rows} width={termSize.columns}>
        <Header termWidth={termSize.columns} />
        <Box flexGrow={1} flexDirection="column" overflow="hidden">
          <KeyEntryScreen
            config={zephyrConfig}
            userEmail={userEmail}
            onSuccess={() => setPhase('ready')}
            onExit={() => exit()}
          />
        </Box>
        <Footer termWidth={termSize.columns} />
      </Box>
    );
  }

  // ── Branch check ──────────────────────────────────────────────────────
  if (phase === 'branch-check' && branchCheckProps) {
    return (
      <Box flexDirection="column" height={termSize.rows} width={termSize.columns}>
        <Header termWidth={termSize.columns} />
        <Box flexGrow={1} flexDirection="column" overflow="hidden">
          <BranchCheckScreen
            missing={branchCheckProps.missing}
            isOwner={branchCheckProps.isOwner}
            repoSlug={branchCheckProps.repoSlug}
            onDone={() => { setBranchCheckDone(true); setPhase('ready'); }}
          />
        </Box>
        <Footer termWidth={termSize.columns} />
      </Box>
    );
  }

  // ── Ready ─────────────────────────────────────────────────────────────
  return (
    <Box flexDirection="column" height={termSize.rows} width={termSize.columns}>
      <Header     termWidth={termSize.columns} />
      {isGitRepo && <NavBar termWidth={termSize.columns} />}
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        <ScreenRouter />
      </Box>
      <CommandBar termWidth={termSize.columns} />
      <Footer     termWidth={termSize.columns} />
    </Box>
  );
}