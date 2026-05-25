---
name: praxikon
description: Use when you encounter `@praxis:` annotations in source code, when a repo has the `@cyberworld/praxikon` dependency installed, when a `.claude/skills/praxikon.md` is present in the project, or when asked to audit / review / explain code through the Praxikon lens. Surfaces canonical concept references from the installed corpus as **suggestions for consideration** — never as enforcement. Helps name patterns in institutional vocabulary; leaves the decision to the human.
---

# Praxikon (Claude skill)

When you encounter a `@praxis:` annotation in source code, or when the user explicitly invokes Praxikon, follow these instructions.

## Posture: suggestion, not enforcement

Praxikon is a **decision-support layer**, not a gatekeeping one. Its job is to make canonical knowledge *visible* — not to dictate what you do with it. Treat every concept note as one input among many. The human (and your own judgment about the specific context) outrank the canon.

- ✅ Surface the canonical name for what the code is doing.
- ✅ Note relevant items from the concept note's hardening checklist.
- ✅ Offer an opinion when you have one.
- ❌ Refuse to edit code because a checklist item is unmet.
- ❌ Treat the canon as the only or final word.
- ❌ Block the user's chosen path because the canon disagrees.

If the human says "ignore praxikon for this change" — or anything equivalent — proceed without it. No further argument, no insisting they justify the override. Their decision overrides the canon by default.

## The corpus is not omniscient

The canon is a **partial** institutional lexicon, growing from real codebases. It is **not** a complete map of software engineering. Three failure modes worth keeping in mind:

1. **Concept A is canonized; competing concept B is not.** Following A by default makes you confidently wrong in cases B applies to. (Dunning-Kruger by curriculum: knowing one of two competing concepts is sometimes worse than knowing neither.)
2. **The concept note is a snapshot, not a verdict.** Reality has moved past it; the canon has not. Defer to fresh evidence.
3. **The site you're looking at may be a legitimate exception.** Codebases evolve. A pattern that's "wrong" in 95% of cases is exactly right in 5%, and the 5% is rarely documented.

When you find yourself about to insist on the canonical pattern, ask: *do I know enough about this codebase to know that the competing concepts I'd need don't exist?* If not, surface the canon as one option and let the human choose.

## Two-layer canon

Praxikon resolves concept IDs against **two** canonical layers, both treated as equally authoritative within their scope:

| Layer | Lives in | Scope |
|---|---|---|
| **Lexicon (public)** | `@cyberworld/praxikon` package (via npm/GitHub-import) | Universal — agnostic of client, stack, version |
| **Vernacular (repo-specific)** | `<repo-root>/.praxikon/concepts/` | Local — pinned to this codebase, this stack, this team's conventions, this framework version |

Vernacular concepts capture knowledge that is real and valuable but *doesn't generalize* — framework-version quirks, vendor-specific issues, this-team-only conventions, this-repo's historical lessons. Vernacular concepts may include client names, PR numbers, incident references; they live in the repo they apply to and don't have to be anonymized.

Treat both layers as equally canonical. The vernacular is not "less authoritative" — it's *more* specific. Where the layers disagree, the vernacular wins (it knows things about this repo the public canon can't).

## Detection

You are working in a Praxikon-aware repo if **any** of these are true:

- `@cyberworld/praxikon` appears in `package.json` (`dependencies` or `devDependencies`)
- `node_modules/@cyberworld/praxikon/` exists
- Any file in the repo contains a `@praxis:` annotation in a comment
- A `.claude/skills/praxikon.md` exists in the repo (a local copy of this skill)
- A `.praxikon/` directory exists at the repo root (vernacular canon)

## Annotation format

```
// @praxis: <concept-id>[#<variant>] [! audit:<flag>]
// <1–3 line preview, plain English in canonical lexicon>
```

The host language's comment syntax wraps the structured form. SQL uses `--`, Python/YAML/Dockerfile use `#`, JS/TS/Swift use `//`. The parsed/normalized form is defined by [`schema/annotation.schema.json`](../schema/annotation.schema.json).

## Resolving annotations

When you encounter a `@praxis: <concept-id>` annotation, resolve **local-first, then public**:

1. **Try vernacular first:** look for `<repo-root>/.praxikon/concepts/<concept-id>.md`. If present, this is the authoritative version for this repo (it may extend or refine a public concept).
2. **Then try the local canon dep:** `node_modules/@cyberworld/praxikon/concepts/<concept-id>.md`.
3. **Then try the public canon over the network:** `https://raw.githubusercontent.com/Cyberworld-builders/praxikon/main/concepts/<concept-id>.md`.
4. **Render the concept briefly** for the user when relevant — quote the canonical name, the one-liner, and the most directly applicable checklist items. Don't dump the whole file unless asked. **Note which layer the concept came from** when distinguishing matters ("vernacular concept" vs "public-canon concept").

If the same ID exists in both layers, the vernacular wins — but mention the public version exists if its content adds useful framing.

## Consultation flow (when editing annotated code)

When you're about to edit code that carries a `@praxis: <id>` annotation, consider — don't enforce — the following:

1. **Read the concept note.** Resolve the ID, take in the one-liner and the relevant section of the hardening checklist.
2. **Form a quick read** on whether your proposed edit preserves, breaks, improves, or is orthogonal to the canon's pattern. You do not need to walk every checklist item — only the ones that bear on your change.
3. **Decide.** If the canon's pattern fits the situation, follow it. If you have specific reason to diverge (the canon doesn't apply here, the situation is the legitimate exception, you have better information), diverge — and say so plainly.
4. **Narrate in your response.** When you've consulted the canon during an edit, briefly tell the user: which concept you consulted, whether you followed it, and (if you diverged) why. Keep this short — one or two sentences.

