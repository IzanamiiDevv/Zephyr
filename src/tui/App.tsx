import React, { useEffect, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { Header }            from './components/Header.js';
import { NavBar }            from './components/NavBar.js';
import { Footer }            from './components/Footer.js';
import { CommandBar }        from './components/CommandBar.js';
import { HomeScreen }        from './screens/HomeScreen.js';
import { BranchesScreen }    from './screens/BranchesScreen.js';
import { StatusScreen }      from './screens/StatusScreen.js';
import { CommitsScreen }     from './screens/CommitsScreen.js';
import { StagingScreen }     from './screens/StagingScreen.js';
import { TeamScreen }        from './screens/TeamScreen.js';
import { RawGitScreen }      from './screens/RawGitScreen.js';
import { ErrorScreen }       from './screens/ErrorScreen.js';
import { BranchCheckScreen } from './screens/BranchCheckScreen.js';
import { useAppStore }       from './store/appStore.js';
import { bootstrapRepo }     from '../git/RepoBootstrap.js';
import { SafeProdWatcher }   from '../git/SafeProdWatcher.js';
import { NetworkMonitor }    from '../git/NetworkMonitor.js';
import { TeamService }       from '../git/TeamService.js';
import { checkCoreBranches } from '../git/BranchChecker.js';
import { parseBranch }       from '../git/BranchParser.js';

type AppPhase = 'booting' | 'branch-check' | 'ready';

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
    isGitRepo,
  } = useAppStore();

  const [termSize, setTermSize] = useState({
    columns: stdout?.columns ?? 80,
    rows:    stdout?.rows    ?? 24,
  });

  const [phase, setPhase] = useState<AppPhase>('booting');
  const [branchCheckProps, setBranchCheckProps] = useState<{
    missing:  any[];
    isOwner:  boolean;
    repoSlug: string | null;
  } | null>(null);

  // Terminal resize
  useEffect(() => {
    if (!stdout) return;
    const onResize = () => {
      process.stdout.write('\x1B[2J\x1B[H');
      setTermSize({ columns: stdout.columns ?? 80, rows: stdout.rows ?? 24 });
    };
    stdout.on('resize', onResize);
    return () => { stdout.off('resize', onResize); };
  }, [stdout]);

  // Bootstrap
  useEffect(() => {
    let safeProdWatcher: SafeProdWatcher | null = null;
    let networkMonitor:  NetworkMonitor  | null = null;
    let teamService:     TeamService     | null = null;

    async function init() {
      setSafeProdStatus('checking');

      // Network monitor
      networkMonitor = new NetworkMonitor(
        (status) => setNetworkStatus(status),
        15_000,
      );
      networkMonitor.start();

      // Repo bootstrap
      const result = await bootstrapRepo(process.cwd());
      if (!result.ok || !result.git) {
        setRepoError(result.error);
        setSafeProdStatus('error');
        setPhase('ready');
        return;
      }

      setGitService(result.git);
      setRepoContext(result.repoName, result.currentBranch);
      await Promise.all([refreshBranches(), refreshStatus()]);

      // Branch checker
      const check = await checkCoreBranches(result.git);
      if (!check.allPresent) {
        setMissingBranches(check.missing);
        setBranchCheckProps({
          missing:  check.missing,
          isOwner:  check.isOwner,
          repoSlug: check.repoSlug,
        });
        setPhase('branch-check');
      } else {
        setBranchCheckDone(true);
        setPhase('ready');
      }

      // Safe-prod watcher
      safeProdWatcher = new SafeProdWatcher(
        result.git,
        (status) => setSafeProdStatus(status),
        60_000,
      );
      safeProdWatcher.start();

      // Team service
      teamService = new TeamService(result.git);
      await teamService.init();
      teamService.start(
        () => {
          const { currentBranch: cb, localBranches: lb } = useAppStore.getState();
          const parsed   = parseBranch(cb);
          const isRemote = lb.find(b => b.name === cb)?.remote ?? false;
          return {
            branch:  cb,
            type:    parsed.kind === 'dev' ? parsed.type  : '',
            scope:   parsed.kind === 'dev' ? parsed.scope : '',
            name:    parsed.kind === 'dev' ? parsed.name  : cb,
            isRemote,
          };
        },
        (map) => setTeamPresence(map),
        60_000,
      );
    }

    void init();

    return () => {
      safeProdWatcher?.stop();
      networkMonitor?.stop();
      teamService?.stop();
      void teamService?.clearPresence();
    };
  }, []);

  // Global keybinds
  useInput((input, key) => {
    if (input === '/' && !inputActive) {
      setInputActive(true);
      setInputValue('/');
      return;
    }
    if (!inputActive && (input === 'q' || (key.ctrl && input === 'c'))) {
      exit();
    }
  });

  // Boot splash
  if (phase === 'booting') {
    return (
      <Box
        flexDirection="column"
        height={termSize.rows}
        width={termSize.columns}
        justifyContent="center"
        alignItems="center"
        gap={1}
      >
        <Text color="#408A71">Initializing Zephyr…</Text>
        <Text color="#3D7A63" dimColor>Detecting repository and loading data</Text>
      </Box>
    );
  }

  // Branch check interstitial
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

  // Main app
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