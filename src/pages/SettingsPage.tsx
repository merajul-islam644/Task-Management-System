import { useEffect, useMemo, useState } from "react";
import { Building2, Monitor, Moon, ShieldCheck, Sun, UserPlus } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useUiStore, type ThemeSetting } from "@/store/ui";
import { useDataStore } from "@/store/data";
import { toast } from "@/store/toast";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Select } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/Dialog";
import { listRolePermissionIds, type PermissionInfo } from "@/services/accessService";
import { cn, initials } from "@/lib/utils";

const NOTIFICATIONS: { key: "assigned" | "dueReminders" | "mentions" | "weeklyDigest"; label: string; hint: string }[] = [
  { key: "assigned", label: "Task assigned", hint: "When someone assigns you work" },
  { key: "dueReminders", label: "Due-date reminders", hint: "A nudge on the morning something is due" },
  { key: "mentions", label: "Comments and mentions", hint: "Replies and @mentions on your tasks" },
  { key: "weeklyDigest", label: "Weekly digest", hint: "One summary email, Monday mornings" },
];

const THEME_OPTIONS: { value: ThemeSetting; label: string; icon: typeof Sun; hint: string }[] = [
  { value: "light", label: "Light", icon: Sun, hint: "Bright and paper-like" },
  { value: "dark", label: "Dark", icon: Moon, hint: "Deep charcoal surfaces" },
  { value: "system", label: "System", icon: Monitor, hint: "Follow your OS setting" },
];

