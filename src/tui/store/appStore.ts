import { create } from 'zustand';
import type { ScreenId } from '../theme.js';
import type { GitService } from '../../git/GitService.js';
import type { BranchInfo } from '../../git/GitService.js';

export type SafeProdStatus = 'synced' | 'behind' | 'checking' | 'error';

export interface BranchStatus {
  branch:        string;
  ahead:         number;
  behind:        number;
  conflictRisk:  boolean;
  lastCommit:    string;
  lastAuthor:    string;
  lastDate:      string;
  isDirty:       boolean;
  stagedCount:   number;
  unstagedCount: number;
}

export interface AppState {
  activeScreen: ScreenId;
  setScreen: (s: ScreenId) => void;

  inputActive:    boolean;
  inputValue:     string;
  setInputActive: (v: boolean) => void;
  setInputValue:  (v: string) => void;

  safeProdStatus:    SafeProdStatus;
  safeProdLastCheck: string;
  setSafeProdStatus: (s: SafeProdStatus) => void;

  isGitRepo:      boolean;
  repoError:      string | null;
  repoName:       string;
  currentBranch:  string;
  gitService:     GitService | null;
  setRepoContext: (name: string, branch: string) => void;
  setGitService:  (git: GitService | null) => void;
  setRepoError:   (err: string | null) => void;

  localBranches:    BranchInfo[];
  setLocalBranches: (branches: BranchInfo[]) => void;
  refreshBranches:  () => Promise<void>;

  branchStatus:    BranchStatus | null;
  statusLoading:   boolean;
  setBranchStatus: (s: BranchStatus | null) => void;
  setStatusLoading:(v: boolean) => void;
  refreshStatus:   () => Promise<void>;

  footerMessage:    string | null;
  setFooterMessage: (msg: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeScreen: 'home',
  setScreen: (s) => set({ activeScreen: s }),

  inputActive:    false,
  inputValue:     '',
  setInputActive: (v) => set({ inputActive: v, inputValue: '' }),
  setInputValue:  (v) => set({ inputValue: v }),

  safeProdStatus:    'checking',
  safeProdLastCheck: '--:--',
  setSafeProdStatus: (s) =>
    set({
      safeProdStatus: s,
      safeProdLastCheck: new Date().toLocaleTimeString('en-US', {
        hour:   '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    }),

  isGitRepo:     true,
  repoError:     null,
  repoName:      '',
  currentBranch: '',
  gitService:    null,
  setRepoContext: (name, branch) =>
    set({ repoName: name, currentBranch: branch, isGitRepo: true, repoError: null }),
  setGitService: (git) => set({ gitService: git }),
  setRepoError:  (err) => set({ repoError: err, isGitRepo: err === null }),

  localBranches:    [],
  setLocalBranches: (branches) => set({ localBranches: branches }),
  refreshBranches: async () => {
    const { gitService } = get();
    if (!gitService) return;
    try {
      const branches = await gitService.getLocalBranches();
      set({ localBranches: branches });
    } catch { /* silently ignore */ }
  },

  branchStatus:    null,
  statusLoading:   false,
  setBranchStatus: (s) => set({ branchStatus: s }),
  setStatusLoading:(v) => set({ statusLoading: v }),
  refreshStatus: async () => {
    const { gitService } = get();
    if (!gitService) return;
    set({ statusLoading: true });
    try {
      const { resolveBranchStatus } = await import('../../git/StatusResolver.js');
      const status = await resolveBranchStatus(gitService);
      set({ branchStatus: status, statusLoading: false, currentBranch: status.branch });
    } catch {
      set({ statusLoading: false });
    }
  },

  footerMessage:    null,
  setFooterMessage: (msg) => set({ footerMessage: msg }),
}));