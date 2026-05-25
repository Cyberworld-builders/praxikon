---
topic: web/frontend-perf-and-third-party-scripts
canonical_terms: [lazy loading, defer, async, lazyOnload, third-party scripts, critical rendering path, INP, FID, LCP, interaction-deferred loading, idle scheduling, requestIdleCallback, Long Tasks, bfcache]
---

# Interaction-deferred third-party script loading

## The one-liner
Third-party scripts you don't strictly need during initial paint — analytics, ad pixels, chat widgets, A/B test runners, marketing tags — should not run during the critical rendering path. The right place to fire them is **after the first user interaction** (or after a bounded idle timeout, whichever comes first), not on `DOMContentLoaded` and definitely not before. This is one of the highest-leverage perf optimizations available for content-heavy sites that have accumulated vendor tags.

## The pattern

A typical content site accumulates vendor tags over time: GA4, Google Tag Manager, Google Ads, Facebook Pixel, LinkedIn Insight, Hotjar, Intercom, Drift, LeadTruffle, ConversionLab, ChartBeat, Segment. Each one adds 50–200 KB of JS, fires its own network requests, runs its own code on the main thread, often attaches scroll/click/unload listeners, and sometimes does layout-triggering DOM work.

The naive load strategy is `<script src="..." async>` or `<script defer>` in `<head>`. Both fire **early in page load** — async fires as soon as the script downloads, defer fires after parsing. Either way, the third-party JS competes with your own critical-path code for main-thread time during the window where LCP and INP are measured.

The interaction-deferred pattern moves this load to *after* a user signals engagement (`scroll`, `touchstart`, `keydown`, `mousemove`) — or to a fixed timeout — whichever comes first:

```ts
<Script
  id="google-analytics"
  strategy="lazyOnload"
  dangerouslySetInnerHTML={{
    __html: `
      (function(){
        var loaded = false;
        function _loadGA() {
          if (loaded) return;
          loaded = true;
          ['scroll','touchstart','keydown','mousemove'].forEach(function(e){
            document.removeEventListener(e, _loadGA, {capture:true});
          });
          var s = document.createElement('script');
          s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
          s.async = true;
          document.head.appendChild(s);
          // ... configure gtag ...
        }
        ['scroll','touchstart','keydown','mousemove'].forEach(function(e){
          document.addEventListener(e, _loadGA, {capture:true, once:true, passive:true});
        });
        // Fallback: load after 8s even without interaction
        setTimeout(_loadGA, 8000);
      })();
    `,
  }}
/>
```

Three behaviors stack:

1. **Listener-driven activation.** Common interaction events (scroll, touch, keyboard, mouse) act as load triggers. The `{once: true, passive: true}` options ensure they fire exactly once and don't block scroll.
2. **Idempotency guard.** A `loaded` flag prevents multiple triggers from firing the load twice (mouse + scroll within milliseconds is normal).
3. **Bounded fallback.** A `setTimeout(load, 8000)` ensures the script eventually loads even if the user reads passively. Without the fallback, analytics on bouncers (~30% of traffic) silently goes uncollected.

The result: LCP is measured against your own code only, on real-user-monitored traffic; the third-party JS lands during a window where the user is already engaged and a bit of jank costs less.

## Why this works (the critical window)

Core Web Vitals are measured in a specific window:

- **LCP** (Largest Contentful Paint) — usually 1–4s in, the hero image / headline finishes painting.
- **INP** (Interaction to Next Paint) — measures responsiveness on user interactions, replacing FID in 2024.
- **CLS** (Cumulative Layout Shift) — measured over the entire session.

Third-party scripts hurt the first two specifically. During the LCP window, the main thread is busy parsing/executing JS — *any* JS, including yours. Subtract third-party JS, LCP gets faster. INP improves because the main thread isn't blocked when the user finally interacts.

The interaction-deferred pattern moves the cost to a window where the user already cares and is more tolerant of a brief delay. It's not free — Lighthouse may still flag long tasks from your deferred scripts. But the *measured* metrics are now your code, not their code.

The 8-second fallback is the tradeoff. Without it, bouncers (visitors who never scroll/click) never trigger analytics, and you lose ~10–30% of your tracking data. With it, the worst-case load is 8 seconds in — well past the metrics window for nearly all users.

## How to do it right (the checklist)

When integrating a third-party script:

- [ ] **Decide if it needs to run before first interaction at all.** Many don't. Question the default before optimizing.
- [ ] **Use the framework's deferred-load strategy.** Next.js: `strategy="lazyOnload"` or `strategy="worker"`. Other frameworks: equivalent. Don't roll your own unless the framework's option is broken.
- [ ] **Attach to interaction events with `{once: true, passive: true}`.** `passive: true` is critical on scroll/touch — without it, the listener blocks scroll responsiveness.
- [ ] **Add a fallback timeout** (8–10s is the common range). The fallback covers bouncers.
- [ ] **Guard with an idempotency flag** so multiple triggers don't double-fire.
- [ ] **Remove listeners after first fire** to avoid the listeners themselves becoming a long-lived perf cost.
- [ ] **Test that you didn't break the tag's purpose.** Conversion tracking that fires 8 seconds late may miss the conversion event itself. Some tags need to be available at click time, not just eventually.
- [ ] **Measure before and after.** Lighthouse mobile trace; CrUX data; RUM. The win should be visible in LCP and TBT (Total Blocking Time).
- [ ] **Audit the listener stack.** If you have N deferred scripts each attaching the same interaction listeners, the first interaction fires N loaders simultaneously — back to congestion. Centralize into one loader that fans out.

