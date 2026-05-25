# Praxikon

> _"Generating lexicon from praxis in production."_

An open knowledge corpus for senior software engineering. Concepts named in canonical terms, indexed for citation from production code, designed for agent-aided code review and human learning at the same time.

This is the **public canon**. It is one of three layers in a larger system; the other two stay private. See [Architecture](#architecture-four-layers) for the split.

> ⚠️ **Early-stage.** The structure of this corpus is still emerging. **PRs are paused** while the patterns stabilize; **issues are welcome** as corpus suggestions, questions, or errata. See [Contributing](#contributing) for the posture.

---

## What this is, in one paragraph

A library of short, dense **concept notes** — each one names a senior-engineering pattern (a data-correctness trap, an authorization primitive, a state-machine shape, a performance instinct) in canonical / institutional vocabulary, with self-check questions, adjacencies, and self-contained examples. Notes are addressed by **stable IDs** so source code anywhere can drop a `@praxis: <id>` comment that points at canonical academic content. The annotation is for the human reader skimming code; the addressability is for the AI agent reviewing the diff; the corpus is the shared lexicon that bridges them.

If that sounds adjacent to several existing things (Wikipedia, RFCs, LeetCode, internal engineering wikis), it is — and the **shape** matters more than any one comparison. See [Why this exists](#why-this-exists).

---

## Why this exists

Self-taught practitioners learn by shipping, and ship faster than they can read the academic source of what they're doing. Pair-programming with an AI agent compounds both effects: more shipping, less time anchoring decisions in the canonical lexicon of the discipline. Praxikon is the corrective — a structured corpus to grow *alongside* the work, not before it.

The mode of operation is not "study before you code." It's:

- **Code the feature.** Real production work, real client problems.
- **Annotate as you go.** Drop a `@praxis: <id>` comment at the canonical site for any pattern you can name. If the concept isn't covered yet, that's a corpus contribution waiting to happen.
- **Resolve when you want context.** The agent (or you) reads the canonical note inline. You stay shipping.
- **Promote when it generalizes.** When a pattern shows up in two production codebases independently, it's earning canon status.

The framing that holds the system together: **every feature in the codebase becomes a job-interview exercise**. The annotation forces a short, canonical-vocabulary explanation of what the code does — *as if explaining to an interviewer*. The agent uses the same vocabulary, which makes its reasoning legible to the human, and reciprocally — the human's intent legible to the agent. The canon is the shared lexicon between them.

---

## Architecture (four layers)

```
┌────────────────────────────────────────────────────────────────┐
│  CANON  (public, flat markdown, versioned)         ← THIS REPO │
│  Package: @cyberworld/praxikon                                 │
│  ─────────────────────────────────────────                     │
│    concepts/<stable-id>.md       ← academic notes              │
│    indexes/concept-categories.md ← top-down checklist          │
│    schema/annotation.schema.json ← @praxis annotation schema   │
│    skills/praxikon.md            ← the Claude skill            │
│  No executables. No client content. No PII. No client names.   │
│  Agnostic of stack, language, and product.                     │
└────────────────────────────────────────────────────────────────┘
                              ▲
                              │ promotion after anonymization
                              │
┌────────────────────────────────────────────────────────────────┐
│  WORKING LAYER  (private — maintainer's workshop)              │
│  ────────────────────────────────────────────────────────      │
│    clients/<client>.md          ← real-work concept maps       │
│    case-studies/<date>-*.md     ← real incidents               │
│    drafts/                      ← notes pre-promotion          │
│  References canon by stable ID. Where field notes mature       │
│  before promotion. Real names + numbers live here, never       │
│  in canon, never in client repos.                              │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  EXECUTABLE LAYER  (private — described below, not yet built)  │
│  Lives in the cyberworld backend repo, alongside other tools.  │
│  ────────────────────────────────────────────────────────      │
│    bin/praxis        ← CLI: explain / grep / validate / audit  │
│    lib/praxis/       ← audit engine, finding emitter           │
│  Consumes canon as a dep. Evolves independently.               │
└────────────────────────────────────────────────────────────────┘
                              ▲
                              │ canon installed as a dep
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  CLIENT REPOS  (any project that consumes the canon)           │
│  ────────────────────────────────────────────────────────      │
│    node_modules/@cyberworld/praxikon/   ← read-only canon      │
│    .claude/skills/praxikon.md           ← (copy from dep)      │
│  In-code annotations:  // @praxis: <id>                        │
│  No canon content duplicated. Pointers + thin local index.     │
└────────────────────────────────────────────────────────────────┘
```

**The isolation rule (load-bearing).** Canon flows downstream into client repos *as a dependency*. The working layer is the maintainer's private workshop where real client work informs canon drafts; nothing in the working layer ships. The executable layer is a separate private toolchain that consumes canon. Client repos carry only pointers; canon content is never duplicated into them.

---

## What's in this repo

```
@cyberworld/praxikon/
├── concepts/                 # the actual corpus — one file per stable ID
│   ├── security-definer-rls-helpers.md
│   ├── null-coalesce-to-zero-in-aggregation.md
│   └── mean-of-means-vs-pooled-mean.md
├── indexes/
│   └── concept-categories.md # top-down checklist: what's covered, what isn't
├── schema/
│   └── annotation.schema.json
├── skills/
│   └── praxikon.md           # the Claude skill (instructions, no code)
├── README.md
├── LICENSE                   # MIT
└── package.json
```

Three concept notes at v0.1.0. The index lists ~31 categories of senior-engineering patterns; three are covered, the rest are open invitations for corpus suggestions.

### What's in `concepts/`

Each concept note follows a consistent shape:

- **Frontmatter** with the topic + canonical vocabulary terms.
- **The one-liner** — the concept in one sentence.
- **Institutional vocabulary** — the canonical names, the academic / industry-standard terminology.
- **The trap or pattern, distilled** — code-level illustration.
- **How to do it right** (or the canonical adjacencies, depending on whether it's a pitfall-note or a primitive-note).
- **Self-check questions** — interview-style questions a reader can use to test whether they've internalized the concept.

Notes are short (5–15 minutes to read), dense, and written to read in both directions: top-down ("I want to learn about this") and bottom-up ("I see this in code, what's it called?").

### What's in `indexes/`

A top-down checklist of concept categories. Pick a category, follow the link if the canon covers it (✅), or [open an issue](https://github.com/Cyberworld-builders/praxikon/issues/new) if you have a contribution for an uncovered one (⬜). See [`indexes/concept-categories.md`](indexes/concept-categories.md).

### What's in `schema/`

The JSON schema that governs the `@praxis:` annotation payload. Tooling that extracts annotations from source code parses them against this schema. See [In-code annotations](#in-code-annotations).

### What's in `skills/`

[`skills/praxikon.md`](skills/praxikon.md) is a **Claude skill** — a markdown file that, when dropped into a Claude Code session's `.claude/skills/`, teaches the agent how to work with Praxikon-annotated code. Detection rules, resolution workflow, audit workflow, the isolation rule, the contribution model. No executable code; it's pure instructions.

---

## In-code annotations

The annotation format:

```
// @praxis: <stable-id>[#<variant>] [! audit:<flag>]
// <1–3 line preview, plain English in canonical lexicon>
```

The host language's comment syntax wraps the structured form:

- JS / TS / Swift: `//`
- SQL: `--` or `/* */`
- Python / YAML / Dockerfile: `#`

### Examples

**Security primitive:**
```sql
-- @praxis: security-definer-rls-helpers
-- Bypasses RLS recursion on customer_users. Hardened: STABLE +
-- explicit search_path + auth.uid() (no user_id parameter).
CREATE OR REPLACE FUNCTION public.current_user_customer_id() ...
```

**State machine:**
```ts
// @praxis: state-machine#priority-ordered-terminals
// Four-state shipment lifecycle, terminal states first:
// Sent out → Received → In transit → Not shipped.
function shipmentStatus(row: HardwareRow): { ... }
```

**An open audit flag:**
```ts
// @praxis: mass-assignment-defense#strong-parameters ! audit:column-ownership-only-at-api-layer
// Customer-writable allow-list at the API boundary. No DB-level
// enforcement — adding a column requires updating this destructure.
const { item_type, description, finish, quantity, shipped_date, notes } = body
```

### Where annotations go

- At the **definition site** of the function / policy / structure that exemplifies the concept (preferred — anchored to one canonical place).
- Not at every call site (noise).
- Not in every file that mildly touches the concept (dilutes meaning).

Default: sparse, not dense. One annotation per concept-instance, at the most canonical site in the codebase.

---

## The Claude skill (in this repo)

`skills/praxikon.md` is the agent-facing layer. When a Claude Code session loads this skill — by being copied into `.claude/skills/`, or by the global discovery mechanism — Claude learns:

- **How to detect** that the current repo is Praxikon-aware (deps, annotations, `.claude/skills/praxikon.md` presence).
- **How to resolve** a `@praxis:` annotation against the installed canon (or fall back to the public GitHub).
- **How to run a light audit** through the Praxikon lens (identify pattern matches, surface audit flags, suggest where annotations are missing at canonical sites).
- **How to suggest new corpus entries** as GitHub issues, with anonymization rules baked in.
- **The isolation rule** — never write canon content into client repos; only pointers.

The skill is intentionally minimal. Heavy lifting (parsing, validation, audit reporting) belongs in the executable layer (CLI tool, described next). The skill exists so a Claude session works fluently with Praxikon-annotated code *without* requiring the executable layer to be installed.

---

## The executable layer (described, not yet built)

A separate private repo (lives alongside other cyberworld backend tooling) hosts a CLI: `praxis`. It is intentionally **not** in this canon package — the canon is content; the CLI is convenience around the content. Different lifecycles, different audiences, different privacy posture.

V1 verbs:

| Verb | Purpose |
|---|---|
| `praxis explain <id>` | Prints the concept note at `<id>`. For humans + agents. |
| `praxis grep <id>` | Finds every `@praxis: <id>` annotation in the current repo. |
| `praxis validate` | Checks every `@praxis:` annotation against the installed canon version. Fails on unknown IDs (typo or canon dropped them) or malformed payloads. |
| `praxis audit [--diff \| --all]` | Runs the audit pipeline against the current diff (default) or whole repo. Output = list of `(file:line, concept-id, severity, note)` findings. |
| `praxis report --issues \| --pr <#> \| --commit` | Disposition of findings. |

### Three action modes

The audit produces findings; what you do with them depends on the session:

- **Open dev session** (shipping a feature on this branch): `praxis fix <finding-id> --commit` applies an edit + writes an annotation + commits.
- **Audit-only** (reviewing a codebase, not shipping): `praxis report --issues` opens a GitHub issue per finding with body = finding + canon excerpt + suggested fix.
- **External-PR review** (someone else's PR): `praxis report --pr <#>` posts inline PR review comments per finding, citing the canon.

The audit engine is the same in all three; only the disposition changes.

The CLI is described here for completeness; the canon doesn't depend on it. You can read this repo, drop pointers in your code, and run a Claude session with the skill loaded, all without ever running `praxis`.

---

## Real-world example: a cost-observability dashboard with an LLM agent

A logistics + operations SaaS client built a cost observability platform that demonstrates how deterministic pipelines and AI agents can share a single source of truth — and is a prime example of the kind of architectural pattern Praxikon catalogues.

The system operates in layers. A daily cost-snapshot Lambda hits AWS Cost Explorer and writes idempotent rows to a DynamoDB table — **the canon**. Service-level costs, account totals, monthly and rolling 30-day periods. Six generator Lambdas then read the canon daily and emit interpretive markdown to a versioned S3 bucket. Every generated doc carries YAML frontmatter recording the exact canon rows it cited and their `fetched_at` timestamps, creating an audit trail: when the underlying data refreshes, the system detects "stale anchors" and surfaces staleness warnings to users.

The user-facing layer is a Next.js dashboard plus a RAG chat agent (Claude Sonnet 4.6 via Bedrock). The agent is a **tool router** with 10 bounded, deterministic tools: query canon, read knowledge docs, search semantically, fetch live metrics, analyze database spikes, trace endpoint traffic. Tools emit JSON (never HTML or React code), and each tool result can carry an optional widget envelope that the dashboard maps to one of six React components.

What makes this canon-worthy: the **typed composition pattern**. The weekly review spec is defined once in Zod, shared between the Python Lambda that generates reviews and the TypeScript dashboard that renders them. The LLM never emits HTML; it emits JSON conforming to a discriminated union. Adding a new section type requires three synchronous changes (schema, component, generator instruction), all typed — if any falls out of sync the build fails.

The result: an "attention log" (every query and claim captured), cost figures that trace to source data (no inventing), and durable evidence that optimizations stick. The patterns surfaced from this work — *canon as single source of truth with anchor contracts*, *LLM as tool-router with bounded deterministic tools*, *typed composition shared across service boundaries* — are exactly the kind of senior-engineering concepts Praxikon exists to canonicalize.

---

## Genealogy: from the quiz engine

Praxikon emerged from the **quiz engine**, a general-purpose adaptive learning system built into the Cyberworld backend. The quiz engine was designed as domain-agnostic spaced-repetition machinery — no hardcoded topics, no hidden assumptions about what gets learned. The first curriculum to populate it was email-security interview prep: questions, case studies, and concepts all organized under the `email/security` namespace. The engine grades responses via Claude (synchronously, with structured rubrics), schedules reviews using SM-2 (the SuperMemo algorithm), and tracks mastery over time.

That quiz engine taught something durable: **assessment and corpus are different problems.** The quiz tests whether you remember something you've already learned. But "what should I learn in the first place?" is a separate question. The quiz engine answered the first; Praxikon answers the second.

Praxikon inverts the flow. Rather than questions *about* a concept, you see the concept **live in code**, in a pull request, in a real production system, annotated with why each detail matters. The pedagogy is similar in spirit (named concepts, repeated exposures, calibrated retrieval), but the material is *applied* rather than abstract. The quiz engine tests recall; Praxikon teaches pattern recognition.

Both are part of the same broader mission — a learning system that meets engineers where they are (interview prep, production incident response, code review) and mirrors the shape of the work itself. The quiz engine remains private; Praxikon is what we open-source. The design priors the quiz engine matured (curriculum agnosticism, anonymized source material, structured grading loops, transparent confidence signals) are what made Praxikon possible.

---

## How to use this (today)

1. **Read the index** ([`indexes/concept-categories.md`](indexes/concept-categories.md)) to see what the corpus covers.
2. **Read a concept note** — they're written to be skimmable in 5–10 minutes.
3. **Install in your project** (once published to npm / GitHub Packages): `npm install @cyberworld/praxikon`.
4. **Add the Claude skill** to your project: `cp node_modules/@cyberworld/praxikon/skills/praxikon.md .claude/skills/` (and commit it).
5. **Drop `@praxis:` pointers** in code where you can name canonical patterns.
6. **Open an issue** when you spot a pattern that should be canonized but isn't yet.

---

## Contributing

Praxikon is in **early-stage iteration**. The corpus structure, ID conventions, and contribution model are still maturing. To keep the bar high while the structure stabilizes:

- ✅ **Issues are welcome.** Corpus suggestions, questions, errata, "this pattern shows up everywhere and isn't here yet" notes. Use the templates in [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/).
- ⏸️ **PRs are paused** for now. The structure needs to settle through a few minor versions before outside PRs would compose cleanly. We'll open the gate when patterns are consistent enough that outside contributions can land without churning the index.

When opening a corpus-suggestion issue, please anonymize: no client names, no PII, no real customer data, no internal URLs. If your example is private, describe the *shape* of it without naming the source.

---

## The isolation rule (non-negotiable)

The canon is **agnostic of stack, client, and language.** A `concepts/` note may *mention* SQL, JS, Python, Swift as illustrative examples — but the principle described is the principle, not a how-to in any one stack. Stack-specific tutorials and client-specific applications belong elsewhere (your own internal docs, your blog, your project READMEs — not here).

When operating in a *client* repo that consumes this canon:
- ✅ Allowed: `@praxis: <id>` annotations + 1–3 line previews in canonical lexicon.
- ❌ Not allowed: copying canon content into the repo, writing case studies into the repo, referencing other clients by name.

---

## Versioning

Semantic versioning, with a domain-specific reading:

| Change | Bump |
|---|---|
| Add a new concept ID | **minor** |
| Edit the body of an existing concept (clarification, new example, fixed typo) | **patch** |
| Rename a stable ID / remove a concept | **major** (breaks every `@praxis: <oldId>` pointer in client repos) |
| Add to the JSON schema in a backward-compatible way | **minor** |
| Break the JSON schema | **major** |

**Stable IDs are stable.** Once a concept ID is published, it cannot change in a non-major release. To rename, deprecate: add the new ID, keep the old as an alias pointing at the new, drop the old at the next major.

---

## Roadmap (informal)

Near-term:
- Grow the corpus to ~30 concept notes covering the categories in [`indexes/concept-categories.md`](indexes/concept-categories.md).
- Publish to GitHub Packages (and possibly npm).
- Stand up the executable layer (`praxis` CLI) and dogfood it on the maintainer's active projects.

Medium-term:
- Open contributor PRs once the structure has stabilized for ~3 minor versions.
- IDE plugin (likely Cursor / Claude-Code-native first).
- Conventions for non-JS codebases (Python, Swift, Go).

Long-term:
- Open the floor wider — outside maintainers, multi-language corpus split, possibly a federation of domain-specific Praxikon-like corpora.

---

## License

[MIT](LICENSE) © Jay Long / Cyberworld Builders

---

## A note on the name

*Prax*(is) — theory enacted in practice — fused with *-ikon* (lexicon / canonical-form suffix, with a slightly futuristic / sci-fi tinge). The thesis encoded literally: **generate the canonical lexicon of senior engineering from the praxis already shipped to production.** The tagline _"Generating lexicon from praxis in production"_ is the elevator pitch.

Praxikon is the sibling-and-evolution of an earlier internal working name (`quiz-engine` → `PraxEngine` → `Praxikon`); the lineage signals the same evolutionary frame.
