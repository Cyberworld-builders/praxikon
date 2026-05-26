---
topic: web/frontend-perf-and-navigation
canonical_terms: [bfcache, back/forward cache, unload event, pagehide event, BFCacheNotRestored, page lifecycle, navigation perf, vendor scripts, third-party script audit]
---

# `unload` listeners disqualify the page from bfcache

## The one-liner
Modern browsers can preserve a page's full in-memory state on navigation-away and instantly restore it on back/forward (`bfcache`) — but the optimization is **opt-out by accident**. The presence of an `unload` event listener anywhere on the page, by any script (yours or a vendor's), disqualifies the page entirely. Deferred loading doesn't help. The diagnostic is one Lighthouse audit; the fix is replacing `unload` with `pagehide`.

## What bfcache buys you

When a browser puts a page into bfcache, navigating to another origin and clicking back returns to the original page *instantly*: same DOM, same JS state, same scroll position, no re-fetch, no re-render, no script re-execution. The effect is most visible on cellular networks and on sites where back-navigation is common (blog → search results → blog, product browsing flows, content-heavy reading flows).

Chrome, Safari, and Firefox all implement bfcache. The eligibility rules differ slightly per browser, but they share one critical disqualifier: **the page must not have an `unload` event listener**.

## Why `unload` is incompatible

`unload` fires synchronously when the page is being torn down. Code in an `unload` handler expects the page to be destroyed afterward. Bfcache violates that expectation — the page is being *paused*, not destroyed. So browsers conservatively refuse to bfcache any page that registered an `unload` handler, because the handler's author assumed teardown semantics that no longer hold.

The presence of *any* `unload` listener — even one that does nothing, even one that was attached then removed and re-attached, even one in a third-party script you didn't author — is sufficient. Browsers don't introspect what the handler does; they refuse to gamble.

## Why deferred loading doesn't save you

A common mistake: assume that loading the offending script via `lazyOnload`, `requestIdleCallback`, `setTimeout`, or an interaction trigger will sidestep bfcache disqualification. It doesn't.

Bfcache eligibility is decided at navigation time, based on the *current state* of the page. If an `unload` listener is attached at the moment the user clicks back, bfcache fails. It doesn't matter that the listener was attached late, or that the script that attached it was deferred for perf reasons. Pairs with [[interaction-deferred-third-party-script-loading]] — same family, different metric: deferral helps LCP, not bfcache.

## The diagnostic procedure

When Lighthouse reports `bf-cache` failure with `protocolReason: "UnloadHandlerExistsInMainFrame"`:

1. **Confirm the symptom.** Open Chrome DevTools → Application tab → "Back/forward cache" → "Test back/forward cache." Navigate, then back. DevTools reports the specific reason and (often) which frame.
2. **Find the source.** Lighthouse only reports the symptom, not which script. Two approaches:
   - **Live: Chrome DevTools Performance Insights or `getEventListeners()`** in the console (on a recent Chrome). Filter for `unload`. Lists every listener with its source script.
   - **Static: grep the bundles.** Fetch every third-party script the page loads (`curl -sL <url> -o /tmp/x.js`), then grep for `addEventListener("unload"` or `addEventListener('unload'`. Most vendor minifiers preserve the event-name string literal. Quick wins:
     ```bash
     for url in $(grep -oE 'https://[^"]+\.js' /tmp/page.html | sort -u); do
       echo "=== $url ==="
       curl -sL "$url" 2>/dev/null | grep -oE 'addEventListener\s*\(\s*["\x27]unload["\x27]' | wc -l
     done
     ```
3. **Confirm attribution.** Once you suspect a script, temporarily block it (DevTools → Network → block URL → reload). If bfcache then passes, you've found the source.

## The fix paths

In priority order:

1. **For your own code: replace `unload` with `pagehide`.** `pagehide` fires at the same lifecycle moment but is bfcache-compatible. Its event object carries a `persisted` boolean — `true` means "going to bfcache," `false` means "actually being unloaded." Branch on it if you need to.
2. **For a vendor's code: file a support ticket with the grep evidence.** Many vendors will accept the fix; some have already shipped it but rolled out via feature flags. Don't speculate that they can't help — show them their own line of code.
3. **Conditional loading on pages where bfcache matters most.** If the vendor refuses and you can't drop them, load the offending script only on pages where back-navigation is rare (e.g., conversion-final pages) and skip it on browsing-flow pages (blog, listings, search).
4. **Self-hosted bundle proxy with the listener stripped.** Last resort: serve a modified copy of the vendor bundle from your own origin, with the `unload` listener patched out. Heavy ongoing maintenance burden; usually not worth it. Also a license risk if the vendor's terms forbid modification.
5. **Drop the vendor.** Sometimes the right answer if the vendor brings no business value commensurate with the bfcache regression.

## Other things that disqualify bfcache (the broader checklist)

`unload` is the most common offender, but not the only one. The full list (Chrome reference) includes:

