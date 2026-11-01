import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { activityMeta } from "@/lib/meta";
import { useI18n } from "@/lib/i18n";
import { IconButton } from "@/components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Tooltip } from "@/components/ui/Tooltip";
import { Avatar } from "@/components/ui/Avatar";
import { cn, parseDate } from "@/lib/utils";

/**
 * The workspace's only notifications surface: a panel that pops out of the
 * topbar bell, backed by the real Blocks Notifier inbox — server-side, so it
 * survives sessions and devices.
 */
export function NotificationBell() {
  const notifications = useDataStore((s) => s.notifications);
  const users = useDataStore((s) => s.users);
  const projects = useDataStore((s) => s.projects);
  const markRead = useDataStore((s) => s.markNotificationRead);
  const markAllRead = useDataStore((s) => s.markAllNotificationsRead);
  const openTask = useUiStore((s) => s.openTask);
  const open = useUiStore((s) => s.notificationsOpen);
  const setOpen = useUiStore((s) => s.setNotificationsOpen);
  const { t } = useI18n();
  const [markingAll, setMarkingAll] = useState(false);

  const sorted = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unreadCount = notifications.filter((a) => !a.read).length;

  async function onMarkAllRead() {
    setMarkingAll(true);
    try {
      await markAllRead();
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip
        content={unreadCount > 0 ? `${t("nav.inbox", "Inbox")}, ${unreadCount} unread` : t("nav.inbox", "Inbox")}
      >
        <PopoverTrigger asChild>
          <IconButton label={t("nav.inbox", "Inbox")} className="relative">
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                aria-hidden
                className="tnum absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-0.5 text-[9px] font-semibold text-white"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </IconButton>
        </PopoverTrigger>
      </Tooltip>

      <PopoverContent
        align="end"
        className="w-[330px] max-w-[calc(100vw-1.5rem)] p-0"
        aria-label={t("nav.inbox", "Inbox")}
      >
        <header className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
          <p className="flex items-baseline gap-2 text-[13px] font-semibold text-ink">
            {t("nav.inbox", "Inbox")}
            {unreadCount > 0 && (
              <span className="tnum text-[11.5px] font-normal text-ink-3">{unreadCount} unread</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => void onMarkAllRead()}
            disabled={unreadCount === 0 || markingAll}
            className="flex items-center gap-1 rounded-[4px] text-[12px] font-medium text-accent-ink outline-none transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-40"
          >
            <CheckCheck size={13} aria-hidden />
            {t("action.markAllRead", "Mark all read")}
          </button>
        </header>

        <div className="max-h-[340px] overflow-y-auto">
          {sorted.length === 0 ? (
            <p className="px-4 py-9 text-center text-[12.5px] text-ink-3">
              {t("notif.allCaughtUp", "You're all caught up")}
            </p>
          ) : (
            <ul role="list">
              {sorted.map((activity) => {
                const actor = users.find((u) => u.id === activity.actorId);
                const Icon = activityMeta[activity.kind]?.icon ?? activityMeta.project_update.icon;
                const project = projects.find((p) => p.id === activity.projectId);
                return (
                  <li key={activity.id} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!activity.read) void markRead(activity.id);
                        if (activity.taskId) openTask(activity.taskId);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-hover/60",
                        !activity.read && "bg-accent-soft/25",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full border",
                          activity.read
                            ? "border-line bg-surface text-ink-3"
                            : "border-accent-soft-line bg-accent-soft text-accent-ink",
                        )}
                      >
                        <Icon size={12} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          {!activity.read && (
                            <span aria-label="Unread" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          )}
                          <span
                            className={cn(
                              "text-[12.5px] leading-snug",
                              activity.read ? "text-ink-2" : "font-medium text-ink",
                            )}
                          >
                            {actor && <Avatar user={actor} size="xs" className="mr-1 inline-flex -translate-y-px" />}
                            {actor ? `${actor.name.split(" ")[0]} ` : ""}
                            {activity.message}
                          </span>
                        </span>
                        <span className="tnum mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-3">
                          {formatDistanceToNow(parseDate(activity.createdAt), { addSuffix: true })}
                          {project && <span>in {project.name}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
