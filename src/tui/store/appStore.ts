import { create } from 'zustand';
import type { ScreenId } from '../theme.js';

export type SafeProdStatus = 'synced' | 'behind' | 'checking' | 'error';

export interface AppState {
  activeScreen: ScreenId;
  setScreen: (s: ScreenId) => void;

  inputActive: boolean;
  inputValue: string;
  setInputActive: (v: boolean) => void;
  setInputValue: (v: string) => void;

  safeProdStatus: SafeProdStatus;
  safeProdLastCheck: string;
  setSafeProdStatus: (s: SafeProdStatus) => void;

  repoName: string;
  currentBranch: string;
  setRepoContext: (name: string, branch: string) => void;

  footerMessage: string | null;
  setFooterMessage: (msg: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeScreen: 'home',
  setScreen: (s) => set({ activeScreen: s }),

  inputActive: false,
  inputValue: '',
  setInputActive: (v) => set({ inputActive: v, inputValue: '' }),
  setInputValue: (v) => set({ inputValue: v }),

  safeProdStatus: 'checking',
  safeProdLastCheck: '--:--',
  setSafeProdStatus: (s) =>
    set({
      safeProdStatus: s,
      safeProdLastCheck: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    }),

  repoName: 'zephyr',
  currentBranch: 'safe-production',
  setRepoContext: (name, branch) => set({ repoName: name, currentBranch: branch }),

  footerMessage: null,
  setFooterMessage: (msg) => set({ footerMessage: msg }),
}));