- `unload` event listener (the headline)
- `beforeunload` event listener — same family, also disqualifies in some browsers
- Cache-Control header includes `no-store`
- HTTPS errors / mixed content
- WebSocket / WebRTC / WebTransport connections held open
- IndexedDB transaction in flight when navigation occurs
- Page is currently a SharedWorker host
- `navigator.locks` held
- Some autocomplete/keyboard states
- Browser-specific quirks (Safari has its own list)

Most are application-level concerns. The `unload`/`beforeunload` listeners are the most-fixable subclass — typically a one-line replacement.

## How to do it right (the checklist)

When auditing a site for bfcache eligibility:

- [ ] **Run Lighthouse with the `bf-cache` audit enabled** and inspect every failure reason. Don't aggregate — each reason has a distinct fix.
- [ ] **For each `unload` listener found**, identify the source (your code? framework? vendor?) and apply the appropriate fix path above.
- [ ] **Search your own codebase** for `addEventListener('unload'`, `addEventListener("unload"`, `window.onunload`, `document.onunload`. Replace with `pagehide` and adapt the handler if needed.
- [ ] **Repeat for `beforeunload`** — same hazard, milder symptom in some browsers, real symptom in others. Only use `beforeunload` when you actually need the "are you sure you want to leave?" prompt (the only legitimate use case).
- [ ] **Bake the audit into CI.** Lighthouse CI can fail a build if `bf-cache` regresses. Worth setting on content-heavy sites where back-nav is common.
- [ ] **Audit third-party scripts at vendor-addition time.** When integrating a new chat widget, analytics tag, or ad pixel: `curl -sL` their bundle and grep for unload before merging the integration PR. Catches the cost before it lands.

## Canonical adjacencies

- **`pagehide` event** — the bfcache-compatible replacement for `unload`. Same lifecycle moment, plus a `persisted` flag indicating whether the page is being bfcached vs actually unloaded.
- **`visibilitychange` event** — fires when the tab loses focus. Earlier than `pagehide`. Right tool for "flush analytics on tab-hide" use cases.
- **Page Lifecycle API** — the formal spec covering the page-state machine (active, passive, hidden, frozen, terminated, discarded). `pagehide` is its sanctioned transition handler.
- **`Cache-Control: no-store`** — the *other* most common bfcache disqualifier. Often set defensively on dynamic pages; usually overkill. Use `no-cache` or `private` instead when bfcache should still apply.
- **Service Worker `fetch` handler** — does NOT disqualify bfcache; this is a common misconception.
- **`navigator.sendBeacon()`** — the right way to "fire-and-forget a beacon at navigation time" without registering `unload`. Pair with `visibilitychange` or `pagehide`.
- See [[interaction-deferred-third-party-script-loading]] — same vendor-script family; different perf metric (LCP vs bfcache). Same lesson on the limits of deferral: deferral controls *when* code runs, not *what* it does.

## Adjacent traps

- **Removing the listener at runtime doesn't help.** Once a script attached an `unload` listener, even if it later calls `removeEventListener`, bfcache eligibility is decided at the navigation moment based on what's currently attached. Some vendor bundles attach + detach in normal operation; bfcache fails if the attached state coincides with the navigation.
- **Browser-version drift.** Bfcache rules tighten over time. A vendor bundle that didn't disqualify bfcache last year may now. Re-run the audit after a Chrome major-version bump.
- **`window.onunload = fn` is the same hazard.** The legacy property syntax has the same effect as `addEventListener('unload')`. Grep both forms.
- **iframes count.** An `unload` listener in *any* same-origin iframe disqualifies the parent. Cross-origin iframes have their own bfcache eligibility (mostly).
- **Lighthouse measures one navigation.** Field data (CrUX, RUM) can show a *different* picture if real user traffic hits different code paths. Trust RUM > synthetic for bfcache *impact*; trust Lighthouse for bfcache *eligibility*.
- **The "ghost listener" pattern.** Some scripts use `unload` as a sync-point to flush state. The `pagehide` replacement has identical fire timing for that purpose — there's no behavior reason to keep `unload`. Vendors who haven't migrated are usually doing it because the code is old, not because the migration is hard.

## Self-check questions

- Lighthouse reports `bf-cache` failure with `UnloadHandlerExistsInMainFrame` but you grep your own code and find no `unload` listeners. Where do you look next?
- A vendor's chat-widget bundle installs an `unload` listener. Your CTO asks "can we just deferred-load the widget so bfcache works?" What's your answer and why?
- A teammate writes `window.addEventListener('beforeunload', e => e.returnValue = '')` to show "are you sure?" prompts on a form. What's the bfcache cost and is it worth it for this UX?
- How does `pagehide` differ from `unload` in (a) when it fires, (b) what the event object contains, (c) bfcache eligibility?
- A site has `Cache-Control: no-store` set globally. A perf review wants bfcache. Which line(s) of headers do you change and what's the security tradeoff?
- Walk through the diagnostic chain: Lighthouse says `UnloadHandlerExistsInMainFrame`, but you have 15 third-party scripts on the page. What's your fastest path to attribution?
