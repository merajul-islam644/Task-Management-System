import { create } from "zustand";
import { format } from "date-fns";
import type {
  Activity,
  AISuggestedTask,
  Project,
  ProjectInput,
  Task,
  TaskInput,
  TaskStatus,
  User,
} from "@/types";
import * as taskService from "@/services/taskService";
import * as projectService from "@/services/projectService";
import * as activityService from "@/services/activityService";
import * as avatarService from "@/services/avatarService";
import * as notificationService from "@/services/notificationService";
import * as userService from "@/services/userService";
import * as mailService from "@/services/mailService";
import type { NotificationPayload } from "@/services/notificationService";
import { invalidateAvatar } from "@/lib/avatar";
import { fetchSessionClaims } from "@/lib/blocks/auth";
import { parseDate } from "@/lib/utils";

/**
 * Client-side state over the Blocks Data Gateway. Components never touch the
 * data modules directly — they read this store and call its actions.
 */

type Status = "idle" | "loading" | "ready" | "error";

interface DataStore {
  status: Status;
  error?: string;
  tasks: Task[];
  projects: Project[];
  users: User[];
  currentUserId: string;
  activities: Activity[];
  /** Real Blocks Notifier inbox of the signed-in user (same Activity shape). */
  notifications: Activity[];
  /** Blocks Data file id of the signed-in user's profile picture, "" when none. */
  avatarFileId: string;
  /** Profile-picture file ids for every member who has one, keyed by userId. */
  avatarFileIds: Record<string, string>;

