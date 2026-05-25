---
topic: systems/resource-scheduling-and-perf
canonical_terms: [priority hints, fetchPriority, resource hints, preload, LCP, critical rendering path, scheduler starvation, priority inversion, "everything urgent = nothing urgent", priority normalization]
---

# Priority-hint saturation — "everything urgent = nothing urgent"

## The one-liner
A priority signal is a **relative ordering** over a bounded pool of slots. When you mark too many items "high priority," the priority bit stops conveying information and the resulting schedule converges on first-come-first-served — sometimes worse, because the scheduler now wastes work re-shuffling fake-priority items. The fix is to mark *only* what truly is highest-priority, and let the scheduler do its job on the rest.

## The pattern
Modern browsers, kernels, networks, and cloud schedulers all expose priority signals: `fetchPriority="high"` on `<img>`/`<link>`, `<script async>` vs `<script defer>`, `<link rel="preload">`, OS process `nice` values, AWS SQS message priority, Kubernetes pod priority classes, Linux ionice classes, queue weights in a job runner. Each is meant to tell the scheduler: *of all the things competing right now, this one matters most.*

The signal works **only when it's used sparingly.** A scheduler with 50 things in queue, 47 marked "high," can no longer use priority to break ties — the high-priority bucket is itself a FIFO. Worse, when the scheduler maintains separate fast and slow paths, marking everything high collapses the slow path's headroom and makes the fast path contended.

In the browser specifically:

```tsx
// Bad: every below-fold image marked priority "to be safe"
<Image src="/hero.jpg" priority fetchPriority="high" />        {/* the real LCP */}
<Image src="/testimonial-bg.jpg" priority />                   {/* below the fold */}
<Image src="/team-photo.jpg" priority />                       {/* on About page */}
<Image src="/service-bg.jpg" priority />                       {/* on service pages */}
```

Browsers have a small "high-priority" bandwidth pool. With four `priority` images, the real LCP image — the one that should land first — is now contending with three below-fold images that won't even be visible during initial paint. Result: LCP regresses, sometimes substantially, even though the developer thought they were *helping* by marking everything important.

The cure is to **mark only the LCP candidate** as `priority` + `fetchPriority="high"`, leaving everything else at the browser's default heuristic. The browser already prioritizes in-viewport images; nudging it to give equal billing to off-screen ones actively hurts.

## The broader pattern (where else this bites)

The same anti-pattern shows up at every layer where priorities are visible:

- **HTTP `<link rel="preload">`** — preloading every font, every CSS chunk, every above-fold script means the critical script gets no priority advantage. Modern guidance: ≤3 preloads, ideally just the LCP image + the critical font.
- **`async` vs `defer` vs nothing on `<script>`** — `async` runs *as soon as the script is loaded*, racing the parser. Adding `async` to N scripts makes them race each other. Often `defer` (or no attribute) is correct.
- **OS `nice` values** — a process at `nice -n -20` (highest priority) is meaningful when one process holds the slot. If ten processes share `-20`, the kernel time-slices among them, and a separate `-19` process never runs because *its* priority is now lower than all ten.
- **Kubernetes `PriorityClass`** — preemption only happens when the cluster is full. Marking every workload `system-critical` defeats the eviction story for anything that genuinely is.
- **AWS SQS `MessagePriority`** (or equivalent at any queue) — same shape. If everything is "urgent," the queue is FIFO and the priority field is dead weight.
- **Bug tickets marked "P0"** — non-technical version. A backlog where 60% of items are P0 has the same problem.

The underlying rule is **information-theoretic**: a signal carries information only when its distribution is unequal. When 47/50 items have the same priority value, the field has near-zero entropy and the scheduler must fall back to other signals (FCFS, file size, type, source location) to break ties — and those signals were *not* what the developer wanted.

## The Next.js `priority` prop trap (a specific instance)

Next.js's `<Image priority>` prop attaches behavior that varies across major versions, and is a current example of the saturation pattern compounding with framework-specific quirks:

- In some recent Next.js versions (16.x as of this writing), `priority` triggers a `<link rel="preload">` for the image but does **not** automatically add the `fetchpriority="high"` attribute on the rendered `<img>` element. The preload reserves bandwidth; the fetchpriority attribute tells the browser to *use* that bandwidth ahead of normal-priority resources. Setting `priority` without `fetchPriority="high"` partially fires the signal — the resource is hinted but not promoted.
- Below-fold components wrapped in lazy / `content-visibility: auto` boundaries can still carry `priority` — wrapping doesn't strip the prop. The preload fires regardless of viewport position.

The result: you can have *one* explicitly-priority LCP image competing with *several* lazy-but-still-priority other images, and the LCP loses. Diagnosing this requires reading the Lighthouse trace's `lcp-discovery-insight` and looking at `priorityHinted: false / true` per resource. The trace tells you whether the priority signal landed; the source code tells you whether you *intended* it to land. The gap is the bug.

