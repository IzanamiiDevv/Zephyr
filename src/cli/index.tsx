import React from 'react';
import { render } from 'ink';
import { App } from '../tui/App.js';

// Enter alternate screen buffer manually
process.stdout.write('\x1B[?1049h');
// Move cursor to top-left
process.stdout.write('\x1B[H');
// Clear screen
process.stdout.write('\x1B[2J');
// Hide cursor
process.stdout.write('\x1B[?25l');

const cleanup = () => {
  // Show cursor
  process.stdout.write('\x1B[?25h');
  // Exit alternate screen buffer (restores previous terminal content)
  process.stdout.write('\x1B[?1049l');
};

process.on('exit',   cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM',() => { cleanup(); process.exit(0); });

const { waitUntilExit } = render(<App />, {
  patchConsole: true,
});

waitUntilExit().then(() => {
  cleanup();
  process.exit(0);
});