import type { BlocksOidcUserInfo } from "@seliseblocks/client";
import { blocksClient } from "./client";
import { isLoginConfigured } from "./config";

const RETURN_TO_KEY = "flowtask.blocks.returnTo";

/** Stash the intended destination, then send the browser to the hosted login. */
export async function startLogin(returnTo: string = "/"): Promise<void> {
  if (!isLoginConfigured()) {
    throw new Error(
      "Login is not configured. Set VITE_BLOCKS_KEY, VITE_BLOCKS_API_URL, VITE_BLOCKS_OIDC_URL and VITE_BLOCKS_OIDC_CLIENT_ID in .env.",
    );
  }
  sessionStorage.setItem(RETURN_TO_KEY, returnTo);
  await blocksClient.auth.idp.redirectToProvider();
}

export type CompleteLoginResult = {
  ok: boolean;
  returnTo: string;
  message?: string;
};

/**
 * Finish the OIDC round-trip. On the default cookie flow IAM sets the session
 * as a Secure, httpOnly cookie and returns no token in the body — nothing is
 * stored locally; the follow-up `refresh()` confirms the cookie actually landed.
 */
export async function completeLogin(callbackUrl: string): Promise<CompleteLoginResult> {
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY) ?? "/";
  sessionStorage.removeItem(RETURN_TO_KEY);
  try {
    const response = await blocksClient.auth.idp.callback(callbackUrl);
    if (response.error) {
      return { ok: false, returnTo, message: response.error_description || response.error };
    }
    return { ok: true, returnTo };
  } catch (error) {
    return {
      ok: false,
      returnTo,
      message: error instanceof Error ? error.message : "Sign-in failed.",
    };
  }
}

/**
 * Ask IAM directly — the only source of truth; no token is ever kept locally.
 * `userInfo()` resolves even on 401 (the SDK's `json()` never throws on non-2xx),
 * so the raw-status check `isAuthenticated()` decides the session first.
 * Returns null when signed out.
 */
export async function fetchSessionClaims(): Promise<BlocksOidcUserInfo | null> {
  const authenticated = await blocksClient.auth.isAuthenticated();
  if (!authenticated) return null;
  return blocksClient.auth.userInfo();
}

/** End the session server-side; the IAM session cookie is cleared by IAM. */
export async function logout(): Promise<void> {
  try {
    await blocksClient.auth.logout();
  } catch {
    // Already signed out (e.g. expired session) — the refresh below settles state.
  }
}
