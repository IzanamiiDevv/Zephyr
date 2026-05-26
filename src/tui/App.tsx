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
import { useAppStore }    from './store/appStore.js';

function ScreenRouter() {
  const { activeScreen } = useAppStore();
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
  const { inputActive, setInputActive, setInputValue, setSafeProdStatus } = useAppStore();

  const [termSize, setTermSize] = useState({
    columns: stdout?.columns ?? 80,
    rows:    stdout?.rows    ?? 24,
  });

  useEffect(() => {
    if (!stdout) return;

    const onResize = () => {
      // Clear alt screen buffer before Ink repaints
      process.stdout.write('\x1B[2J\x1B[H');
      setTermSize({
        columns: stdout.columns ?? 80,
        rows:    stdout.rows    ?? 24,
      });
    };

    stdout.on('resize', onResize);
    return () => { stdout.off('resize', onResize); };
  }, [stdout]);

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

  useEffect(() => {
    setSafeProdStatus('checking');
    const t = setTimeout(() => setSafeProdStatus('synced'), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <Box
      flexDirection="column"
      height={termSize.rows}
      width={termSize.columns}
    >
      <Header     termWidth={termSize.columns} />
      <NavBar     termWidth={termSize.columns} />
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        <ScreenRouter />
      </Box>
      <CommandBar termWidth={termSize.columns} />
      <Footer     termWidth={termSize.columns} />
    </Box>
  );
}