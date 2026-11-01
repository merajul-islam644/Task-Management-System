import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useUiStore, type ThemeSetting } from "@/store/ui";
import { toast } from "@/store/toast";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

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
    </div>
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
