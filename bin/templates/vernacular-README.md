# Vernacular (this repo)

This directory is the **vernacular layer** of the Praxikon knowledge system — repo-specific concepts that don't generalize beyond this codebase.

## What lives here

Concepts that are real and worth recording, but tied to:
- This codebase's framework versions
- This site's vendor stack and integration partners
- This team's conventions
- This repo's historical lessons (incidents, drift, hotfixes)

Vernacular concepts may reference specific PRs, vendors, framework versions, and incidents freely. No anonymization required — the knowledge lives where it applies.

## Resolution order (when an agent sees `@praxis: <id>`)

1. **This directory first**: `.praxikon/concepts/<id>.md` — wins if present.
2. **Lexicon via npm dep**: `node_modules/@cyberworld/praxikon/concepts/<id>.md` — the universal canon.
3. **Web fallback**: `https://raw.githubusercontent.com/Cyberworld-builders/praxikon/main/concepts/<id>.md`.

If a vernacular concept has the same ID as a lexicon concept, the vernacular wins (it knows things about this repo the lexicon can't).

## Adding a vernacular concept

1. Pick a stable kebab-case ID (you can version- or vendor-prefix when relevant, e.g. `nextjs-16-priority-prop-quirk` or `stripe-webhook-signature-skew`).
2. Frontmatter: `topic:`, `canonical_terms:`, optionally `applies_to:` (framework/versions/vendor), `seen_in:` (PRs), `parent_lexicon_concept:`.
3. Body: one-liner, what happened, the fix, the rule, when this concept becomes obsolete, see-also links.

See `concepts/_sample.md` for a copy-paste-ready template.

## Promotion

When a vernacular concept turns out to generalize (recurs in other repos, has nothing repo-specific about it), it's a promotion candidate for the public lexicon at https://github.com/Cyberworld-builders/praxikon. Promotion requires anonymization (strip vendor specifics, frame in universal terms).

Don't delete the vernacular entry on promotion — replace its body with a pointer at the lexicon entry, keeping the local PR / incident references in a `seen here:` footer.

## Posture

Praxikon is **suggestion, not enforcement**. The skill surfaces canon wisdom and lets the agent decide whether to follow it. Conversational override (*"ignore praxikon for this change"*) always wins.

See `.claude/skills/praxikon.md` for the skill behavior.
