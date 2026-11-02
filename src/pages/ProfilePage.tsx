import { useEffect, useRef, useState } from "react";
import { Camera, KeyRound, Loader2, Pencil, UserRound } from "lucide-react";
import { useAuth, useDisplayName } from "@/app/providers/AuthProvider";
import { useDataStore } from "@/store/data";
import { useAvatarUrl } from "@/lib/avatar";
import { initials } from "@/lib/utils";
import { toast } from "@/store/toast";
import { AVATAR_MAX_FILE_BYTES } from "@/services/avatarService";
import * as accountService from "@/services/accountService";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Input";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
      <span className="w-32 shrink-0 text-xs font-medium text-ink-3">{label}</span>
      <span className="min-w-0 break-all text-[13px] text-ink">{value || "—"}</span>
    </div>
  );
}

/** Identity card with photo upload, self-service name edit (IAM /me) and a
    password change — the signed-in user managing their own account. */
export function ProfilePage() {
  const { claims, refresh } = useAuth();
  const avatarFileId = useDataStore((s) => s.avatarFileId);
  const uploadAvatar = useDataStore((s) => s.uploadAvatar);
  const reloadCore = useDataStore((s) => s.reloadCore);
  const avatarUrl = useAvatarUrl(avatarFileId || undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
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
          <Button variant="ghost" size="sm" onClick={() => setNameOpen(true)}>
            <Pencil size={14} aria-hidden />
            Edit name
          </Button>
        </div>
        <div className="divide-y divide-line">
          <Row label="Full name" value={claims?.name?.trim() ?? ""} />
          <Row label="Email" value={claims?.email ?? ""} />
          <Row label="Account id" value={claims?.sub ?? ""} />
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface">
        <div className="border-b border-line px-4 py-3.5">
          <p className="text-[14px] font-semibold text-ink">Account security</p>
          <p className="mt-0.5 text-xs text-ink-2">
            Change the password for this account without leaving the app.
          </p>
        </div>
        <div className="divide-y divide-line border-t border-line">
          <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
            <span className="w-32 shrink-0 text-xs font-medium text-ink-3">Password</span>
            <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-ink-2">
              <KeyRound size={14} aria-hidden className="shrink-0 text-ink-3" />
              Last changed by you — pick something you don't use elsewhere.
            </span>
            <Button variant="ghost" size="sm" onClick={() => setPasswordOpen(true)}>
              Change password
            </Button>
          </div>
        </div>
      </section>

      <p className="flex items-center gap-1.5 text-xs text-ink-3">
        <UserRound size={13} aria-hidden />
        Your name and password live in this workspace's IAM account. The photo is stored in
        Blocks storage and shown next to your actions.
      </p>

      <EditNameDialog
        open={nameOpen}
        onOpenChange={setNameOpen}
        fallbackName={displayName}
        onSaved={async () => {
          // The session claims and the workspace member list both carry the
          // name — refresh both so the top bar and pickers follow.
          await refresh();
          await reloadCore();
        }}
      />
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </div>
  );
}

/** Self-service name edit through `iam.updateMe` — the backend resolves the
    account from the token, so no user id is ever sent. */
function EditNameDialog({
  open,
  onOpenChange,
  fallbackName,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fallbackName: string;
  onSaved: () => Promise<void>;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // The authoritative spelling lives in the IAM record; claims.name can lag.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setError(undefined);
    accountService
      .getMyAccount()
      .then((account) => {
        if (!alive) return;
        const parts = fallbackName.split(/\s+/);
        setFirstName(account.firstName || parts[0] || "");
        setLastName(account.lastName || parts.slice(1).join(" ") || "");
      })
      .catch(() => {
        // The dialog still opens with what the session claims say.
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, fallbackName]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await accountService.updateMyName(firstName.trim(), lastName.trim());
      await onSaved();
      toast.success("Name updated", "Your account name has been changed.");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        "Could not update the name",
        err instanceof Error && err.message ? err.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader
          title="Edit name"
          description="Changes your IAM account name — the sign-in session picks it up right away."
        />
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" htmlFor="me-first" error={error}>
              <Input
                id="me-first"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (error) setError(undefined);
                }}
                placeholder="e.g. Meraj"
                disabled={loading}
                autoFocus
              />
            </Field>
            <Field label="Last name" htmlFor="me-last" hint="Optional">
              <Input
                id="me-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Zoarder"
                disabled={loading}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving || loading}>
              {saving ? "Saving…" : "Save name"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Authenticated password change through `auth.changePassword`. The confirm
    field is a UI-only check — IAM only ever receives the new password. */
function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(undefined);
  }, [open]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!currentPassword || !newPassword) {
      setError("Fill in both the current and the new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("The new password must differ from the current one.");
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await accountService.changeMyPassword(currentPassword, newPassword);
      toast.success("Password changed", "Use the new password the next time you sign in.");
      onOpenChange(false);
    } catch (err) {
      // IAM reports failures with an empty errors map — the current password
      // is by far the usual cause, so make the hint concrete.
      const message = err instanceof Error && err.message ? err.message : "";
      const generic = !message || message.startsWith("The platform rejected");
      toast.error(
        "Could not change the password",
        generic
          ? "Check the current password and try again — the new one must also meet the sign-in policy."
          : message,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader
          title="Change password"
          description="Your current password proves it's you; the new one takes effect on your next sign-in."
        />
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 px-5 py-4">
          <Field label="Current password" htmlFor="pw-current" error={error}>
            <Input
              id="pw-current"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (error) setError(undefined);
              }}
              autoComplete="current-password"
              autoFocus
            />
          </Field>
          <Field label="New password" htmlFor="pw-new">
            <Input
              id="pw-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password" htmlFor="pw-confirm">
            <Input
              id="pw-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Changing…" : "Change password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
