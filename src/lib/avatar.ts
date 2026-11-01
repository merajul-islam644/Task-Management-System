import { useEffect, useState } from "react";
import * as avatarService from "@/services/avatarService";

/**
 * file id → download URL cache. Provider URLs are pre-signed and expire, so
 * entries refresh a minute ahead of the storage config's 5-minute expiry.
 */

const TTL_MS = 4 * 60 * 1000;

const cache = new Map<string, { url: string; at: number }>();

async function resolveCached(fileId: string): Promise<string> {
  const hit = cache.get(fileId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.url;
  const url = await avatarService.resolveAvatarUrl(fileId);
  if (url) cache.set(fileId, { url, at: Date.now() });
  return url;
}

/** Drop a cached URL (e.g. after the underlying file is replaced or removed). */
export function invalidateAvatar(fileId: string | undefined) {
  if (fileId) cache.delete(fileId);
}

/** Resolve and return the download URL for an avatar file id, "" while loading/absent. */
export function useAvatarUrl(fileId: string | undefined): string {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!fileId) {
      setUrl("");
      return;
    }
    let cancelled = false;
    resolveCached(fileId)
      .then((next) => {
        if (!cancelled) setUrl(next);
      })
      .catch(() => {
        // Unresolvable (permissions, deleted) — components keep the initials.
      });
    return () => {
      cancelled = true;
    };
  }, [fileId]);
  return url;
}
