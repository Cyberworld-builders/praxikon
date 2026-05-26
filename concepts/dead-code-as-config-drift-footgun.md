---
topic: hygiene/maintainability
canonical_terms: [dead code, latent footgun, configuration drift, stale config, "delete the thing not just the import", reactivation hazard, silent failure, code archaeology]
---

# Dead code containing stale config is a latent footgun

## The one-liner
Unimported dead code does nothing — until someone re-imports it. The danger isn't the inertness; it's the **state preserved inside it**. A file with hardcoded URLs, API keys, feature flags, GA properties, vendor IDs, copy strings, or load strategies that have drifted from current truth becomes a trap armed for whoever next reaches for it. The fix when removing usage is *delete the file*, not just *delete the import*.

## The pattern

A component, helper, or script gets superseded. The new implementation lands. The old usages get cleaned up. The original file remains in the tree — unimported, lint-clean, doing nothing. So far, harmless.

Then time passes. The rest of the codebase moves: the GA property gets rotated, the API endpoint changes, the feature flag's default flips, the brand color is updated, the auth header format changes. The unimported file doesn't move — code doesn't drift if no one edits it. But truth has moved, and the file no longer reflects it.

Six, twelve, eighteen months later, someone:
- copy-pastes the file as a template ("we had something for this!")
- autocompletes its export name in a refactor
- restores it in a "let's clean up the imports" sweep
- pulls it into a new feature ("this looks reusable")
- treats it as an example of how-we-do-X
- agentic coding-tool surfaces it as a relevant reference

Whatever the path, the result is the same: **stale configuration enters production via code that "worked" the moment it was written.** The new caller doesn't suspect anything because the code *looks* fine — it imports cleanly, compiles, runs. The failure is silent. Events fire to a dead analytics property; calls go to a deprecated endpoint; a vendor receives requests under a retired account ID; the UI displays last year's pricing.

The original code wasn't wrong when it was written. It became wrong because it stopped tracking truth.

## Why this is worse than ordinary dead code

Dead code has costs (mental load, codebase noise, lint surface area, build-graph weight) but its *behavior* in production is null — it doesn't run. The traditional argument against dead code is hygiene, not correctness.

The config-drift variant flips this. The behavior in production is null *until* reactivation, at which point the behavior is *wrong*. The hazard isn't latent presence; it's latent wrongness waiting for a trigger.

Three properties make this worse than "ordinary" dead code:

1. **Silent failure on reactivation.** The reactivated code doesn't throw. It doesn't 500. It returns successfully against the *wrong* target. The failure is detected only when someone notices the downstream consequence (no events in GA dashboard, customer complaints about pricing, etc.) — which can take weeks or quarters.
2. **Reactivation looks lower-risk than fresh implementation.** "We had this before, let's just use it" is a faster mental path than "let me write this from scratch." The first invites the trap; the second forces re-engagement with current config.
3. **Survives normal code review.** A reviewer sees a deleted import being restored — the file already existed, the change is minimal, it imports cleanly. The reviewer doesn't dive into the file's body to check whether its hardcoded constants are still valid. The drift hides inside what looks like routine plumbing.

## The broader pattern (where else it bites)

This isn't specific to component files. The same trap recurs anywhere static configuration is colocated with executable code that can be deactivated and reactivated:

- **Retired feature-flag scaffolding.** A flag is removed from the code path but the helper that read it remains. The flag default in the helper is stale; reactivation reads the stale default instead of querying the current flag service.
- **Deprecated A/B test variants.** Variant code paths kept "in case we revive the test" — with branch logic that references a test name that no longer exists in the experimentation service.
- **Retired API clients.** A wrapper around `v1/users/...` survives the migration to `v2/users/...`. Its base URL constant points at a host that's been decommissioned.
- **Old auth helpers.** Replaced by a new auth library but kept around. The token-format expectation inside the helper matches an older signing scheme.
- **Old test fixtures / seeders.** Hardcoded customer IDs, product SKUs, prices, dates — fine when written, time-bomb when reactivated against a database that's evolved.
- **Old migration scripts** retained "for reference." Their assumptions about schema state are the schema state at the time of writing; running them now does damage.
- **Old vendor SDK wrappers** with hardcoded account IDs, region names, feature endpoints.
- **Commented-out code.** The extreme case: not just dead, but *visibly preserved*. Same drift hazard with the additional psychological signal "this might be useful again."
- **Deprecated env vars with fallback values in code.** `process.env.OLD_KEY ?? "fallback-from-2019"` — the fallback worked once, doesn't now, hides the missing var.

The underlying principle: **wherever code colocates with configuration, the code's lifecycle and the configuration's lifecycle must be the same.** Decoupling them — letting code persist while the config it embeds becomes stale — creates the drift surface.

## Distinguishing this from "dead code is debt" (the broader principle)

The argument "delete unused code" is universally accepted but usually grounded in hygiene reasoning (cognitive load, build time, lint surface). That reasoning makes the rule feel optional — *if* the file has no cost, leaving it has no cost.

This concept sharpens the principle for the subclass that *isn't optional*: dead code whose body contains values that need to track truth. For those files, "no cost" is wrong. The cost is just unrealized.

The sharper rule:

> **When you remove the last caller of a piece of code, examine the body before deleting the import. If the body contains any value that other parts of the codebase have a different copy of, or that depends on external state that may change, *delete the file* — not just the import.**

