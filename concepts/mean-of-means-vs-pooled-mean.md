---
topic: programming/data-aggregation
canonical_terms: [unit of analysis, aggregation granularity, mean of means, pooled mean, grand mean, weighted average, Simpson's paradox, scope]
---

# Mean-of-means vs pooled mean (and choosing the unit of analysis)

## The one-liner
Before you average, answer two questions: **what is the unit** (per person? per rater? per group?) and **over what population**? Get either wrong and the number is silently incorrect — it computes fine, it's just answering a different question than the one asked.

## The core distinction
Given groups with values, there are two different "averages":
- **Pooled mean (grand mean over raw observations):** `Σ all values / total count`. Larger groups dominate.
- **Mean of means:** `Σ groupMean / numberOfGroups`. Every group counts equally regardless of size.

They are equal **iff every group is the same size.** Otherwise they differ — sometimes enough to flip a conclusion (**Simpson's paradox** is the extreme case). Neither is "more correct" in the abstract; correctness depends on the **unit you intend to weight equally**.

A 360-feedback "norm across this assessment" wants to weight **each target equally** — so it's a *mean of per-target means*, not a pool of all raters (which would over-weight popular targets). Picking the wrong one isn't a crash; it's a wrong answer that looks plausible.

## Unit of analysis & scope — the upstream decision
The mean-of-means choice is downstream of a bigger one: **what population are we aggregating, and at what granularity?**
- **Scope bug pattern:** a norm computed over a single group's members (each target has their own group) instead of survey-wide. The helper was *shaped* for a group, so reusing it for a survey-wide statistic silently narrowed the population to ~one person. Right population key: `(assessment_id, survey_id)`, group-independent.
- **General lesson:** a function parameterized by `groupId` carries an implicit scope assumption. Reusing it for a different aggregation level imports that assumption. Name the population key explicitly at the call site.

## Adjacent traps that travel with this
- **Weighted vs unweighted average:** mean-of-means is just an unweighted average of group means; if you *do* want size-weighting, that's the pooled mean. Decide intentionally.
- **Unit/scale double-shift:** porting a formula across systems can double-apply a transform. Example: a spreadsheet adds `+1` to map a 0–4 option index onto a 1–5 scale; if the DB *already* stores 1–5, copying the `+1` double-shifts. **Verify the stored encoding before porting a formula.**
- **Excluding non-data first:** both means must be computed over real data only — see [`null-coalesce-to-zero-in-aggregation.md`](./null-coalesce-to-zero-in-aggregation.md). The missing-data and unit-of-analysis bugs often stack in the same code path.

## How to do it right
1. State the unit ("equal weight per target") and population ("this assessment+survey") *before* writing the reduce.
2. If groups vary in size, decide pooled vs mean-of-means deliberately; document why.
3. Don't reuse a scope-bearing helper (`byGroupId`) for a different aggregation level — write the survey-wide one.
4. Validate the encoding/scale of every input you didn't produce yourself.

## Self-check questions
- When do mean-of-means and pooled mean give the same answer? When do they diverge most?
- A "norm" changes on every individual's report. What does that tell you about its scope?
- You're handed a working spreadsheet formula. What must you check before porting it into code that reads a different data store?
