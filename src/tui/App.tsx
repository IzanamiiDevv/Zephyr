import React, { useEffect, useState } from 'react';
import { Box, useApp, useInput, useStdout } from 'ink';
import { Header }         from './components/Header.js';
import { NavBar }         from './components/NavBar.js';
import { Footer }         from './components/Footer.js';
import { CommandBar }     from './components/CommandBar.js';
import { HomeScreen }     from './screens/HomeScreen.js';
import { BranchesScreen } from './screens/BranchesScreen.js';
import { StatusScreen }   from './screens/StatusScreen.js';
import { CommitsScreen }  from './screens/CommitsScreen.js';
import { RawGitScreen }   from './screens/RawGitScreen.js';
import { ErrorScreen }    from './screens/ErrorScreen.js';
import { useAppStore }    from './store/appStore.js';
import { bootstrapRepo }  from '../git/RepoBootstrap.js';
import { SafeProdWatcher } from '../git/SafeProdWatcher.js';

function ScreenRouter() {
  const { activeScreen, isGitRepo } = useAppStore();

  if (!isGitRepo) return <ErrorScreen />;

  switch (activeScreen) {
    case 'home':     return <HomeScreen />;
    case 'branches': return <BranchesScreen />;
    case 'status':   return <StatusScreen />;
    case 'commits':  return <CommitsScreen />;
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
    isGitRepo,
  } = useAppStore();

  const [termSize, setTermSize] = useState({
    columns: stdout?.columns ?? 80,
    rows:    stdout?.rows    ?? 24,
  });

  useEffect(() => {
    if (!stdout) return;
    const onResize = () => {
      process.stdout.write('\x1B[2J\x1B[H');
      setTermSize({
        columns: stdout.columns ?? 80,
        rows:    stdout.rows    ?? 24,
      });
    };
    stdout.on('resize', onResize);
    return () => { stdout.off('resize', onResize); };
  }, [stdout]);

  useEffect(() => {
    let watcher: SafeProdWatcher | null = null;

    async function init() {
      setSafeProdStatus('checking');
      const result = await bootstrapRepo(process.cwd());

      if (!result.ok || !result.git) {
        setRepoError(result.error);
        setSafeProdStatus('error');
        return;
      }

      setGitService(result.git);
      setRepoContext(result.repoName, result.currentBranch);

      await Promise.all([
        refreshBranches(),
        refreshStatus(),
      ]);

      watcher = new SafeProdWatcher(
        result.git,
        (status) => setSafeProdStatus(status),
        60_000,
      );
      watcher.start();
    }

    void init();

    return () => { watcher?.stop(); };
  }, []);

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