import { formatDistanceToNow } from "date-fns";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { activityMeta } from "@/lib/meta";
import { Avatar } from "@/components/ui/Avatar";
import { cn, parseDate } from "@/lib/utils";

/** Latest workspace events; the full list lives in the bell's notification panel. */
export function ActivityFeed({ className }: { className?: string }) {
  const activities = useDataStore((s) => s.activities);
  const users = useDataStore((s) => s.users);
  const openTask = useUiStore((s) => s.openTask);
  const setNotificationsOpen = useUiStore((s) => s.setNotificationsOpen);
  const recent = [...activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  return (
    <section aria-label="Recent activity" className={cn("rounded-card border border-line bg-surface p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13.5px] font-semibold">Activity</h2>
        <button
          type="button"
          onClick={() => setNotificationsOpen(true)}
          className="rounded-[4px] text-[12px] font-medium text-accent-ink outline-none hover:underline"
        >
          View all
        </button>
      </div>
      <ul className="flex flex-col gap-3">
        {recent.map((activity) => {
          const actor = users.find((u) => u.id === activity.actorId);
          const Icon = activityMeta[activity.kind].icon;
          const clickable = !!activity.taskId;
          const body = (
            <>
              <span
                className={cn(
                  "mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                  activity.read ? "border-line bg-surface text-ink-3" : "border-accent-soft-line bg-accent-soft text-accent-ink",
                )}
              >
                <Icon size={12} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-[12.5px] leading-snug", activity.read ? "text-ink-2" : "font-medium text-ink")}>
                  {actor && <Avatar user={actor} size="xs" className="mr-1.5 -mb-0.5 inline-flex" />}
                  {actor ? `${actor.name.split(" ")[0]} ` : ""}
                  {activity.message}
                </span>
                <span className="tnum mt-0.5 block text-[11px] text-ink-3">
                  {formatDistanceToNow(parseDate(activity.createdAt), { addSuffix: true })}
                </span>
              </span>
            </>
          );
          return (
            <li key={activity.id} className="flex items-start gap-2.5">
              {clickable ? (
                <button type="button" onClick={() => openTask(activity.taskId!)} className="flex items-start gap-2.5 text-left transition-opacity hover:opacity-80">
                  {body}
                </button>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
