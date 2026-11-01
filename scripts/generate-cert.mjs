/**
 * Generates the self-signed dev certificate for running the app over HTTPS on
 * its real Blocks domain (required for hosted IAM login — plain HTTP and
 * localhost never receive the Secure, domain-scoped session cookie).
 *
 * Reads the domain from (in order): CLI arg (`npm run cert -- <domain>`),
 * process.env.VITE_BLOCKS_DEV_HOST, or the app's `.env` file.
 * Writes `.cert/dev-key.pem` and `.cert/dev-cert.pem`. Pure Node — no OpenSSL.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import selfsigned from "selfsigned";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readDevHostFromEnvFile() {
  const envPath = join(appRoot, ".env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((l) => /^VITE_BLOCKS_DEV_HOST=/.test(l));
  return line?.split("=").slice(1).join("=").trim() || undefined;
}

const host =
  process.argv[2] ||
  process.env.VITE_BLOCKS_DEV_HOST ||
  readDevHostFromEnvFile();

if (!host) {
  console.error(
    "No domain given. Set VITE_BLOCKS_DEV_HOST in .env, or run: npm run cert -- <domain>",
  );
  process.exit(1);
}

const notBefore = new Date();
const notAfter = new Date(notBefore);
notAfter.setDate(notAfter.getDate() + 825);

const pems = await selfsigned.generate(
  [{ name: "commonName", value: host }],
  {
    notBeforeDate: notBefore,
    notAfterDate: notAfter,
    keySize: 2048,
    extensions: [
      {
        name: "subjectAltName",
        altNames: [
          { type: 2, value: host },
          { type: 2, value: "localhost" },
          { type: 7, ip: "127.0.0.1" },
        ],
      },
    ],
  },
);

const certDir = join(appRoot, ".cert");
mkdirSync(certDir, { recursive: true });
writeFileSync(join(certDir, "dev-key.pem"), pems.private);
writeFileSync(join(certDir, "dev-cert.pem"), pems.cert);

console.log(`Dev certificate written for ${host}`);
console.log(`  ${join(certDir, "dev-key.pem")}`);
console.log(`  ${join(certDir, "dev-cert.pem")}`);
console.log("");
console.log("Trust the cert (optional, kills the browser warning):");
console.log("  Windows (elevated prompt): certutil -addstore -f Root .cert\\dev-cert.pem");
console.log("  macOS: sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain .cert/dev-cert.pem");
console.log("  Linux: sudo cp .cert/dev-cert.pem /usr/local/share/ca-certificates/blocks-dev.crt && sudo update-ca-certificates");
console.log("Restart the browser afterwards. Never commit .cert/.");
