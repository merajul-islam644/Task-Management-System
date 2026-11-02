import { create } from "zustand";
import { format } from "date-fns";
import type {
  Activity,
  AISuggestedTask,
  BoardColumn,
  Project,
  ProjectInput,
  Task,
  TaskInput,
  User,
} from "@/types";
import * as taskService from "@/services/taskService";
import * as projectService from "@/services/projectService";
import * as activityService from "@/services/activityService";
import * as avatarService from "@/services/avatarService";
import * as boardColumnService from "@/services/boardColumnService";
import * as organizationService from "@/services/organizationService";
import type { MyOrganization } from "@/services/organizationService";
import * as accessService from "@/services/accessService";
import type { PermissionInfo, RoleInfo } from "@/services/accessService";
import * as notificationService from "@/services/notificationService";
import * as userService from "@/services/userService";
import * as mailService from "@/services/mailService";
import type { NotificationPayload } from "@/services/notificationService";
import { invalidateAvatar } from "@/lib/avatar";
import { fullColumnOrder } from "@/lib/meta";
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
  /** User-created board columns; the five built-ins are hard-coded in lib/meta. */
  boardColumns: BoardColumn[];
  /** Persisted column sequence (customs can sit between the built-ins). */
  columnOrder: string[];
  /** IAM organizations the signed-in user belongs to; switcher hides below 2. */
  organizations: MyOrganization[];
  /** The org the session is currently scoped to, when IAM reports one. */
  activeOrgId: string;
  /** True while an org switch + workspace refetch is in flight. */
  switchingOrg: boolean;
  /** The signed-in user's IAM role slugs; gates org-admin UI (clouduser). */
  myRoles: string[];
  /** IAM role definitions (settings admin); empty for non-admins. */
  roles: RoleInfo[];
  /** Role slugs the signed-in user may grant — the invite role picker. */
  assignableRoles: string[];
  /** Full IAM permission catalog (role editor's picker source). Fetched on
      first need, not at boot — IAM paginates it and boot must not wait. */
  permissions: PermissionInfo[];
  /** True while that catalog fetch is in flight. */
  permissionsLoading: boolean;
  currentUserId: string;
  /** Session email of the signed-in user; avatars also key off this because the
      internal user id can change between SSO logins while the email cannot. */
  currentEmail: string;
  activities: Activity[];
  /** Real Blocks Notifier inbox of the signed-in user (same Activity shape). */
  notifications: Activity[];
  /** Blocks Data file id of the signed-in user's profile picture, "" when none. */
  avatarFileId: string;
  /** Profile-picture file ids for every member who has one, keyed by userId. */
  avatarFileIds: Record<string, string>;

  load: () => Promise<void>;
  /** Unconditional refetch of claims + workspace data; no status flip first. */
  reloadCore: () => Promise<void>;
  createTask: (input: TaskInput) => Promise<Task>;
  updateTask: (id: string, patch: TaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskDone: (id: string) => Promise<Task>;
  createProject: (input: ProjectInput) => Promise<Project>;
  updateProject: (id: string, patch: ProjectInput) => Promise<Project>;
  /** Add a custom board column, optionally at a position in the full column
      sequence (defaults to the end). Persisted to the BoardColumn collection. */
  createColumn: (label: string, position?: number) => Promise<BoardColumn>;
  renameColumn: (id: string, label: string) => Promise<void>;
  /** Blocked while any task still sits in the column. */
  deleteColumn: (id: string) => Promise<void>;
  /** Move the session to another organization, then refetch claims + data. */
  switchOrg: (organizationId: string) => Promise<void>;
  /** Create an organization (clouduser-only UI), then refresh the org list. */
  createOrg: (name: string, description?: string) => Promise<void>;
  /** Invite a user with an initial role, then refresh the member list. */
  inviteUser: (email: string, firstName: string, lastName: string, roles: string[]) => Promise<void>;
  saveUserPermissions: (userId: string, permissionIds: string[]) => Promise<void>;
  /** Define a role, then refresh the role list. */
  createRole: (name: string, description?: string) => Promise<void>;
  /** Apply a permission delta to a role (itemIds), then refresh roles. */
  saveRolePermissions: (slug: string, addIds: string[], removeIds: string[]) => Promise<void>;
  /** Fetch the permission catalog once, on first need (manage-permissions
      dialog); no-op when it is already in hand or a fetch is in flight. */
  ensurePermissions: () => Promise<void>;
  markActivityRead: (id: string) => Promise<void>;
  markAllActivitiesRead: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addSuggestedTasks: (suggestions: AISuggestedTask[], projectId: string) => Promise<Task[]>;
  /** Upload a picked image and make it the signed-in user's profile picture. */
  uploadAvatar: (file: File) => Promise<void>;
}

