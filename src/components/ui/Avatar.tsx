import { cn, initials } from "@/lib/utils";
import { hueMeta } from "@/lib/meta";
import { useDataStore } from "@/store/data";
import { useAvatarUrl } from "@/lib/avatar";
import type { User } from "@/types";

const sizes = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-7 w-7 text-[11px]",
  lg: "h-9 w-9 text-[13px]",
} as const;

export function Avatar({
  user,
  src,
  size = "md",
  className,
}: {
  user: User | undefined;
  /** Optional photo URL; when set it wins over the stored profile picture. */
  src?: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  // Every member's picture ships with the workspace load; the component
  // resolves its own so call sites never fetch per-avatar.
  const fileId = useDataStore((s) => (user ? s.avatarFileIds[user.id] : undefined));
  const storedUrl = useAvatarUrl(fileId || undefined);
  const photo = src || storedUrl;

  if (!user) {
    return (
      <span
        aria-hidden
        className={cn("inline-flex items-center justify-center rounded-full bg-surface-hover text-ink-3", sizes[size], className)}
      >
        ?
      </span>
    );
  }
  return (
    <span
      title={user.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        photo ? "bg-surface-hover" : hueMeta[user.hue].soft,
        photo ? "text-ink-3" : hueMeta[user.hue].text,
        sizes[size],
        className,
      )}
    >
      {photo ? (
        <img src={photo} alt={user.name} className="h-full w-full object-cover" draggable={false} />
      ) : (
        initials(user.name)
      )}
    </span>
  );
}

export function AvatarStack({
  users,
  max = 4,
  size = "sm",
}: {
  users: User[];
  max?: number;
  size?: keyof typeof sizes;
}) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <span className="inline-flex items-center">
      {shown.map((user, i) => (
        <Avatar
          key={user.id}
          user={user}
          size={size}
          className={cn("ring-2 ring-surface", i > 0 && "-ml-1.5")}
        />
      ))}
      {rest > 0 ? (
        <span
          className={cn(
            "-ml-1.5 inline-flex items-center justify-center rounded-full bg-surface-hover font-medium text-ink-2 ring-2 ring-surface",
            sizes[size],
          )}
          title={`${rest} more member${rest === 1 ? "" : "s"}`}
        >
          +{rest}
        </span>
      ) : null}
    </span>
  );
}
