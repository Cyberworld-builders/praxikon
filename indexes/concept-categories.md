# Concept categories index

A canonical checklist of computer-science and software-engineering concept categories that show up on (or adjacent to) LeetCode and in senior-engineering interviews. Use this index to navigate the corpus top-down: pick a category, find the canonical name, follow the link to the concept note. Or use it bottom-up: grep your codebase for instances of each category, record what you find.

**Coverage legend:**
- ✅ canon entry exists
- ⬜ category recognized but no canon entry yet — [open an issue](https://github.com/Cyberworld-builders/praxikon/issues/new) to suggest one
- — n/a / out of scope

## DSA / algorithmic core

| # | Category | Canonical name | Nearest LC family | Canon |
|---|---|---|---|---|
| 1 | Hash map O(1) lookup | hashing / direct addressing | Two Sum (1) | ⬜ |
| 2 | Accumulate-while-iterating | fold / reduce | Running Sum (1480) | ⬜ |
| 3 | Combination-sum to target | N-sum | 3Sum / 4Sum (15, 18) | ⬜ |
| 4 | Group by key | bucketing | Group Anagrams (49) | ⬜ |
| 5 | Uniqueness / dedup | set membership | Contains Duplicate (217) | ⬜ |
| 6 | Sort + custom comparator | comparator sort | Largest Number (179) | ⬜ |
| 7 | Binary search | divide-and-conquer search | Binary Search (704) | ⬜ |
| 8 | Two-pointer | opposing / fast-slow pointers | Container With Most Water (11) | ⬜ |
| 9 | Sliding window | window invariant | Longest Substring (3) | ⬜ |
| 10 | Tree / graph traversal | DFS / BFS / post-order | Maximum Depth (104) | ⬜ |
| 11 | Topological sort | dependency ordering | Course Schedule (207) | ⬜ |
| 12 | Dynamic programming | optimal substructure + memoization | Climbing Stairs (70) | ⬜ |
| 13 | Greedy | exchange argument | Jump Game (55) | ⬜ |
| 14 | Recursion / backtracking | state-space search | Subsets (78) | ⬜ |

## Systems / production patterns

| # | Category | Canonical name | Nearest LC family | Canon |
|---|---|---|---|---|
| 15 | Memoization / caching | computed cache | LC 2622 (Cache With Time Limit) | ⬜ |
| 16 | Debounce / throttle | temporal rate-limit | LC 2627 (Debounce) | ⬜ |
| 17 | Pagination / iterator design | windowing / cursor | (design tier) | ⬜ |
| 18 | String tokenize + parse | predicate composition | Valid Parentheses (20) | ⬜ |
| 19 | N+1 → batched | complexity analysis | (instinct, not one Q) | ⬜ |
| 20 | State machine | finite automaton; priority-ordered terminals | (design tier) | ⬜ |
| 21 | Idempotency / retry-safety | dedup-on-write; unique-violation as signal | (systems) | ⬜ |
| 22 | Transaction / atomicity | ACID | — | ⬜ |
| 23 | Threshold bucketing / order stats | discretization | H-Index (274) | ⬜ |

## Data correctness

| # | Category | Canonical name | Notes | Canon |
|---|---|---|---|---|
| 24 | Missing-data vs sentinel in aggregation | NULL/missing vs in-band sentinel; denominator hygiene | correctness, not one LC question | ✅ [null-coalesce-to-zero-in-aggregation](../concepts/null-coalesce-to-zero-in-aggregation.md) |
| 25 | Mean-of-means vs pooled / aggregation unit | unit of analysis; Simpson's paradox | correctness, not one LC question | ✅ [mean-of-means-vs-pooled-mean](../concepts/mean-of-means-vs-pooled-mean.md) |
| 26 | Content pagination / bin-packing | fixed-capacity bins | layout / report design | ⬜ |
| 27 | Index-vs-value encoding / off-by-one | single source of truth for an encoding | off-by-one drills | ⬜ |

## Security / authorization

| # | Category | Canonical name | Notes | Canon |
|---|---|---|---|---|
| 28 | SECURITY DEFINER for RLS recursion | privileged-helper hardening; setuid analog | systems-security | ✅ [security-definer-rls-helpers](../concepts/security-definer-rls-helpers.md) |
| 29 | Mass-assignment defense | strong parameters; allow-list at the API boundary | OWASP top 10 family | ⬜ |
| 30 | Fail-closed routing / defense in depth | layered authorization gates | (systems) | ⬜ |
| 31 | Documented-invariant drift | contract-vs-implementation gap | governance / testing, not LC | ⬜ |
| 32 | Browser feature deny-by-default | Permissions-Policy; CSP family; capability gating | web security headers | ✅ [permissions-policy-feature-gating](../concepts/permissions-policy-feature-gating.md) |

## Web / SEO / frontend correctness

| # | Category | Canonical name | Notes | Canon |
|---|---|---|---|---|
| 33 | Internal links to redirected slugs | indirection collapse at source; link-equity preservation | SEO + perf, recurring | ✅ [internal-links-bypass-redirect-hops](../concepts/internal-links-bypass-redirect-hops.md) |
| 34 | Responsive image sizes accuracy | sizes vs srcset variant selection; trust the heuristic | frontend perf, counterintuitive | ✅ [accurate-sizes-attribute-for-responsive-images](../concepts/accurate-sizes-attribute-for-responsive-images.md) |
| 35 | Structured data / schema.org coverage | JSON-LD; type-by-page-role | SEO surface | ⬜ |
| 36 | Sitemap / robots / canonical URLs | crawl-graph hygiene | SEO surface | ⬜ |

## Frontend perf / critical path

| # | Category | Canonical name | Notes | Canon |
|---|---|---|---|---|
| 37 | Priority-hint saturation | "everything urgent = nothing urgent"; entropy of priority signal | universal across schedulers | ✅ [priority-hint-saturation](../concepts/priority-hint-saturation.md) |
| 38 | Interaction-deferred third-party scripts | lazyOnload pattern; isolating vendor JS from LCP/INP windows | recurring across content sites | ✅ [interaction-deferred-third-party-script-loading](../concepts/interaction-deferred-third-party-script-loading.md) |
| 39 | LCP discovery + measurement | Core Web Vitals; field vs lab data | Lighthouse trace literacy | ⬜ |
| 40 | bf-cache compatibility | back/forward cache; `unload` vs `pagehide` | navigation perf | ✅ [bfcache-disqualification-by-unload-listener](../concepts/bfcache-disqualification-by-unload-listener.md) |

## Accessibility / a11y math

| # | Category | Canonical name | Notes | Canon |
|---|---|---|---|---|
| 41 | Color contrast (WCAG AA/AAA) | luminance ratio; deterministic pass/fail thresholds | a11y, objective math | ✅ [wcag-color-contrast-aa](../concepts/wcag-color-contrast-aa.md) |
| 42 | Keyboard navigability + focus management | focus-visible; trap-prevention; skip links | a11y, interaction | ⬜ |
| 43 | Semantic HTML + ARIA landmarks | role hierarchy; reading order | a11y, structure | ⬜ |
| 44 | Forced-colors + prefers-contrast support | system-pref honoring | a11y, user override | ⬜ |

## Hygiene / maintainability

| # | Category | Canonical name | Notes | Canon |
|---|---|---|---|---|
| 45 | Dead code preserves stale config | latent footgun; "delete the thing, not just the import" | recurring across cleanups | ✅ [dead-code-as-config-drift-footgun](../concepts/dead-code-as-config-drift-footgun.md) |
| 46 | Assertion drift (test enforces stale truth) | sibling of documented-invariant-drift (#31) | governance, but in tests | ⬜ |

## How to use this

1. **Top-down:** pick a category. If ✅, read the canon note. If ⬜, see whether your codebase has an instance of the pattern that's worth canonizing — and open an issue.
2. **Bottom-up:** when reviewing real code, ask "which category of this index does this resemble?" — that question alone often produces the canonical name you needed.
3. **Coverage growth:** ✅ entries appear when a pattern recurs across multiple real codebases and a maintainer has drafted + anonymized a note. The corpus grows from the field, not from a curriculum committee.
