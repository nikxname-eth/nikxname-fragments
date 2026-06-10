import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), '.env'));
loadEnvFile(resolve(process.cwd(), '.env.production'));
loadEnvFile(resolve(process.cwd(), '.env.local'));

const required = [
  {
    name: 'NEXT_PUBLIC_MANIFOLD_CLIENT_ID',
    hint: 'Create an app at https://developer.manifoldxyz.dev/ (redirect URI: https://nikxart.xyz)',
  },
  {
    name: 'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
    hint: 'Create a project at https://cloud.walletconnect.com (required for iPhone wallet login)',
    pattern: /^[a-f0-9]{32}$/i,
    patternHint: '32-character hex project ID',
  },
];

const missing = [];
const invalid = [];

for (const { name, hint, pattern, patternHint } of required) {
  const value = process.env[name]?.trim() ?? '';

  if (!value) {
    missing.push({ name, hint });
    continue;
  }

  if (pattern && !pattern.test(value)) {
    invalid.push({ name, patternHint, value: `${value.slice(0, 8)}…` });
  }
}

if (missing.length || invalid.length) {
  console.error('\n✖ Build blocked — required environment variables are missing or invalid.\n');
  console.error('Static export bakes NEXT_PUBLIC_* into JS at build time.');
  console.error('Without WalletConnect ID, mobile users get sent to Coinbase instead of their wallet.');
  console.error('Set these in .env.local (local) and Cloudflare Pages → Settings → Environment variables (production).\n');

  for (const { name, hint } of missing) {
    console.error(`  • ${name} — not set`);
    console.error(`    ${hint}`);
  }

  for (const { name, patternHint, value } of invalid) {
    console.error(`  • ${name} — invalid (${patternHint}), got "${value}"`);
  }

  console.error('');
  process.exit(1);
}

console.log('✓ Build environment OK (Manifold client ID + WalletConnect project ID)');