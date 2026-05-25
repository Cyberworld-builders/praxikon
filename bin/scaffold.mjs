// Scaffold logic for Praxikon: when a consumer repo installs
// `@cyberworld/praxikon`, this creates the local vernacular layer +
// drops the skill in `.claude/skills/` + suggests CLAUDE.md additions.
//
// Called from two places:
//   - bin/praxikon.mjs (manual `npx praxikon init`)
//   - postinstall hook (auto, only when installing as a real dep)
//
// Idempotent: re-running never overwrites existing files.

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '..');
const TEMPLATES_DIR = join(__dirname, 'templates');

export function detectConsumerRoot() {
  // INIT_CWD is set by npm/yarn/pnpm to the directory where the install
  // command was invoked. That's the consumer repo root.
  const initCwd = process.env.INIT_CWD || process.cwd();

  // If INIT_CWD points at our own package (dev mode), bail.
  try {
    const ourPkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8'));
    const theirPkgPath = join(initCwd, 'package.json');
    if (!existsSync(theirPkgPath)) return null;
    const theirPkg = JSON.parse(readFileSync(theirPkgPath, 'utf8'));
    if (theirPkg.name === ourPkg.name) {
      return null; // Installing in our own repo (dev mode); skip.
    }
    return initCwd;
  } catch {
    return null;
  }
}

export function scaffold({ consumerRoot, verbose = true } = {}) {
  const root = consumerRoot || detectConsumerRoot();
  if (!root) {
    if (verbose) console.log('[praxikon] dev-mode install detected; skipping scaffold.');
    return { skipped: true };
  }

  const created = [];
  const suggested = [];
  const skipped = [];

  // 1. .praxikon/ directory + README + concepts/ + sample concept
  const praxikonDir = join(root, '.praxikon');
  const conceptsDir = join(praxikonDir, 'concepts');
  if (!existsSync(praxikonDir)) {
    mkdirSync(conceptsDir, { recursive: true });
    const readmeTemplate = readFileSync(join(TEMPLATES_DIR, 'vernacular-README.md'), 'utf8');
    writeFileSync(join(praxikonDir, 'README.md'), readmeTemplate);
    const sampleTemplate = readFileSync(join(TEMPLATES_DIR, 'vernacular-sample.md'), 'utf8');
    writeFileSync(join(conceptsDir, '_sample.md'), sampleTemplate);
    created.push('.praxikon/README.md', '.praxikon/concepts/_sample.md');
  } else {
    skipped.push('.praxikon/ (already exists)');
  }

  // 2. .claude/skills/praxikon.md — copy from this package's skills/
  const claudeSkillsDir = join(root, '.claude', 'skills');
  const skillTarget = join(claudeSkillsDir, 'praxikon.md');
  if (!existsSync(skillTarget)) {
    mkdirSync(claudeSkillsDir, { recursive: true });
    const skillSource = join(PACKAGE_ROOT, 'skills', 'praxikon.md');
    if (existsSync(skillSource)) {
      copyFileSync(skillSource, skillTarget);
      created.push('.claude/skills/praxikon.md');
    } else {
      skipped.push('.claude/skills/praxikon.md (skill source not found in package)');
    }
  } else {
    skipped.push('.claude/skills/praxikon.md (already exists)');
  }

  // 3. CLAUDE.md — suggest, don't auto-modify
  const claudeMdPath = join(root, 'CLAUDE.md');
  const snippet = readFileSync(join(TEMPLATES_DIR, 'claude-md-snippet.md'), 'utf8');
  if (!existsSync(claudeMdPath)) {
    suggested.push({
      type: 'create',
      path: 'CLAUDE.md',
      note: 'No CLAUDE.md found. Consider creating one with the Praxikon section below.',
      content: snippet,
    });
  } else {
    const existing = readFileSync(claudeMdPath, 'utf8');
    if (!/##\s+Praxikon\b/i.test(existing)) {
      suggested.push({
        type: 'append',
        path: 'CLAUDE.md',
        note: 'CLAUDE.md exists but has no Praxikon section. Consider appending the snippet below.',
        content: snippet,
      });
    } else {
      skipped.push('CLAUDE.md (Praxikon section already present)');
    }
  }

  if (verbose) printReport({ root, created, suggested, skipped });
  return { skipped: false, created, suggested, alreadyExisted: skipped };
}

function printReport({ root, created, suggested, skipped }) {
  const rel = (p) => p.replace(root + '/', '');
  console.log('');
  console.log('[praxikon] consumer scaffold');
  console.log('  in: ' + root);
  if (created.length) {
    console.log('  created:');
    created.forEach((f) => console.log('    + ' + f));
  }
  if (skipped.length) {
    console.log('  skipped (already present):');
    skipped.forEach((f) => console.log('    = ' + f));
  }
  if (suggested.length) {
    console.log('  manual step suggested:');
    suggested.forEach((s) => {
      console.log('    ! ' + s.path + ' — ' + s.note);
    });
    console.log('');
    console.log('  To see the suggested CLAUDE.md content, run:');
    console.log('    npx praxikon claude-md');
  }
  console.log('');
  console.log('  Praxikon is Soft mode by default: suggestions only, never enforcement.');
  console.log('  See ' + (rel ? rel(join(root, '.praxikon', 'README.md')) : '.praxikon/README.md') + ' for details.');
  console.log('');
}

export function printClaudeMdSnippet() {
  const snippet = readFileSync(join(TEMPLATES_DIR, 'claude-md-snippet.md'), 'utf8');
  console.log(snippet);
}
