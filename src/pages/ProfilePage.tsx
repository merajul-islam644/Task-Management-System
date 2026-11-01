import { useRef, useState } from "react";
import { Camera, Loader2, UserRound } from "lucide-react";
import { useAuth, useDisplayName } from "@/app/providers/AuthProvider";
import { useDataStore } from "@/store/data";
import { useAvatarUrl } from "@/lib/avatar";
import { initials } from "@/lib/utils";
import { toast } from "@/store/toast";
import { AVATAR_MAX_FILE_BYTES } from "@/services/avatarService";
import { Button } from "@/components/ui/Button";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
      <span className="w-32 shrink-0 text-xs font-medium text-ink-3">{label}</span>
      <span className="min-w-0 break-all text-[13px] text-ink">{value || "—"}</span>
    </div>
  );
}

/** Read-only identity view plus a profile-picture upload backed by Blocks Storage. */
export function ProfilePage() {
  const { claims } = useAuth();
  const avatarFileId = useDataStore((s) => s.avatarFileId);
  const uploadAvatar = useDataStore((s) => s.uploadAvatar);
  const avatarUrl = useAvatarUrl(avatarFileId || undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const displayName = useDisplayName();

  async function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file twice still fires onChange.
    event.target.value = "";
    if (!file) return;
    if (file.size > AVATAR_MAX_FILE_BYTES) {
      toast.error("Image too large", "Please pick an image under 5 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Not an image", "Please pick a JPG, PNG or WebP file.");
      return;
    }
    setUploading(true);
    try {
      await uploadAvatar(file);
      toast.success("Profile photo updated", file.name);
    } catch (error) {
      toast.error(
        "Could not upload the photo",
        error instanceof Error && error.message ? error.message : "Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6">
      <header>
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Profile</h2>
        <p className="mt-1 text-[13.5px] text-ink-2">
          Your identity in this workspace, as issued by the sign-in session.
        </p>
      </header>

      <section className="rounded-card border border-line bg-surface">
        <div className="flex items-center gap-3.5 border-b border-line px-4 py-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-solid text-sm font-semibold text-on-accent">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" draggable={false} />
            ) : (
              initials(displayName) || "?"
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">{displayName}</p>
            <p className="truncate text-xs text-ink-2">{claims?.email || "No email in session claims"}</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void onPickFile(event)}
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Camera size={14} aria-hidden />}
            {uploading ? "Uploading…" : "Change photo"}
          </Button>
        </div>
        <div className="divide-y divide-line">
          <Row label="Full name" value={claims?.name?.trim() ?? ""} />
          <Row label="Email" value={claims?.email ?? ""} />
          <Row label="Account id" value={claims?.sub ?? ""} />
        </div>
      </section>

      <p className="flex items-center gap-1.5 text-xs text-ink-3">
        <UserRound size={13} aria-hidden />
        Your name comes from the sign-in session. The photo is stored in this workspace's
        Blocks storage and shown next to your actions.
      </p>
    </div>
  );
}
