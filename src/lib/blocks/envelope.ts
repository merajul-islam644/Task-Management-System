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
  if (record.isSuccess !== false) return;
  const errors = record.errors;
  const first =
    errors && typeof errors === "object"
      ? Object.values(errors).find((message): message is string => typeof message === "string" && message.length > 0)
      : undefined;
  throw new Error(first || "The platform rejected this change.");
}
