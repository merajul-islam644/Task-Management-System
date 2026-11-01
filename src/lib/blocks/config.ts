/** Blocks configuration, read once from Vite env vars. See `.env` at the app root. */

function env(name: string): string | undefined {
  const value = import.meta.env[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export const blocksConfig = {
  apiUrl: env("VITE_BLOCKS_API_URL"),
  appDomain: env("VITE_BLOCKS_APP_DOMAIN"),
  xBlocksKey: env("VITE_BLOCKS_KEY"),
  oidc: {
    clientId: env("VITE_BLOCKS_OIDC_CLIENT_ID"),
    url: env("VITE_BLOCKS_OIDC_URL"),
  },
};

/** True when every value the hosted-login flow needs is present. */
export function isLoginConfigured(): boolean {
  return Boolean(
    blocksConfig.apiUrl &&
      blocksConfig.xBlocksKey &&
      blocksConfig.oidc.url &&
      blocksConfig.oidc.clientId,
  );
}