/** Remembers the pre-done status so un-completing restores context. Custom
    column ids are strings too, so this is keyed on the raw status value. */
const statusBeforeDone = new Map<string, string>();

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
  boardColumns: [],
  columnOrder: [],
  organizations: [],
  activeOrgId: "",
  switchingOrg: false,
  myRoles: [],
  roles: [],
  assignableRoles: [],
  permissions: [],
  permissionsLoading: false,
  currentUserId: "",
  currentEmail: "",
  activities: [],
  notifications: [],
  avatarFileId: "",
  avatarFileIds: {},

  load: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading", error: undefined });
    await get().reloadCore();
  },

  /** Refetch session claims and all workspace data without the one-shot guard
      or a status flip — the path an org switch takes, since the session's org
      context changed server-side and every list is now stale. A failure flips
      to `status: "error"` on purpose: quietly showing the previous org's data
      after a half-finished switch would be worse than an explicit error. */
  reloadCore: async () => {
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
      const [tasks, projects, activities, notifications, avatarFileIds, board, orgs, identity, access] = await Promise.all([
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
        // Custom columns: a missing/unconfigured BoardColumn collection just
        // means the board shows the built-ins.
        boardColumnService.loadBoard().catch(() => ({ columns: [] as BoardColumn[], order: [] as string[] })),
        // Organizations: an IAM without multi-org just returns one (or none) —
        // the switcher hides itself below two entries.
        organizationService.listMyOrganizations().catch(() => ({ organizations: [] as MyOrganization[], activeId: "" })),
        // Role slugs for feature gates (org creation needs `clouduser`) and
        // the session's active org id; a failure just means the gated
        // controls stay hidden and the switcher falls back to the first org.
        organizationService
          .fetchMyIdentity()
          .catch(() => ({ roles: [] as string[], activeOrganizationId: "" })),
        // Settings-admin data: role definitions and grantable slugs — both
        // small, both cheap. The permission catalog stays out of boot; the
        // manage-permissions dialog pulls it via ensurePermissions().
        Promise.all([
          accessService.listRoles().catch(() => []),
          accessService.listAssignableRoleSlugs().catch(() => []),
        ] as const),
      ]);
      set({
        status: "ready",
        tasks,
        projects,
        activities,
        notifications,
        avatarFileIds,
        avatarFileId: avatarFileIds[currentUserId] ?? (email ? avatarFileIds[email.toLowerCase()] : "") ?? "",
        currentEmail: email,
        boardColumns: board.columns,
        columnOrder: board.order,
        organizations: orgs.organizations,
        // iam/me's organizationId is authoritative (the my-list never marks
        // the active one); the my-endpoint's flag is only a fallback.
        activeOrgId: identity.activeOrganizationId || orgs.activeId,
        myRoles: identity.roles,
        roles: access[0],
        assignableRoles: access[1],
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
    const { task, activity } = await taskService.updateTask(id, patch, prev, get().currentUserId, get().boardColumns);
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
    const nextStatus: string = task.status === "done" ? (statusBeforeDone.get(id) ?? "todo") : "done";
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

  createColumn: async (label, position) => {
    const clean = label.trim();
    if (!clean) throw new Error("Give the column a name.");
    const order = fullColumnOrder(get().boardColumns, get().columnOrder);
    const at = Math.max(0, Math.min(position ?? order.length, order.length));
    const column: BoardColumn = {
      id: `col_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      label: clean,
      order: get().boardColumns.reduce((max, c) => Math.max(max, c.order), 0) + 1,
    };
    const nextOrder = [...order.slice(0, at), column.id, ...order.slice(at)];
    await boardColumnService.createColumn(column);
    // The sequence is a convenience layer; losing it only resets positions.
    try {
      await boardColumnService.saveColumnOrder(nextOrder);
    } catch {
      // Column itself is saved; the board falls back to default ordering.
    }
    set((s) => ({ boardColumns: [...s.boardColumns, column], columnOrder: nextOrder }));
    return column;
  },

  renameColumn: async (id, label) => {
    const clean = label.trim();
    if (!clean) throw new Error("Give the column a name.");
    const prev = get().boardColumns.find((c) => c.id === id);
    if (!prev) throw new Error("Column not found");
    if (prev.itemId) await boardColumnService.updateColumn(prev.itemId, { label: clean });
    set((s) => ({ boardColumns: s.boardColumns.map((c) => (c.id === id ? { ...c, label: clean } : c)) }));
  },

  deleteColumn: async (id) => {
    const column = get().boardColumns.find((c) => c.id === id);
    if (!column) throw new Error("Column not found");
    const inUse = get().tasks.filter((t) => t.status === id).length;
    if (inUse > 0) {
      throw new Error(
        inUse === 1
          ? "1 task is still in this column. Move it to another column first."
          : `${inUse} tasks are still in this column. Move them to another column first.`,
      );
    }
    if (column.itemId) await boardColumnService.deleteColumn(column.itemId);
    const remaining = get().boardColumns.filter((c) => c.id !== id);
    const nextOrder = fullColumnOrder(remaining, get().columnOrder);
    try {
      await boardColumnService.saveColumnOrder(nextOrder);
    } catch {
      // A stale id in the layout is harmless; display skips unknown ids.
    }
    set({ boardColumns: remaining, columnOrder: nextOrder });
  },

  /** Move the session to another organization, then refetch everything. IAM
      re-issues the session cookie for the new org server-side; the refetch is
      what makes every list reflect the new context. Errors propagate to the
      caller (the switcher surfaces them as a toast) and leave state intact. */
  switchOrg: async (organizationId) => {
    if (get().switchingOrg || organizationId === get().activeOrgId) return;
    set({ switchingOrg: true });
    try {
      await organizationService.switchOrganization(organizationId);
      await get().reloadCore();
    } finally {
      set({ switchingOrg: false });
    }
  },

  /** Create an organization, grant the creator their current roles in it
      (the users/access grant is IAM's membership-adding call — creating the
      org alone does not), then refresh just the org list. The session stays
      in the current org until the user switches. The settings screen's
      confirm dialog is the human sign-off this call lives behind. */
  createOrg: async (name, description = "") => {
    const orgId = await organizationService.createOrganization(name, description);
    const userId = get().currentUserId;
    const memberIds = get().organizations.map((o) => o.id);
    // clouduser is IAM's default member role; the creator carries it in the
    // org they made unless they hold something narrower to replicate.
    const roles = get().myRoles.length > 0 ? get().myRoles : ["clouduser"];
    if (userId && orgId && !memberIds.includes(orgId)) {
      await userService.grantUserOrganizationRole(userId, orgId, roles);
    }
    const orgs = await organizationService
      .listMyOrganizations()
      .catch(() => ({ organizations: get().organizations, activeId: get().activeOrgId }));
    set({ organizations: orgs.organizations, activeOrgId: orgs.activeId });
  },

  /** Invite a user, then refresh the member list so they show immediately.
      Errors propagate to the invite dialog (toasted there). */
  inviteUser: async (email, firstName, lastName, roles) => {
    await userService.inviteUser(email, firstName, lastName, roles);
    const users = await userService.listWorkspaceUsers().catch(() => get().users);
    set({ users });
  },

  /** Overwrite a user's DIRECT permission set in the active organization —
      the user-specific layer on top of their roles' permissions. IAM keeps
      role grants untouched (an omitted roles list is kept), and nothing to
      refetch locally: the set lives server-side and applies on the user's
      next session evaluation. */
  saveUserPermissions: async (userId, permissionIds) => {
    const organizationId = get().activeOrgId || "default";
    await userService.setUserPermissions(userId, organizationId, permissionIds);
  },

  /** Define a role, then refresh the role list (and grantable slugs — the
      new role may now be assignable by this admin). */
  createRole: async (name, description = "") => {
    await accessService.createRole(name, description);
    const [roles, assignableRoles] = await Promise.all([
      accessService.listRoles().catch(() => get().roles),
      accessService.listAssignableRoleSlugs().catch(() => get().assignableRoles),
    ]);
    set({ roles, assignableRoles });
  },

  /** Apply a permission delta to a role, then refresh the catalog (the
      roles[] membership lists on permissions change with it). */
  saveRolePermissions: async (slug, addIds, removeIds) => {
    await accessService.assignRolePermissions(slug, addIds, removeIds);
    const permissions = await accessService.listPermissions().catch(() => get().permissions);
    set({ permissions });
  },

  /** Pull the permission catalog the first time the manage-permissions dialog
      opens. Boot deliberately skips it: the catalog paginates, and first
      paint must not wait on the role editor's data. */
  ensurePermissions: async () => {
    if (get().permissions.length > 0 || get().permissionsLoading) return;
    set({ permissionsLoading: true });
    try {
      const permissions = await accessService.listPermissions();
      set({ permissions });
    } finally {
      set({ permissionsLoading: false });
    }
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
    const email = get().currentEmail;
    const previous = get().avatarFileId;
    const fileId = await avatarService.uploadAvatarFile(file);
    invalidateAvatar(previous);
    await avatarService.saveAvatar(userId, fileId, email);
    set((s) => ({
      avatarFileId: fileId,
      avatarFileIds: {
        ...s.avatarFileIds,
        [userId]: fileId,
        ...(email ? { [email.toLowerCase()]: fileId } : {}),
      },
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