If the body is purely structural (a sort comparator with no embedded constants, a pure-math helper, a type-only file), leaving it is genuinely low-cost. If the body contains URLs, IDs, secrets, copy, brand values, vendor parameters, environment-dependent strings — delete the file. The hygiene argument and the correctness argument now coincide.

## How to do it right (the checklist)

When removing the last caller of a code object:

- [ ] **Check the body for embedded configuration.** Hardcoded URLs, API keys, vendor IDs, feature flag names, prices, copy, brand colors, account references — anything that has a current "correct value" maintained elsewhere.
- [ ] **If config-bearing: delete the file**, not just the import. Empty the trap rather than disarm it.
- [ ] **If config-free: deletion is still preferred** but the bar is lower; preserving for future use is more defensible.
- [ ] **Grep for the file's named exports** before deletion. A function exported but unused by the current build may be referenced in a test, a script, a CI workflow, a generated artifact. Confirm-and-clean those too.
- [ ] **Don't trust the linter alone.** `eslint --no-unused-vars` catches in-module dead code but not module-level dead files. Tools like `knip`, `ts-prune`, or `unimported` find file-level dead code; bake one into CI.
- [ ] **When pulling forward a "we had something for this" file from git history, treat its config as suspect by default.** Re-derive every hardcoded value from current truth before trusting any of it.
- [ ] **Avoid `// TODO: delete after X` comments.** They survive their referent every time. Make the deletion now, or write a real ticket with an owner.
- [ ] **Beware AI/agentic completions surfacing dead files.** Code-completion tools see "function with the right name exists" as a strong signal; they don't know the config is stale. Verify autocompletion-discovered code, especially from files you don't recognize.

## Canonical adjacencies

- **Chesterton's Fence (reversed).** Chesterton says "don't remove a fence until you know why it was put there." The config-drift dead-code case is the converse: "don't *keep* code just because someone put it there — verify it's still tracking truth before assuming it's safe to leave."
- **Dead-code elimination (DCE) / tree-shaking.** Module-level mechanism (Webpack, Rollup) that strips unimported exports from the final bundle. Saves bundle size, doesn't save the source code from existing in the repo. Tree-shaking is not a substitute for deletion; the trap survives in the source tree where humans (and agents) read.
- **Documented-invariant drift** (canon #29) — prose lies about a system contract. This concept is the *code* analog: dormant code lies about what current truth looks like. Same teaching shape, different artifact (executable vs prose).
- **Assertion drift** (related, #46 ⬜) — tests enforcing stale assumptions. Another sibling: every variant is some kind of artifact that didn't update when truth did.
- **Single Source of Truth (SSOT)** — the discipline that prevents this in the first place. If `gtag.ts` exports the canonical GA property and *every* GA-using component imports from it, no GoogleAds.tsx can hardcode a stale value. Embedding-by-import vs embedding-by-literal is the architectural fork.
- **Configuration as code** vs **configuration as data** — config-bearing code is the worst form of config-as-code (no separation of concern, no versioning of the config independent of the code, no obvious where-to-look). Migrate config out of code into a single typed source, then this concept stops applying to that surface.

## Adjacent traps

- **"We might need this back."** The pattern that survives all other arguments. The right rebuttal: git history *is* the "in case we need it back." Restoring from git forces re-engagement with the config; restoring from `src/components/Whatever.tsx` does not.
- **Comments declaring intent ("// kept for reference") without removal.** They survive their author, their team, and the project. A line of code is not a future-proof commitment device.
- **Treating the lint rule as completionist.** Linters catch unused vars within files but rarely entire dead files. Setting up unused-imports lint and then leaving 12 fully-orphaned files in the tree is the worst of both worlds.
- **Branches that "stash" dead code.** "Move it to a `legacy/` branch we can revive." Branches drift; merge conflicts accumulate; the revived branch's config is the same staleness, with the additional cost of merge work.
- **Refactor tools that "preserve" deleted symbols as deprecation aliases.** `@deprecated export { OldName as NewName }` — fine for public API, dangerous when the deprecated alias has internal state.
- **Component-library copy-paste origin.** A starter template or shadcn-ish component dropped in months ago, never customized, never deleted. Its embedded defaults (colors, text, image paths) become wrong as the brand evolves but the component still imports cleanly.
- **Hard-deleted but recoverable from CI artifacts.** Old build artifacts on a CDN, old Docker images, old serverless function versions — config-drift artifacts that survive deletion of the source. Outside the scope of this concept but worth naming.

## Self-check questions

- A repo has 14 unimported `.tsx` files in `src/components/`. Which subset is safe to leave and which subset is a config-drift footgun? What's the audit procedure to decide?
- A teammate proposes restoring `OldClient.ts` from git history because "we already wrote this." What's the right pushback, expressed in language they'll actually accept?
- A retired feature-flag wrapper still exists in the codebase. The flag itself no longer exists in the experimentation service. What does the wrapper return today, and what's the failure mode if someone reactivates it?
- Compare the cost-of-deletion vs cost-of-retention for: (a) a pure-math helper with no constants, (b) an old API client with a hardcoded base URL, (c) a UI component with a hardcoded brand color. Which one *must* be deleted; which one *should* be deleted; which one is genuinely safe to retain?
- Why isn't `eslint --no-unused-vars` or `tsc --noUnusedLocals` sufficient to catch the dead-code-as-config-drift case? What tools do?
- "Tree-shaking strips it from the bundle anyway." Why does this argument miss the point of *this* concept (vs the older "dead code is debt" argument)?
- A code-completion tool suggests an unimported function with the right name. You don't recognize the file. What do you check before accepting the suggestion?
