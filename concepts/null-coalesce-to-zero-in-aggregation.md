---
topic: programming/data-aggregation
canonical_terms: [missing data, sentinel value, NULL coalescing, arithmetic mean, denominator hygiene, NaN propagation, three-valued logic]
---

# Sentinel-vs-missing-data conflation in aggregation

## The one-liner
"No data" is **not** a value. The moment you encode it as one (`0`, `-1`, `""`), it stops being absent and starts participating in arithmetic — silently and wrongly. An arithmetic mean is only valid over rows that actually *are* data.

## Institutional vocabulary
- **Missing data** vs **sentinel value**: a sentinel is an in-band magic value standing in for "absent" (`0`, `-1`, `999`). Conflating the two is the root error. The principled alternatives are an **out-of-band null** (`NULL` / `None` / `Option::None`) plus a **presence/count indicator** (e.g. `answer_count`).
- **NULL coalescing** (`COALESCE`, `??`, `|| 0`): collapses absence into a default. Useful at the *presentation* edge; dangerous *upstream of an aggregation*, because it manufactures a data point.
- **Three-valued logic (3VL):** SQL `NULL` means "unknown," and `AVG()` already *ignores* NULLs correctly. Forcing `COALESCE(AVG(...), 0)` overrides that correct behavior and reintroduces the bug.
- **Denominator hygiene:** a mean is `Σx / n`. A spurious row corrupts **both** `Σx` (adds 0) and `n` (adds 1) — so it pulls the mean toward zero, not just adds noise.

## The trap, distilled
```
DB layer:   RETURN COALESCE(AVG(...), 0)      -- absent → 0.00, plus a row with count=0
App layer:  rows.reduce((s,r) => s + (r.score || 0), 0) / rows.length
                                  └─ second coalesce        └─ counts the non-data row
```
Two independent "defensive defaults," each reasonable alone, **compound** into one wrong number. Defensive defaults are not free; a default that fabricates a value is a liability at an aggregation boundary.

## How to do it right
1. **Preserve absence end-to-end.** Keep `NULL`/`None` (or carry the count/presence flag) all the way to the aggregation site. Don't coalesce upstream of a mean.
2. **Filter to data before folding.** `rows.filter(r => r.answer_count > 0)` then reduce. The fold is fine; constrain its *domain*.
3. **Range-validate the output.** If the valid scale is 1–5, a `0.0` is structurally impossible — assert/flag it. Impossible values are free bug detectors.
4. **Decide partial-data policy explicitly.** "≥1 answer counts" vs "answered all items" is a real modeling choice; name it, don't let a coalesce decide it for you.

## Adjacent concepts / where else it bites
- Floating-point **NaN propagation** (`0/0`) is the same family — an absence (empty set) entering arithmetic. Guard `n > 0` before dividing.
- **Null Object pattern** is the *legitimate* cousin: a stand-in object with neutral behavior — neutral, not value-bearing. A `0` in a mean is the opposite of neutral.
- Datawarehouse "default to 0" for missing facts is the same anti-pattern at scale; the fix is the same (distinguish "0 occurrences" from "not measured").

## Self-check questions
- A mean on a 1–5 scale reads `0.0`. What does that tell you, and where do you look first?
- Why does `AVG()` in SQL handle this correctly until someone wraps it in `COALESCE(.., 0)`?
- Why does one spurious zero-row hurt a mean more than it would hurt a sum?
