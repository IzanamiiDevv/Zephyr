import { create } from 'zustand';
import type { ScreenId } from '../theme.js';
import type { GitService, BranchInfo } from '../../git/GitService.js';
import type { PresenceMap } from '../../git/TeamService.js';
import type { NetworkStatus } from '../../git/NetworkMonitor.js';
import type { CoreBranch } from '../../git/BranchChecker.js';
import type { ZephyrConfigData } from '../../git/ZephyrConfig.js';

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

export interface StagingFile {
  path:       string;
  index:      string;
  workingDir: string;
  staged:     boolean;
}

const DEFAULT_CONFIG: ZephyrConfigData = {
  version:      '1.0.0',
  lock:         false,
  strict:       false,
  owners:       [],
  contributors: [],
};

export interface AppState {
  // Navigation
  activeScreen: ScreenId;
  setScreen:    (s: ScreenId) => void;

  // Input
  inputActive:    boolean;
  inputValue:     string;
  setInputActive: (v: boolean) => void;
  setInputValue:  (v: string) => void;

  // Safe-prod
  safeProdStatus:    SafeProdStatus;
  safeProdLastCheck: string;
  setSafeProdStatus: (s: SafeProdStatus) => void;

  // Network
  networkStatus:    NetworkStatus;
  setNetworkStatus: (s: NetworkStatus) => void;

  // Repo
  isGitRepo:      boolean;
  repoError:      string | null;
  repoName:       string;
  currentBranch:  string;
  gitService:     GitService | null;
  setRepoContext: (name: string, branch: string) => void;
  setGitService:  (git: GitService | null) => void;
  setRepoError:   (err: string | null) => void;

  // Session identity
  userEmail:       string;
  userName:        string;
  isOwner:         boolean;
  setUserIdentity: (name: string, email: string, owner: boolean) => void;

  // Zephyr config
  zephyrConfig:    ZephyrConfigData;
  setZephyrConfig: (c: ZephyrConfigData) => void;

  // Branch checker
  missingBranches:    CoreBranch[];
  branchCheckDone:    boolean;
  setMissingBranches: (b: CoreBranch[]) => void;
  setBranchCheckDone: (v: boolean) => void;

  // Branch list
  localBranches:    BranchInfo[];
  setLocalBranches: (b: BranchInfo[]) => void;
  refreshBranches:  () => Promise<void>;

  // Branch status
  branchStatus:     BranchStatus | null;
  statusLoading:    boolean;
  setBranchStatus:  (s: BranchStatus | null) => void;
  setStatusLoading: (v: boolean) => void;
  refreshStatus:    () => Promise<void>;

  // Staging
  stagingFiles:    StagingFile[];
  stagingLoading:  boolean;
  setStagingFiles: (f: StagingFile[]) => void;
  refreshStaging:  () => Promise<void>;

  // Team
  teamPresence:    PresenceMap;
  setTeamPresence: (m: PresenceMap) => void;

  // Footer
  footerMessage:    string | null;
  setFooterMessage: (msg: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeScreen: 'home',
  setScreen:    (s) => set({ activeScreen: s }),

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
        hour: '2-digit', minute: '2-digit', hour12: false,
      }),
    }),

  networkStatus:    'checking',
  setNetworkStatus: (s) => set({ networkStatus: s }),

  isGitRepo:      true,
  repoError:      null,
  repoName:       '',
  currentBranch:  '',
  gitService:     null,
  setRepoContext: (name, branch) =>
    set({ repoName: name, currentBranch: branch, isGitRepo: true, repoError: null }),
  setGitService: (git) => set({ gitService: git }),
  setRepoError:  (err) => set({ repoError: err, isGitRepo: err === null }),

  userEmail:  '',
  userName:   '',
  isOwner:    false,
  setUserIdentity: (name, email, owner) =>
    set({ userName: name, userEmail: email, isOwner: owner }),

  zephyrConfig:    DEFAULT_CONFIG,
  setZephyrConfig: (c) => set({ zephyrConfig: c }),

  missingBranches:    [],
  branchCheckDone:    false,
  setMissingBranches: (b) => set({ missingBranches: b }),
  setBranchCheckDone: (v) => set({ branchCheckDone: v }),

  localBranches:    [],
  setLocalBranches: (b) => set({ localBranches: b }),
  refreshBranches: async () => {
    const { gitService } = get();
    if (!gitService) return;
    try {
      const branches = await gitService.getLocalBranches();
      set({ localBranches: branches });
    } catch { /* ignore */ }
  },

  branchStatus:     null,
  statusLoading:    false,
  setBranchStatus:  (s) => set({ branchStatus: s }),
  setStatusLoading: (v) => set({ statusLoading: v }),
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

  stagingFiles:    [],
  stagingLoading:  false,
  setStagingFiles: (f) => set({ stagingFiles: f }),
  refreshStaging: async () => {
    const { gitService } = get();
    if (!gitService) return;
    set({ stagingLoading: true });
    try {
      const status = await gitService.getStatus();
      const files: StagingFile[] = status.files.map(f => ({
        path:       f.path,
        index:      f.index,
        workingDir: f.working_dir,
        staged:     f.index !== ' ' && f.index !== '?',
      }));
      set({ stagingFiles: files, stagingLoading: false });
    } catch {
      set({ stagingLoading: false });
    }
  },

  teamPresence:    {},
  setTeamPresence: (m) => set({ teamPresence: m }),

  footerMessage:    null,
  setFooterMessage: (msg) => set({ footerMessage: msg }),
}));