export function SettingsPage() {
  const { claims } = useAuth();
  const profile = useUiStore((s) => s.profile);
  const setProfile = useUiStore((s) => s.setProfile);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const notifications = useUiStore((s) => s.notifications);
  const setNotifications = useUiStore((s) => s.setNotifications);
  const defaultLanding = useUiStore((s) => s.defaultLanding);
  const setDefaultLanding = useUiStore((s) => s.setDefaultLanding);
  const organizations = useDataStore((s) => s.organizations);
  const activeOrgId = useDataStore((s) => s.activeOrgId);
  const myRoles = useDataStore((s) => s.myRoles);
  const createOrg = useDataStore((s) => s.createOrg);
  const users = useDataStore((s) => s.users);
  const assignableRoles = useDataStore((s) => s.assignableRoles);
  const roles = useDataStore((s) => s.roles);
  const permissions = useDataStore((s) => s.permissions);
  const inviteUser = useDataStore((s) => s.inviteUser);
  const createRole = useDataStore((s) => s.createRole);
  const saveRolePermissions = useDataStore((s) => s.saveRolePermissions);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [permissionsFor, setPermissionsFor] = useState<string | null>(null);

  /** Org creation is an admin capability: only the clouduser role sees it. */
  const canCreateOrg = myRoles.includes("clouduser");
  /** Same gate covers the IAM admin surfaces below (invite, roles, permissions). */
  const canManageTeam = canCreateOrg;

  const [role, setRole] = useState(profile.role);
  const [bio, setBio] = useState(profile.bio);

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile({ role: role.trim() || "Team member", bio: bio.trim() });
    toast.success("Settings saved");
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6">
      <header>
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Settings</h2>
        <p className="mt-1 text-[13.5px] text-ink-2">
          Tune your profile details, how FlowTask looks, and what it tells you about.
        </p>
      </header>

      {/* Identity — read-only, issued by the IAM session */}
      <section aria-labelledby="identity-heading" className="rounded-card border border-line bg-surface">
        <div className="p-5 pb-0">
          <h3 id="identity-heading" className="text-[14px] font-semibold">
            Identity
          </h3>
        </div>
        <div className="mt-3 divide-y divide-line border-t border-line">
          <Row label="Full name" value={claims?.name?.trim() ?? ""} />
          <Row label="Email" value={claims?.email ?? ""} />
          <Row label="Account id" value={claims?.sub ?? ""} />
          <Row label="Roles" value={myRoles.join(", ")} />
        </div>
      </section>

      {/* Organizations — the multi-org workspaces behind the top-bar switcher.
          Creating one is admin work: the button exists only for clouduser. */}
      <section aria-labelledby="org-heading" className="rounded-card border border-line bg-surface">
        <div className="flex items-start justify-between gap-3 p-5 pb-0">
          <div className="min-w-0">
            <h3 id="org-heading" className="text-[14px] font-semibold">
              Organizations
            </h3>
            <p className="mt-1 text-[12.5px] text-ink-3">
              Workspaces you belong to. Switch between them from the top bar.
            </p>
          </div>
          {canCreateOrg && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Building2 size={13} aria-hidden /> New organization
            </Button>
          )}
        </div>
        <div className="mt-3 divide-y divide-line border-t border-line">
          {organizations.length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-ink-3">
              {canCreateOrg
                ? "No organizations yet — create the first one to get started."
                : "No organizations yet. You'll see them here once you're added to one."}
            </p>
          ) : (
            organizations.map((org) => (
              <div key={org.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Building2 size={14} aria-hidden className="shrink-0 text-ink-3" />
                  <span className="truncate text-[13px] font-medium text-ink">{org.name}</span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    org.id === activeOrgId ? "bg-accent-soft text-accent-ink" : "text-ink-3",
                  )}
                >
                  {org.id === activeOrgId ? "Active" : ""}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Profile details — workspace-local preferences */}
      <section aria-labelledby="profile-heading" className="rounded-card border border-line bg-surface">
        <form onSubmit={saveProfile} noValidate className="flex flex-col gap-4 p-5">
          <h3 id="profile-heading" className="text-[14px] font-semibold">
            Profile details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role" htmlFor="settings-role" className="sm:col-span-2">
              <Input id="settings-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Product engineer" />
            </Field>
            <Field label="Bio" htmlFor="settings-bio" className="sm:col-span-2">
              <Textarea id="settings-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={2} placeholder="A line about you" />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" type="submit">
              Save changes
            </Button>
          </div>
        </form>
      </section>

      {/* Team — tenant members and the invite flow (clouduser only). */}
      {canManageTeam && (
        <section aria-labelledby="team-heading" className="rounded-card border border-line bg-surface">
          <div className="flex items-start justify-between gap-3 p-5 pb-0">
            <div className="min-w-0">
              <h3 id="team-heading" className="text-[14px] font-semibold">
                Team
              </h3>
              <p className="mt-1 text-[12.5px] text-ink-3">
                Everyone provisioned in this tenant. Invited people get a sign-in for their role.
              </p>
            </div>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus size={13} aria-hidden /> Invite user
            </Button>
          </div>
          <div className="mt-3 divide-y divide-line border-t border-line">
            {users.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-ink-3">Nobody here yet — invite your first teammate.</p>
            ) : (
              users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[11px] font-semibold text-ink-2">
                    {initials(user.name) || "?"}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px] font-medium text-ink">{user.name}</span>
                    <span className="block truncate text-[11.5px] text-ink-3">{user.email || "—"}</span>
                  </span>
                  <span className="shrink-0 text-[11.5px] text-ink-3">{user.role}</span>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Roles & permissions — IAM admin surface (clouduser only). Creating a
          role and changing its permissions both go through confirm dialogs. */}
      {canManageTeam && (
        <section aria-labelledby="roles-heading" className="rounded-card border border-line bg-surface">
          <div className="flex items-start justify-between gap-3 p-5 pb-0">
            <div className="min-w-0">
              <h3 id="roles-heading" className="flex items-center gap-1.5 text-[14px] font-semibold">
                <ShieldCheck size={14} aria-hidden className="text-ink-3" /> Roles &amp; permissions
              </h3>
              <p className="mt-1 text-[12.5px] text-ink-3">
                Define roles and choose what each one may do across the platform.
              </p>
            </div>
            <Button size="sm" onClick={() => setRoleOpen(true)}>
              New role
            </Button>
          </div>
          <div className="mt-3 divide-y divide-line border-t border-line">
            {roles.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-ink-3">
                No roles loaded yet — role definitions appear here once IAM answers.
              </p>
            ) : (
              roles.map((role) => (
                <div key={role.itemId} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="min-w-0 leading-tight">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">{role.name}</span>
                      {role.isBuiltIn && (
                        <span className="shrink-0 rounded-full bg-surface-hover px-2 py-0.5 text-[10.5px] text-ink-3">
                          Built-in
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[11.5px] text-ink-3">
                      {role.description || role.slug}
                    </span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setPermissionsFor(role.slug)}>
                    Permissions
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Appearance */}
      <section aria-labelledby="appearance-heading" className="rounded-card border border-line bg-surface p-5">
        <h3 id="appearance-heading" className="text-[14px] font-semibold">
          Appearance
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map((option) => {
            const active = theme === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex flex-col gap-1 rounded-ctl border p-3 text-left transition-colors",
                  active ? "border-accent bg-accent-soft/50" : "border-line hover:bg-surface-hover",
                )}
              >
                <span className="flex items-center gap-2 text-[13px] font-medium">
                  <Icon size={14} aria-hidden className={active ? "text-accent-ink" : "text-ink-3"} />
                  {option.label}
                </span>
                <span className="text-[11.5px] text-ink-3">{option.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Notifications */}
      <section aria-labelledby="notifications-heading" className="rounded-card border border-line bg-surface p-5">
        <h3 id="notifications-heading" className="text-[14px] font-semibold">
          Notifications
        </h3>
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {NOTIFICATIONS.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <span>
                <span className="block text-[13px] font-medium">{item.label}</span>
                <span className="block text-[12px] text-ink-3">{item.hint}</span>
              </span>
              <Switch
                checked={notifications[item.key]}
                onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                aria-label={item.label}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* Workspace */}
      <section aria-labelledby="workspace-heading" className="rounded-card border border-line bg-surface p-5">
        <h3 id="workspace-heading" className="text-[14px] font-semibold">
          Workspace
        </h3>
        <div className="mt-3 flex flex-col gap-1">
          <span id="landing-label" className="text-[12.5px] font-medium text-ink-2">
            Default landing page
          </span>
          <Select
            ariaLabel="Default landing page"
            value={defaultLanding}
            onValueChange={(v) => setDefaultLanding(v as "overview" | "tasks")}
            options={[
              { value: "overview", label: "Overview" },
              { value: "tasks", label: "My Tasks" },
            ]}
            className="w-full sm:w-64"
          />
          <p className="text-[11.5px] text-ink-3">Where FlowTask opens when you sign in (applies on next load).</p>
        </div>
      </section>

      <CreateOrgDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={createOrg}
        existingNames={organizations.map((org) => org.name)}
      />
      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={inviteUser}
        roleOptions={assignableRoles.length > 0 ? assignableRoles : roles.map((role) => role.slug)}
        existingEmails={users.map((user) => user.email.toLowerCase())}
      />
      <CreateRoleDialog
        open={roleOpen}
        onOpenChange={setRoleOpen}
        onCreate={createRole}
        existingSlugs={roles.map((role) => role.slug)}
      />
      <ManagePermissionsDialog
        slug={permissionsFor}
        onClose={() => setPermissionsFor(null)}
        onSave={saveRolePermissions}
        permissions={permissions}
      />
    </div>
  );
}

/**
 * Create-organization dialog — the human sign-off the tenant-mutating
 * `organizations.create` call lives behind. It restates exactly what will be
 * created (name, description) and does nothing until "Create" is pressed.
 */
function CreateOrgDialog({
  open,
  onOpenChange,
  onCreate,
  existingNames,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description?: string) => Promise<void>;
  existingNames: string[];
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const close = () => {
    onOpenChange(false);
    setName("");
    setDescription("");
    setError(undefined);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the organization a name.");
      return;
    }
    if (existingNames.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      setError("An organization with this name already exists.");
      return;
    }
    setSaving(true);
    try {
      await onCreate(trimmed, description.trim());
      toast.success("Organization created", trimmed);
      close();
    } catch {
      toast.error("Could not create the organization", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader
          title="New organization"
          description="Creates a workspace in this tenant. You can switch into it from the top bar."
        />
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 px-5 py-4">
          <Field label="Name" htmlFor="org-name" error={error}>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(undefined);
              }}
              placeholder="e.g. Acme Logistics"
              aria-invalid={!!error}
              aria-describedby={error ? "org-name-error" : undefined}
              autoFocus
            />
          </Field>
          <Field label="Description" htmlFor="org-description" hint="Optional — what this workspace is for.">
            <Textarea
              id="org-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A line about this workspace"
              rows={2}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create organization"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-center sm:gap-6">
      <span className="w-32 shrink-0 text-xs font-medium text-ink-3">{label}</span>
      <span className="min-w-0 break-all text-[13px] text-ink">{value || "—"}</span>
    </div>
  );
}

/**
 * Invite dialog — the human sign-off for `iam.users.create`. Restates who is
 * being invited and with which role before "Send invite" fires anything.
 */
function InviteUserDialog({
  open,
  onOpenChange,
  onInvite,
  roleOptions,
  existingEmails,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (email: string, firstName: string, lastName: string, roles: string[]) => Promise<void>;
  roleOptions: string[];
  existingEmails: string[];
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Default the picker once options arrive (async on first load).
  useEffect(() => {
    if (!role && roleOptions.length > 0) setRole(roleOptions[0]);
  }, [role, roleOptions]);

  const close = () => {
    onOpenChange(false);
    setEmail("");
    setFirstName("");
    setLastName("");
    setError(undefined);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    if (existingEmails.includes(trimmed)) {
      setError("Someone with this email is already in the team.");
      return;
    }
    if (!role) {
      setError("Pick a role for the invite.");
      return;
    }
    setSaving(true);
    try {
      await onInvite(trimmed, firstName.trim(), lastName.trim(), [role]);
      toast.success("Invite sent", `${trimmed} · ${role}`);
      close();
    } catch {
      toast.error("Could not send the invite", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader
          title="Invite user"
          description="Provisions a sign-in in this tenant and assigns the chosen role."
        />
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 px-5 py-4">
          <Field label="Email" htmlFor="invite-email" error={error}>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(undefined);
              }}
              placeholder="teammate@company.com"
              aria-invalid={!!error}
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" htmlFor="invite-first" hint="Optional">
              <Input id="invite-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field label="Last name" htmlFor="invite-last" hint="Optional">
              <Input id="invite-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
          </div>
          <Field label="Role" htmlFor="invite-role">
            <Select
              ariaLabel="Role"
              value={role}
              onValueChange={setRole}
              options={roleOptions.map((slug) => ({ value: slug, label: slug === "clouduser" ? "clouduser (Member)" : slug }))}
              className="w-full"
            />
          </Field>
          <p className="text-[11.5px] text-ink-3">
            This will create the account <span className="font-medium text-ink-2">{email.trim() || "—"}</span> with
            role <span className="font-medium text-ink-2">{role || "—"}</span>.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Inviting…" : "Send invite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Create-role dialog — the human sign-off for `iam.roles.create`. The slug is
 * derived from the name; duplicates are caught before the call.
 */
function CreateRoleDialog({
  open,
  onOpenChange,
  onCreate,
  existingSlugs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description?: string) => Promise<void>;
  existingSlugs: string[];
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const close = () => {
    onOpenChange(false);
    setName("");
    setDescription("");
    setError(undefined);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give the role a name.");
      return;
    }
    if (existingSlugs.includes(slug)) {
      setError("A role with this slug already exists.");
      return;
    }
    setSaving(true);
    try {
      await onCreate(name.trim(), description.trim());
      toast.success("Role created", name.trim());
      close();
    } catch {
      toast.error("Could not create the role", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader
          title="New role"
          description="Defines a role you can then grant permissions to and assign to users."
        />
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 px-5 py-4">
          <Field label="Name" htmlFor="role-name" error={error}>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(undefined);
              }}
              placeholder="e.g. Project manager"
              aria-invalid={!!error}
              autoFocus
            />
          </Field>
          <Field label="Description" htmlFor="role-description" hint="Optional — what this role is for.">
            <Textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A line about this role"
              rows={2}
            />
          </Field>
          <p className="text-[11.5px] text-ink-3">
            Creates role <span className="font-medium text-ink-2">{slug || "—"}</span> with no permissions yet — open
            its Permissions right after to choose what it may do.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create role"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Manage-permissions dialog — the human sign-off for `iam.roles.assignPermissions`.
 * The admin builds the delta with checkboxes (nothing is sent while ticking),
 * sees a "+N / −M" summary, and only "Save changes" fires the call.
 */
function ManagePermissionsDialog({
  slug,
  onClose,
  onSave,
  permissions,
}: {
  slug: string | null;
  onClose: () => void;
  onSave: (slug: string, addIds: string[], removeIds: string[]) => Promise<void>;
  permissions: PermissionInfo[];
}) {
  const [current, setCurrent] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  // The catalog rides in on first open, not at boot — the workspace load
  // must not pay for the role editor's data.
  const permissionsLoading = useDataStore((s) => s.permissionsLoading);
  const ensurePermissions = useDataStore((s) => s.ensurePermissions);

  // Fresh open: load the role's current permission ids from IAM.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setSearch("");
    void ensurePermissions();
    listRolePermissionIds(slug)
      .then((ids) => {
        if (cancelled) return;
        const set = new Set(ids);
        setCurrent(set);
        setChecked(new Set(set));
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load the role's permissions", "Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const byGroup = useMemo(() => {
    const groups = new Map<string, PermissionInfo[]>();
    for (const permission of permissions) {
      const key = permission.resourceGroup || "Other";
      const list = groups.get(key) ?? [];
      list.push(permission);
      groups.set(key, list);
    }
    for (const list of groups.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);

  const term = search.trim().toLowerCase();
  const matches = (permission: PermissionInfo) =>
    !term ||
    permission.name.toLowerCase().includes(term) ||
    permission.resource.toLowerCase().includes(term);

  const toggle = (itemId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const adds = [...checked].filter((id) => !current.has(id));
  const removes = [...current].filter((id) => !checked.has(id));
  const dirty = adds.length > 0 || removes.length > 0;

  const onSaveClick = async () => {
    if (!slug || !dirty) return;
    setSaving(true);
    try {
      await onSave(slug, adds, removes);
      toast.success("Permissions updated", `${slug}: +${adds.length} / −${removes.length}`);
      onClose();
    } catch {
      toast.error("Could not update permissions", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!slug} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg" aria-describedby={undefined}>
        <DialogHeader
          title={slug ? `Permissions — ${slug}` : "Permissions"}
          description="Tick what this role may do. API permissions gate the endpoints; UI ones gate visible controls."
        />
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 py-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter permissions…"
            aria-label="Filter permissions"
          />
          {loading || permissionsLoading ? (
            <p className="py-8 text-center text-[13px] text-ink-3">Loading permissions…</p>
          ) : permissions.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-3">No permissions available.</p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-ctl border border-line">
              {byGroup.map(([group, list]) => {
                const visible = list.filter(matches);
                if (visible.length === 0) return null;
                return (
                  <div key={group} className="border-b border-line last:border-b-0">
                    <p className="sticky top-0 bg-surface px-3 py-1.5 text-[11px] font-semibold tracking-wide text-ink-3">
                      {group}
                    </p>
                    <ul className="pb-1">
                      {visible.map((permission) => (
                        <li key={permission.itemId}>
                          <label className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-[12.5px] transition-colors hover:bg-surface-hover">
                            <input
                              type="checkbox"
                              checked={checked.has(permission.itemId)}
                              onChange={() => toggle(permission.itemId)}
                              className="h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
                            />
                            <span className="min-w-0 flex-1 truncate text-ink">{permission.name}</span>
                            {permission.type === 1 && (
                              <span className="shrink-0 rounded-full bg-surface-hover px-1.5 py-0.5 text-[10px] text-ink-3">
                                API
                              </span>
                            )}
                            {permission.type === 2 && (
                              <span className="shrink-0 rounded-full bg-surface-hover px-1.5 py-0.5 text-[10px] text-ink-3">
                                UI
                              </span>
                            )}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11.5px] text-ink-3" aria-live="polite">
              {dirty ? (
                <>
                  Pending change: <span className="font-medium text-ok">+{adds.length}</span>{" "}
                  <span className="font-medium text-danger">−{removes.length}</span>
                </>
              ) : (
                "No changes yet."
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" disabled={!dirty || saving} onClick={onSaveClick}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
