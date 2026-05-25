#!/usr/bin/env node
// Postinstall hook — runs after `npm install @cyberworld/praxikon` in a
// consumer repo. Detects dev-mode (installing in our own repo) and skips.
// Wraps scaffold in try/catch so a scaffold failure never breaks `npm install`.

import { scaffold, detectConsumerRoot } from './scaffold.mjs';

const consumerRoot = detectConsumerRoot();
if (!consumerRoot) {
  // Dev-mode install or detection failed; silent skip.
  process.exit(0);
}

try {
  scaffold({ consumerRoot, verbose: true });
} catch (err) {
  console.error('[praxikon] postinstall scaffold failed (non-fatal):');
  console.error('  ' + (err && err.message ? err.message : err));
  console.error('  Run `npx praxikon init` manually to retry.');
  // Exit 0 — never break the consumer's `npm install` because of us.
  process.exit(0);
}
