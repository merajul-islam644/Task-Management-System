import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * UI preferences and transient surface state. Only harmless preferences are
 * persisted to localStorage — never credentials or sensitive data.
 */

export type ThemeSetting = "light" | "dark" | "system";

/** Workspace-local profile details. Name and email are NOT here — they come
    from the IAM session claims (see useDisplayName / useAuth). */
export interface Profile {
  role: string;
  bio: string;
}

export interface NotificationPrefs {
  assigned: boolean;
  dueReminders: boolean;
  mentions: boolean;
  weeklyDigest: boolean;
}

interface UiStore {
  theme: ThemeSetting;
  sidebarCollapsed: boolean;
  profile: Profile;
  notifications: NotificationPrefs;
  defaultLanding: "overview" | "tasks";

  setTheme: (theme: ThemeSetting) => void;
  toggleSidebar: () => void;
  setProfile: (profile: Profile) => void;
  setNotifications: (prefs: NotificationPrefs) => void;
  setDefaultLanding: (landing: "overview" | "tasks") => void;

  /** Transient surfaces */
  commandOpen: boolean;
  aiOpen: boolean;
  /** Notification panel anchored to the topbar bell. */
  notificationsOpen: boolean;
  /** Task create/edit dialog. `taskId` set = editing. */
  taskForm: { open: boolean; taskId?: string; projectId?: string; status?: string; dueDate?: string };
  taskDetailId: string | null;
  /** Pending delete confirmation target */
  deleteTaskId: string | null;
  /** Project create/edit dialog. `projectId` set = editing. */
  projectForm: { open: boolean; projectId?: string };

  setCommandOpen: (open: boolean) => void;
  setAiOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  openTaskForm: (opts?: { taskId?: string; projectId?: string; status?: string; dueDate?: string }) => void;
  closeTaskForm: () => void;
  openTask: (id: string) => void;
  closeTask: () => void;
  askDeleteTask: (id: string | null) => void;
  openProjectForm: (projectId?: string) => void;
  closeProjectForm: () => void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      theme: "system",
      sidebarCollapsed: false,
      profile: {
        role: "Product engineer",
        bio: "Building FlowTask and the design system behind it.",
      },
      notifications: {
        assigned: true,
        dueReminders: true,
        mentions: true,
        weeklyDigest: false,
      },
      defaultLanding: "overview",

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setProfile: (profile) => set({ profile }),
      setNotifications: (notifications) => set({ notifications }),
      setDefaultLanding: (defaultLanding) => set({ defaultLanding }),

      commandOpen: false,
      aiOpen: false,
      notificationsOpen: false,
      taskForm: { open: false },
      taskDetailId: null,
      deleteTaskId: null,
      projectForm: { open: false },

      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setAiOpen: (aiOpen) => set({ aiOpen }),
      setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
      openTaskForm: (opts) => set({ taskForm: { open: true, ...opts } }),
      closeTaskForm: () => set({ taskForm: { open: false } }),
      openTask: (taskDetailId) => set({ taskDetailId }),
      closeTask: () => set({ taskDetailId: null }),
      askDeleteTask: (deleteTaskId) => set({ deleteTaskId }),
      openProjectForm: (projectId) => set({ projectForm: { open: true, projectId } }),
      closeProjectForm: () => set({ projectForm: { open: false } }),
    }),
    {
      name: "flowtask.ui",
      partialize: (s) => ({
        theme: s.theme,
        sidebarCollapsed: s.sidebarCollapsed,
        profile: s.profile,
        notifications: s.notifications,
        defaultLanding: s.defaultLanding,
      }),
    },
  ),
);