Example narration:
> *Touched `middleware.ts`, which carries `@praxis: permissions-policy-feature-gating`. Consulted canon; the proposed change adds `interest-cohort=()` to the existing deny list, which aligns with the checklist's privacy-opt-out item. Proceeding.*

Example divergence:
> *`ServiceOfferedClient.tsx` carries `@praxis: internal-links-bypass-redirect-hops`. The canon recommends canonical URLs, but this specific link routes through a redirect on purpose — Kris uses the 301 hop as a campaign-tracking signal in GA. Keeping the indirection; the canon doesn't cover the tracking-as-feature case.*

## Override

The user can override Praxikon at any time with a conversational instruction:

- *"ignore praxikon for this change"*
- *"the canon doesn't apply here"*
- *"don't consult praxikon"*
- or any equivalent phrasing

When the user overrides, proceed without consulting the canon for that change. Do not require them to justify the override. Do not re-litigate it. Move on.

## Light audit workflow (when explicitly asked)

When the user asks you to audit a diff, a file, or a PR through the Praxikon lens:

1. **Identify matches.** Walk through the code and identify patterns that correspond to concepts in the canon. The [`indexes/concept-categories.md`](../indexes/concept-categories.md) is a top-down checklist for this — pick a category, see if the code instantiates it (well, poorly, or not at all).
2. **For each match,** record: `(file:line, concept-id, severity, note)`. Severity is your judgment — informational, suggestion, finding, blocker. Note is one sentence on why it applies.
3. **For each `! audit:<flag>`** already present in the code, surface the flag prominently — the author flagged this site as wanting follow-up.
4. **Where annotations are missing** at canonical sites (i.e. you can name the pattern in canonical terms but the code lacks the `@praxis:` pointer), *suggest* adding one. Don't write canon content into the client repo — only the pointer + 1–3 line preview. Confirm with the user before adding annotations.

Audit output is a *report*, not a list of required changes. The user decides which findings to act on.

## Suggesting new corpus entries

If you encounter a pattern that is canon-worthy but does **not** have a matching concept anywhere, first decide *which layer* it belongs in:

- **Public canon (lexicon)** — the pattern is universal: framework-agnostic, stack-agnostic, client-agnostic. Would still be true 5 years from now and across other engineers' codebases. Anonymization required.
- **Repo-specific canon (vernacular)** — the pattern is pinned to this repo / stack / version / vendor. Captures a real lesson but doesn't generalize. May reference specific PRs, vendors, framework versions, internal conventions.

For a **public-canon proposal**:
1. Name the pattern in canonical / institutional terms — what would an interviewer call it? Search the academic / industry lexicon, not the project's internal vocabulary.
2. Anonymize. Remove client names, customer-specific identifiers, PII, internal URLs, or anything that ties the example to a specific deployment.
3. Draft a short proposal (under 200 words) suggesting a new `concepts/<stable-id>.md` entry: the one-liner, the institutional vocabulary, the LeetCode / interview adjacency, two or three illustrative examples.
4. Offer to open a GitHub issue on https://github.com/Cyberworld-builders/praxikon/issues with the suggestion, using the "Corpus suggestion" template. Confirm with the user before opening.

For a **vernacular proposal**:
1. Pick a stable kebab-case ID — version- or stack-prefixing is allowed (`nextjs-16-priority-prop-quirk`, `leadtruffle-bfcache-unload-listener`).
2. Draft the note directly in `<repo-root>/.praxikon/concepts/<id>.md`. Include applicable framework versions in frontmatter (`applies_to: { framework: nextjs, versions: "<17.0.0" }`).
3. Reference specific PRs, files, and incidents freely. No anonymization required.
4. If the pattern later recurs across multiple repos, flag it as a public-canon promotion candidate.

If unsure which layer, default to vernacular — promoting later is cheaper than rolling back a too-broad public claim.

## The anonymization rule (non-negotiable, scoped to public canon)

This rule is about *promotion to the public layer*, not about decision-making.

**Public canon (lexicon)** is agnostic of stack, client, and language. Client names, real PII, real incident numbers, real customer names must be scrubbed before any concept moves into the public layer. Working notes that aren't yet scrubbed live in the maintainer's private editorial layer (`~/Apps/praxikon/`).

**Vernacular (repo-specific canon)** is unaffected by this rule. Inside a client repo, vernacular concepts may reference PRs, vendors, framework versions, incidents, and internal conventions freely — that's the *point* of the vernacular layer. The knowledge lives where it applies.

When operating in a *client* repo (a repo that consumes public canon):
- ✅ Allowed: `@praxis: <id>` annotations + 1–3 line previews.
- ✅ Allowed: writing vernacular concepts in `.praxikon/concepts/`.
- ✅ Allowed: writing case studies in `.praxikon/case-studies/` (if the repo opts in).
- ❌ Not allowed: copying public-canon content verbatim into the repo (use the import dep instead).
- ❌ Not allowed: referencing *other clients* by name (cross-client references go in the cyberworld working layer).

## Tone

When explaining a concept inline, use canonical / institutional vocabulary. The point of Praxikon is to translate practitioner work into the lexicon of the discipline — when you do that translation inline, you're doing the work the skill exists to enable.

Be brief. Cite the concept, surface the relevant checklist items, offer an opinion when you have one, and step out of the way. Don't lecture. The human is the senior practitioner in the room.
