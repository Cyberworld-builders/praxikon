#!/usr/bin/env node
// Praxikon CLI — minimal entrypoint.
//
// Usage:
//   npx praxikon init        — scaffold consumer repo (idempotent)
//   npx praxikon claude-md   — print the suggested CLAUDE.md section to stdout
//   npx praxikon help        — show this message

import { scaffold, printClaudeMdSnippet } from './scaffold.mjs';

const [, , command] = process.argv;

function help() {
  console.log(`Praxikon CLI

Commands:
  init        Scaffold the consumer repo: create .praxikon/, copy the skill
              to .claude/skills/, and suggest a CLAUDE.md section. Safe to
              re-run; existing files are never overwritten.

  claude-md   Print the suggested CLAUDE.md Praxikon section to stdout.
              Pipe into your CLAUDE.md or copy-paste as you prefer.

  help        Show this message.

Posture: Praxikon is a suggestion layer, not enforcement. The skill
surfaces canonical knowledge; the human and the agent's judgment
override it freely.

See https://github.com/Cyberworld-builders/praxikon for the corpus.
`);
}

switch (command) {
  case 'init':
    scaffold();
    break;
  case 'claude-md':
    printClaudeMdSnippet();
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    help();
    break;
  default:
    console.error(`praxikon: unknown command '${command}'`);
    help();
    process.exit(1);
}
