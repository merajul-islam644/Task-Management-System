import { createBlocksClient } from "@seliseblocks/client";
import { blocksConfig } from "./config";

/**
 * The single Blocks SDK instance for this app. Every Blocks call goes through
 * it — never hand-roll fetch/curl against a Blocks API from application code.
 * `redirectUri` is left at the SDK default (`<origin>/login/callback`), which
 * matches the OIDC client registrations for both the dev and prod origins.
 */
export const blocksClient = createBlocksClient({
  apiUrl: blocksConfig.apiUrl ?? "",
  appDomain: blocksConfig.appDomain,
  xBlocksKey: blocksConfig.xBlocksKey ?? "",
  oidc: {
    clientId: blocksConfig.oidc.clientId ?? "",
    url: blocksConfig.oidc.url ?? "",
  },
});
