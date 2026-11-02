/**
 * Blocks mutation endpoints answer HTTP 200 with a JSON envelope that carries
 * the real outcome: `isSuccess: false` plus an `errors` map. The SDK only
 * throws on non-2xx statuses, so a rejected mutation resolves normally —
 * every mutating service call runs its response through `assertSuccess`
 * before reporting success to the UI.
 */
export function assertSuccess(response: unknown): void {
  if (!response || typeof response !== "object") return;
  const record = response as Record<string, unknown>;
  // Protocol failures resolve as a body with a bare `error` string (a 401
  // `session_expired`, a captcha demand) — the SDK never throws on non-2xx,
  // so without this a dead session reports success. `errors` (plural) on a
  // 200 envelope is a different shape; `error` singular is always the
  // failure one.
  if (typeof record.error === "string" && record.error.length > 0) {
    throw new Error(
      record.error === "session_expired"
        ? "Your session has expired — sign in again."
        : `The platform rejected this change (${record.error}).`,
    );
  }
  if (record.isSuccess !== false) return;
  const errors = record.errors;
  const first =
    errors && typeof errors === "object"
      ? Object.values(errors).find((message): message is string => typeof message === "string" && message.length > 0)
      : undefined;
  throw new Error(first || "The platform rejected this change.");
}
