import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { join } from "node:path";

function loadEnvFile() {
  const envPath = join(__dirname, ".env");
  const env: Record<string, string> = {};
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m) env[m[1]] = m[2];
    }
  }
  return env;
}

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const env = loadEnvFile();
const devHost = process.env.VITE_BLOCKS_DEV_HOST || env.VITE_BLOCKS_DEV_HOST || "localhost";
const devPort = Number(
  process.env.VITE_BLOCKS_DEV_PORT || env.VITE_BLOCKS_DEV_PORT || 5173,
);

const keyPath = join(__dirname, ".cert", "dev-key.pem");
const certPath = join(__dirname, ".cert", "dev-cert.pem");
const httpsConfig =
  existsSync(keyPath) && existsSync(certPath)
    ? { key: readFileSync(keyPath), cert: readFileSync(certPath) }
    : undefined;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: devHost,
    port: devPort,
    // The port is baked into the registered OIDC redirect URI — no fallback.
    strictPort: true,
    https: httpsConfig,
    allowedHosts: [devHost, "localhost"],
  },
});
