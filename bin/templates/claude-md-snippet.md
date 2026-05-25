## Praxikon (knowledge corpus, soft suggestions)

This repo participates in **Praxikon**, a canonical-knowledge-corpus system. Two layers of concepts are addressable from source code via `@praxis: <id>` annotations:

- **Public lexicon** (`@cyberworld/praxikon` npm dep, installed into `node_modules/`) — universal patterns.
- **Vernacular** (committed in `.praxikon/concepts/` in this repo) — concepts pinned to this codebase's framework version, vendor stack, and historical lessons.

When you encounter a `@praxis:` annotation in code you're editing, invoke the `praxikon` skill (in `.claude/skills/praxikon.md`) and resolve the concept against both layers (vernacular first, then lexicon). Briefly narrate in your response when you've consulted the canon during an edit.

**Posture: Soft, not enforcement.** Praxikon surfaces canon wisdom as one input among many. The human and your judgment about the specific context outrank the canon. If the user says "ignore praxikon for this change," proceed without consulting it.

See `.praxikon/README.md` for vernacular details.