## Adjacent considerations

### Tag-management consolidation

If you're loading 4+ third-party scripts, consider routing them through a single tag manager (Google Tag Manager, Segment, etc.) that itself is interaction-deferred. The TM is a router; each child tag loads when the TM tells it to. This collapses N independent loaders into one.

### Worker-based loading (`strategy="worker"` in Next.js)

A more aggressive option: load the third-party JS in a Web Worker via Partytown. The third-party code runs off the main thread entirely. Works well for analytics-only tags; breaks tags that need DOM access.

### Bf-cache (back/forward cache) compatibility

Some third-party scripts attach `unload` event listeners. The presence of `unload` *disqualifies the page from bfcache*, regardless of when the listener was attached. A deferred-loaded tag still kills bfcache if it includes an `unload` handler — so deferred loading helps LCP but doesn't help repeat-visit-via-back-button speed. (LeadTruffle and several other vendor widgets are documented offenders here; their bfcache impact is a vendor concern, not a strategy concern.)

### `requestIdleCallback` as an alternative trigger

Instead of interaction events + timeout, some patterns use `requestIdleCallback(load, { timeout: 8000 })`. Fires when the main thread is idle. Cleaner code path, slightly different timing. Safari support is recent.

### Critical-path third-party scripts (don't defer these)

Some scripts genuinely need to fire pre-interaction: consent management (GDPR/CCPA banners must appear before analytics can fire), authentication SDKs, A/B test deciders that gate the initial render. These are exceptions; document them so future maintainers don't reflexively defer them.

## Canonical adjacencies

- **`<script defer>` vs `<script async>`** — script tag attributes. `defer` preserves order, runs after parsing; `async` races. Both fire much earlier than the interaction-deferred pattern.
- **`requestIdleCallback`** — schedule work for browser idle time. Cleaner than `setTimeout` for non-critical work; not universally supported but improving.
- **Partytown** — runs third-party scripts in a Web Worker via off-main-thread DOM proxying. Industrial-strength version of "get this off the main thread."
- **Service Worker request interception** — can rewrite or block third-party requests at the network layer. Heavier mechanism; complementary, not a substitute.
- **Consent Mode v2** (Google) — defer analytics behavior until consent is granted. Layers on top of interaction-deferral.
- **`prefers-reduced-data` media query** — opt-out signal from data-saver users. Interaction-deferred is reasonable always; consider skipping the load entirely on `prefers-reduced-data: reduce`.
- **Lighthouse's `third-party-summary` audit** — surfaces all third-party scripts and their main-thread cost. Run quarterly; this is how you catch tag accumulation.

## Adjacent traps

- **`{passive: false}` on scroll/touch listeners.** Cancels the perf benefit; scroll responsiveness regresses. Almost always wrong on a deferred-load trigger.
- **Forgetting to remove the listeners after first fire.** A listener attached `{once: true}` is auto-removed; one attached without `once` lingers. Either pattern works, but they're not equivalent.
- **Multiple deferred loaders attaching the same listeners.** First interaction fires all of them at once. Centralize into one trigger; fan out within it.
- **Loading the tag manager deferred but the underlying tags still in `<head>`.** Half-deferred; the perf win is partial. Verify the TM is the only entry point.
- **Treating `lazyOnload` as a free perf win.** It's a tradeoff: late tags miss early conversions, can break attribution windows for analytics, and may cause flickering UIs (chat widgets popping in mid-read). Measure both perf and the business metric the tag exists to serve.
- **Forgetting consent gating.** A deferred analytics load that fires before the consent banner is dismissed is non-compliant in some jurisdictions. The consent state must gate the load itself, not the firing of events.
- **The 8s fallback as the source of LCP regression.** If the fallback fires *during* the LCP window for slow users, you've reintroduced the problem you were solving. 8s is well past LCP on healthy networks; verify on real-user metrics, not synthetic.

## Self-check questions

- A site with 6 third-party tags reports LCP of 4.2s on mobile. After moving all 6 to `lazyOnload` with an 8s fallback, LCP drops to 1.8s. What's likely happening, and what's the next thing to verify before celebrating?
- Why does the 8s fallback exist? What user segment is it protecting? What's the cost-of-protection at scale?
- A teammate proposes attaching the interaction listeners *without* `passive: true`. What breaks?
- A conversion-tracking pixel fires 7 seconds after page load (during the 8s fallback) but the user converts at 3 seconds (clicks the buy button before the pixel loads). What's the failure mode? How do you fix it without dropping the deferred-load pattern?
- You have 5 deferred-loaded scripts each attaching the same set of interaction listeners. What's the consequence on first user interaction? How do you fix it?
- `Partytown` claims to "run third-party scripts off the main thread." What's the tradeoff vs. interaction-deferred loading? Which is more appropriate for an analytics tag vs. a chat widget?
- Explain the bfcache interaction. Why does interaction-deferred loading not help bfcache, and what would?
