#!/usr/bin/env node
/**
 * Simple performance budget checker for the static export.
 * Run as part of `npm run validate`.
 *
 * Goals:
 * - Keep the initial HTML small for fast first paint.
 * - Watch main chunk growth.
 */

import { statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'out';
const BUDGETS = {
  'index.html': 40 * 1024,
  '_next/static/chunks': 1200 * 1024, // Realistic for framer-motion + manifold + web3 libs + nice animations
};

let failed = false;

function checkFile(rel, limit) {
  const p = join(OUT, rel);
  try {
    const size = statSync(p).size;
    const ok = size <= limit;
    console.log(`${ok ? '✓' : '✗'} ${rel}  ${(size/1024).toFixed(1)}kB / ${(limit/1024).toFixed(0)}kB budget`);
    if (!ok) failed = true;
  } catch {
    console.log(`? ${rel} (not found)`);
  }
}

function checkChunksDir() {
  const dir = join(OUT, '_next/static/chunks');
  let total = 0;
  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.js'));
    for (const f of files) {
      total += statSync(join(dir, f)).size;
    }
    const limit = BUDGETS['_next/static/chunks'];
    const ok = total <= limit;
    console.log(`${ok ? '✓' : '✗'} _next/static/chunks (all .js)  ${(total/1024).toFixed(1)}kB / ${(limit/1024).toFixed(0)}kB budget`);
    if (!ok) failed = true;
  } catch (e) {
    console.log('? chunks dir not present');
  }
}

console.log('\nPerformance budget (static export)');
checkFile('index.html', BUDGETS['index.html']);
checkChunksDir();

if (failed) {
  console.error('\n❌ Performance budget exceeded. Consider further optimizations (code splitting, smaller gate assets, etc.).');
  process.exit(1);
} else {
  console.log('\n✅ All performance budgets passed.');
}