## How to do it right (the checklist)

When you're tempted to add a priority hint:

- [ ] **Identify the single critical resource.** For a web page, that's the LCP candidate (hero image, hero text font). For a network queue, the one message blocking checkout completion. For a job runner, the one job whose latency a user is staring at. There's almost always exactly one.
- [ ] **Mark only that one.** Default everything else to the scheduler's default.
- [ ] **Verify the signal actually landed.** Lighthouse for browser perf, `top`/`htop` for OS, queue-depth metrics for cloud queues. The signal you intended ≠ the signal the scheduler saw, until you check.
- [ ] **When the system gets slower after you add priorities, suspect saturation.** Performance regressing under priority changes is the classic symptom of "too many high" — back the priorities off, not up.
- [ ] **For browser images specifically:** `priority` + `fetchPriority="high"` on the LCP candidate, *nothing* on anything below the fold. `loading="lazy"` is the opposite signal; use it on below-fold images.
- [ ] **Audit priorities periodically.** Like security headers or CSP allowances, priority hints drift over time as features are added. A quarterly "find all `priority`-tagged resources and re-confirm" sweep catches saturation early.
- [ ] **Document the criticality decision.** A comment on the priority-marked resource explaining *why* this one — so the next person doesn't add a sibling.

## Canonical adjacencies

- **Priority inversion** (Mars Pathfinder, classical OS) — a low-priority task holds a lock a high-priority task needs; high waits for low. Different problem but same conceptual layer: priorities only work when the scheduler can act on them.
- **Resource Hints** (W3C spec) — `dns-prefetch`, `preconnect`, `preload`, `prefetch`, `prerender`. Each carries its own priority signal. Same saturation logic applies.
- **HTTP/2 stream priority / HTTP/3** — protocol-level priority hints between client and server. Some servers ignore them; some respect them strictly; the saturation principle applies at the protocol layer too.
- **Linux CFS (Completely Fair Scheduler) nice values** — weights, not strict priorities. CFS still time-slices among same-weight tasks, but the slope of the weight function means a +5 nice difference is a real difference.
- **Kubernetes `PriorityClass` + `PriorityClassName`** — discrete priority *levels*. The cluster sorts by level; within a level it's FCFS. Marking everything `system-cluster-critical` defeats the priority-class mechanism.
- **`async` vs `defer` on scripts** — `defer` preserves document order; `async` races. Mixing them is a classic source of order bugs.
- **Eisenhower matrix** (urgent × important, four quadrants) — the human-process analog. If everything is "urgent and important," the matrix collapses.

## Adjacent traps

- **"Just in case" priority.** A common impulse: "if I mark this preload, it can't *hurt*." It can. Every preload competes; many preloads collectively saturate the high-priority pool.
- **Priority that lies about resource cost.** Marking a 5 MB image `priority` doesn't make the network faster; it just front-loads the 5 MB into the critical path. Sometimes the right answer is *not* to load it at all (or to lazy-load and accept a slower LCP).
- **Priority inheritance bugs.** A wrapped component carries its inner prop unchanged; a wrapped queue inherits priorities of nested messages. The intended scope of the priority hint and its actual scope can differ.
- **A/B testing infrastructure marking experiments urgent.** Some experimentation tools mark the variant-deciding script `async` *and* `priority` so the experiment starts ASAP — and they collectively starve the LCP. Audit experimentation tools' resource hints separately.
- **Caching collapses the signal.** A resource that's cached doesn't go through the prioritized fetch path at all. Tuning priority for a resource that's already in the disk cache does nothing on repeat visits — but everything on first visits. Measure first visit, not warm.
- **The `loading="eager"` / `loading="lazy"` interaction.** `loading="lazy"` won't prevent a `priority` preload from firing; it controls *visibility-triggered* load, not preload. The two attributes coexist and can contradict.

## Self-check questions

- A page has one hero image marked `priority` and the LCP is 3.2s. You add three more `priority` images for below-fold sections "to make the whole page feel snappier." What's likely to happen to LCP and why?
- Why is "everything urgent" *worse* than "nothing urgent" in some scheduling systems, rather than just equivalent to it?
- A Kubernetes cluster has all 20 workloads at `PriorityClassName: high-priority`. A new critical workload arrives. What does the priority class system actually do for it?
- Explain the information-theoretic argument for sparingly-used priority signals. (Hint: entropy.)
- A teammate adds `<link rel="preload">` for every font, every script chunk, and the hero image. Lighthouse perf score drops. What's your diagnostic order of operations?
- When is `<script async>` the right choice and when is `<script defer>`? Why mixing them on a single page is often a bug.
