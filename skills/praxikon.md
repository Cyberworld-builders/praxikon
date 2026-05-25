---
name: praxikon
description: Use when you encounter `@praxis:` annotations in source code, when a repo has the `@cyberworld/praxikon` dependency installed, when a `.claude/skills/praxikon.md` is present in the project, or when asked to audit / review / explain code through the Praxikon lens. Resolves canonical concept references against the installed corpus, runs lightweight audits, and helps suggest new corpus entries.
---

# Praxikon (Claude skill)

When you encounter a `@praxis:` annotation in source code, or when the user explicitly invokes Praxikon for a code review or audit, follow these instructions.

## Detection

You are working in a Praxikon-aware repo if **any** of these are true:

- `@cyberworld/praxikon` appears in `package.json` (`dependencies` or `devDependencies`)
- `node_modules/@cyberworld/praxikon/` exists
- Any file in the repo contains a `@praxis:` annotation in a comment
- A `.claude/skills/praxikon.md` exists in the repo (a local copy of this skill)

## Annotation format

```
// @praxis: <concept-id>[#<variant>] [! audit:<flag>]
// <1–3 line preview, plain English in canonical lexicon>
```

The host language's comment syntax wraps the structured form. SQL uses `--`, Python/YAML/Dockerfile use `#`, JS/TS/Swift use `//`. The parsed/normalized form is defined by [`schema/annotation.schema.json`](../schema/annotation.schema.json).

## Resolving annotations

When you encounter a `@praxis:` annotation:

1. **If the canon dep is installed locally:** read the concept note at `node_modules/@cyberworld/praxikon/concepts/<concept-id>.md`.
2. **If not installed:** fetch from the public repo on demand — `https://github.com/Cyberworld-builders/praxikon/blob/main/concepts/<concept-id>.md` (or the `raw.githubusercontent.com` equivalent for direct text).
3. **Render the concept inline** for the user when relevant — but be brief; quote the canonical name, the one-liner, and the self-check questions. Don't dump the whole file unless asked.

## Light audit workflow

When the user asks you to audit a diff, a file, or a PR through the Praxikon lens:

1. **Identify matches.** Walk through the code and identify patterns that correspond to concepts in the canon. The [`indexes/concept-categories.md`](../indexes/concept-categories.md) is a top-down checklist for this — pick a category, see if the code instantiates it (well, poorly, or not at all).
2. **For each match,** record: `(file:line, concept-id, severity, note)`. Severity is your judgment — informational, suggestion, finding, blocker. Note is one sentence on why it applies here.
3. **For each `! audit:<flag>`** already present in the code, surface the flag prominently — the author flagged this site as wanting follow-up.
4. **Where annotations are missing** at canonical sites (i.e. you can name the pattern in canonical terms but the code lacks the `@praxis:` pointer), suggest adding one. Don't write canon content into the client repo — only the pointer + 1–3 line preview.

## Suggesting new corpus entries

If you encounter a pattern in production code that is canon-worthy but does **not** have a matching concept in the corpus:

1. **Name the pattern in canonical / institutional terms** — what would an interviewer call it? Search the academic / industry lexicon, not the project's internal vocabulary.
2. **Anonymize.** Remove client names, customer-specific identifiers, PII, internal URLs, or anything that ties the example to a specific deployment.
3. **Draft a short proposal** (under 200 words) suggesting a new `concepts/<stable-id>.md` entry: the one-liner, the institutional vocabulary, the LeetCode / interview adjacency, two or three illustrative examples.
4. **Offer to open a GitHub issue** on https://github.com/Cyberworld-builders/praxikon/issues with the suggestion, using the "Corpus suggestion" template. Confirm with the user before opening.

## The isolation rule (non-negotiable)

The canon is **agnostic of stack, client, and language.** Working notes about specific clients, real PII, real incident numbers, real customer names — these live in the maintainer's private *working layer*, never in canon, never in client repos. Promotion from working layer to canon requires anonymization.

When operating in a *client* repo (a repo that consumes the canon, not the canon itself):
- ✅ Allowed: `@praxis: <id>` annotations + 1–3 line previews in canonical lexicon.
- ❌ Not allowed: copying canon content into the repo, writing case studies into the repo, referencing other clients by name.

## Tone

When explaining a concept inline, write in canonical / institutional vocabulary. The point of Praxikon is to translate practitioner work into the lexicon of the discipline — when you do that translation inline, you're doing the work the skill exists to enable.
