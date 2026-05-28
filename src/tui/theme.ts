export const theme = {
  bg:           '#091413',
  panel:        '#285A48',
  accent:       '#408A71',
  text:         '#B0E4CC',
  textDim:      '#6BAF96',
  textMuted:    '#3D7A63',
  border:       '#285A48',
  borderBright: '#408A71',
  danger:       '#E05C5C',
  warn:         '#E0B45C',
  success:      '#B0E4CC',
  cursor:       '#408A71',
} as const;

export type ThemeKey = keyof typeof theme;

export type ScreenId =
  | 'home'
  | 'branches'
  | 'status'
  | 'commits'
  | 'staging'
  | 'team'
  | 'rawgit'
  | 'config';

export const SCREENS: { id: ScreenId; label: string; cmd: string }[] = [
  { id: 'home',     label: 'Home',     cmd: '/home'     },
  { id: 'branches', label: 'Branches', cmd: '/branches' },
  { id: 'status',   label: 'Status',   cmd: '/status'   },
  { id: 'commits',  label: 'Commits',  cmd: '/commits'  },
  { id: 'staging',  label: 'Staging',  cmd: '/staging'  },
  { id: 'team',     label: 'Team',     cmd: '/team'     },
  { id: 'rawgit',   label: 'Raw Git',  cmd: '/git'      },
  { id: 'config',   label: 'Config',   cmd: '/config'   },
];

export const COMMANDS = SCREENS.map(s => s.cmd).concat([
  '/help',
  '/clear',
  '/quit',
]);