  load: () => Promise<void>;
  createTask: (input: TaskInput) => Promise<Task>;
  updateTask: (id: string, patch: TaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskDone: (id: string) => Promise<Task>;
  createProject: (input: ProjectInput) => Promise<Project>;
  updateProject: (id: string, patch: ProjectInput) => Promise<Project>;
  markActivityRead: (id: string) => Promise<void>;
  markAllActivitiesRead: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addSuggestedTasks: (suggestions: AISuggestedTask[], projectId: string) => Promise<Task[]>;
  /** Upload a picked image and make it the signed-in user's profile picture. */
  uploadAvatar: (file: File) => Promise<void>;
}

/** Remembers the pre-done status so un-completing restores context. */
const statusBeforeDone = new Map<string, TaskStatus>();

/** Fire-and-forget push through the Blocks Notifier, plus an email copy
    through Blocks Mail when the assignee has an address on file. A real team
    would skip notifying the actor about their own change; with a single-member
    demo workspace the self-notification is what makes the bell visibly work. */
function pushTaskNotification(
  state: { currentUserId: string; users: User[]; projects: Project[] },
  kind: NotificationPayload["kind"],
  message: string,
  task: Task,
): void {
  const assigneeId = task.assigneeId;
  if (!assigneeId) return;
  notificationService
    .sendTaskNotification({
      userIds: [assigneeId],
      payload: {
        kind,
        message,
        actorId: state.currentUserId || undefined,
        taskId: task.id,
        projectId: task.projectId || undefined,
      },
    })
    .catch(() => {
      // A failed push (offline, missing send permission) is not fatal.
    });

  const assignee = state.users.find((user) => user.id === assigneeId);
  if (!assignee?.email) return;
  const actor = state.users.find((user) => user.id === state.currentUserId);
  const project = state.projects.find((p) => p.id === task.projectId);
  mailService
    .sendTaskAssignedEmail({
      to: assignee.email,
      assigneeName: assignee.name,
      actorName: actor?.name ?? "A teammate",
      taskTitle: task.title,
      projectName: project?.name ?? "your workspace",
      dueDate: task.dueDate ? format(parseDate(task.dueDate), "MMM d, yyyy") : "No due date",
      appUrl: window.location.origin,
    })
    .catch(() => {
      // A failed email (mail outage, missing template) is not fatal either.
    });
}

export const useDataStore = create<DataStore>((set, get) => ({
  status: "idle",
  tasks: [],
  projects: [],
  users: [],
  currentUserId: "",
  activities: [],
  notifications: [],
  avatarFileId: "",
  avatarFileIds: {},

  load: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading", error: undefined });
    try {
      // Real IAM members — the assignable teammates. Listing them needs a
      // permission the current role may not hold; a failure falls back to the
      // signed-in user alone instead of failing the whole workspace load.
      const claims = await fetchSessionClaims();
      const sub = claims?.sub ?? "";
      const email = claims?.email ?? "";
      let members: User[] = [];
      try {
        members = await userService.listWorkspaceUsers();
      } catch {
        members = [];
      }
      // One canonical id for the signed-in user: their IAM member record when
      // identifiable (by id, else by email), the OIDC sub otherwise. Every
      // assigneeId / actorId reference keys off this same id.
      const selfMember =
        members.find((user) => user.id === sub) ??
        members.find((user) => email && user.email.toLowerCase() === email.toLowerCase());
      const currentUserId = selfMember?.id || sub;
      if (currentUserId && !members.some((user) => user.id === currentUserId)) {
        members = [
          {
            id: currentUserId,
            name: claims?.name?.trim() || email.split("@")[0] || "You",
            email,
            role: "Member",
            hue: "iris",
          },
          ...members,
        ];
      }
      set({ currentUserId, users: members });
      const [tasks, projects, activities, notifications, avatarFileIds] = await Promise.all([
        taskService.listTasks(),
        projectService.listProjects(),
        activityService.listActivities(),
        // A notifier outage must not fail the whole workspace load.
        notificationService.listNotifications().catch(() => []),
        // One read covers every member's picture; a missing/failing profile
        // row must not fail the whole workspace load.
        currentUserId
          ? avatarService.getAllAvatarFileIds().catch(() => ({}) as Record<string, string>)
          : Promise.resolve({} as Record<string, string>),
      ]);
      set({
        status: "ready",
        tasks,
        projects,
        activities,
        notifications,
        avatarFileIds,
        avatarFileId: avatarFileIds[currentUserId] ?? "",
      });
    } catch (error) {
      set({
        status: "error",
        error: error instanceof Error && error.message ? error.message : "Could not load your workspace data.",
      });
    }
  },

  createTask: async (input) => {
    const task = await taskService.createTask({
      ...input,
      projectId: input.projectId ?? get().projects[0]?.id ?? "",
      assigneeId: input.assigneeId ?? get().currentUserId,
    });
    set((s) => ({ tasks: [task, ...s.tasks] }));
    pushTaskNotification(get(), "assigned", `assigned you a task: ${task.title}`, task);
    return task;
  },

  updateTask: async (id, patch) => {
    const prev = get().tasks.find((t) => t.id === id);
    if (!prev) throw new Error(`Task ${id} not found`);
    const { task, activity } = await taskService.updateTask(id, patch, prev, get().currentUserId);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? task : t)),
      activities: activity ? [activity, ...s.activities] : s.activities,
    }));
    if (task.assigneeId && task.assigneeId !== prev.assigneeId) {
      pushTaskNotification(get(), "assigned", `assigned you a task: ${task.title}`, task);
    }
    return task;
  },

  deleteTask: async (id) => {
    await taskService.deleteTask(id);
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
    }));
  },

  toggleTaskDone: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) throw new Error(`Task ${id} not found`);
    const nextStatus: TaskStatus = task.status === "done" ? (statusBeforeDone.get(id) ?? "todo") : "done";
    if (task.status !== "done") statusBeforeDone.set(id, task.status);
    return get().updateTask(id, { status: nextStatus });
  },

  createProject: async (input) => {
    const project = await projectService.createProject({
      ...input,
      memberIds: input.memberIds?.length ? input.memberIds : [get().currentUserId],
    });
    set((s) => ({ projects: [...s.projects, project] }));
    return project;
  },

  updateProject: async (id, patch) => {
    const prev = get().projects.find((p) => p.id === id);
    if (!prev) throw new Error(`Project ${id} not found`);
    const project = await projectService.updateProject(id, patch, prev);
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? project : p)) }));
    return project;
  },

  markActivityRead: async (id) => {
    set((s) => ({
      activities: s.activities.map((a) => (a.id === id ? { ...a, read: true } : a)),
    }));
    await activityService.markActivityRead(id);
  },

  markAllActivitiesRead: async () => {
    const unreadIds = get().activities.filter((a) => !a.read).map((a) => a.id);
    set((s) => ({ activities: s.activities.map((a) => ({ ...a, read: true })) }));
    await activityService.markAllActivitiesRead(unreadIds);
  },

  markNotificationRead: async (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
    await notificationService.markNotificationRead(id);
  },

  markAllNotificationsRead: async () => {
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    await notificationService.markAllNotificationsRead();
  },

  uploadAvatar: async (file) => {
    const userId = get().currentUserId;
    if (!userId) throw new Error("You need to be signed in.");
    const previous = get().avatarFileId;
    const fileId = await avatarService.uploadAvatarFile(file);
    invalidateAvatar(previous);
    await avatarService.saveAvatar(userId, fileId);
    set((s) => ({
      avatarFileId: fileId,
      avatarFileIds: { ...s.avatarFileIds, [userId]: fileId },
    }));
    // The replaced picture is soft-deleted; a cleanup failure is not fatal.
    if (previous) {
      try {
        await avatarService.deleteAvatarFile(previous);
      } catch {
        // Old file stays in trash-eligible state; harmless.
      }
    }
  },

  addSuggestedTasks: async (suggestions, projectId) => {
    const created: Task[] = [];
    for (const sug of suggestions) {
      const task = await get().createTask({
        title: sug.title,
        priority: sug.priority,
        projectId,
        dueDate: sug.dueInDays === undefined ? undefined : dueFromOffset(sug.dueInDays),
        labels: ["ai-suggested"],
        description: sug.rationale,
      });
      created.push(task);
    }
    return created;
  },
}));

function dueFromOffset(days: number): string {
  const d = new Date();
  d.setHours(17, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
