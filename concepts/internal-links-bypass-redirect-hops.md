---
topic: web/seo-and-frontend-perf
canonical_terms: [link equity, PageRank conservation, 301 redirect, redirect chain, canonical URL, crawl budget, indirection collapse, alias canonicalization, fix-at-source vs fix-at-destination]
---

# Internal links should bypass known 301-redirects

## The one-liner
A 301 redirect is a *backstop for references you don't control* (external links, bookmarked URLs, search-engine indexes). It is **not** a substitute for cleaning up references you do control. Internal links pointing at a slug you know will 301 to a canonical URL waste a network hop on every click and bleed link equity to search engines on every crawl — silently, on every page render, forever.

## The pattern
Most non-trivial sites accumulate a redirects table: legacy slugs, renamed sections, consolidated services, fixed typos. The table exists because external references — Google's index, third-party blogs, printed business cards — still point at the old URL. Each entry says "if anyone asks for `/old`, send them to `/new` (HTTP 301, permanent)."

The redirects table is correct and necessary. The mistake is letting it become a load-bearing layer in your **internal** navigation:

```tsx
// next.config.ts has a permanent 301 from /services/pipe-maintenance
// to /services/pipe-leak-repair. So this "works"…
<Link href="/services/pipe-maintenance">Pipe Maintenance</Link>

// …but every click hits the canonical URL via a 301 hop, and
// every Googlebot crawl of this internal link counts as a
// redirected internal link, not a direct one.
```

The fix is mechanical:

```tsx
<Link href="/services/pipe-leak-repair">Pipe Leak Repair</Link>
```

No redirect hop, no link-equity loss, no crawl-budget waste. The redirect rule stays in the table for the next external reference that needs it; the internal reference doesn't.

## Why this matters (the three taxes)

A redirected internal link costs you three different things, on three different timescales:

1. **User latency (per click).** Browser issues GET `/old` → server returns `301` with `Location: /new` → browser issues GET `/new`. One extra round-trip, often 100–300 ms on real networks. Compounding when chains form (rare but real: `/old1` → `/old2` → `/new`). Mobile users on cellular pay this most.

2. **Link equity loss (per crawl).** Search engines historically passed *most* of a link's authority through a 301 — but not all of it. Google's official line has shifted over the years (~85–95% pass-through, some periods 100%, with caveats), but every authority memo from every SEO source agrees on one thing: **a direct link is never worse than a redirected one.** When the asset you can edit is on your own site, "never worse" is reason enough.

3. **Crawl budget (per re-index).** Googlebot has a finite budget per domain per period. A 301 hop counts as a separate fetch. Sites with thousands of internal redirected links spend a measurable fraction of their crawl budget chasing their own indirections instead of finding new pages.

These three taxes are independent. The first one is observable in devtools. The second and third are invisible day-to-day and detectable only via Google Search Console, log analysis, or a site crawler (Screaming Frog, Sitebulb, Semrush) that flags "internal links to redirects" as a finding.

## The CS framing — fix indirection at the source

The same pattern shows up in almost every system that has a *naming* layer:

- **Unix symlinks.** `ls -l /etc/foo` shows `foo → /var/lib/foo`. Scripts that hard-code `/etc/foo` work — but pay a `readlink()` lookup per access. Scripts that hard-code `/var/lib/foo` skip the lookup. The symlink exists for the cases you didn't update; don't lean on it where you can edit the source.
- **DNS CNAME chains.** `api.example.com` CNAME→ `api-prod.example.com` CNAME→ AWS ELB. Each CNAME costs a resolution step. Internal services should point at the apex or the leaf, not at chained aliases.
- **HTTP proxy chains** in microservices — same shape: each hop is observable in tracing as latency, and each one is a place a redirect can drift.
- **Database views** that wrap views that wrap views — same shape: the planner can inline, but the *human* reader can't, and the indirection becomes a maintenance burden.
- **Function aliases / re-exports** in package boundaries — same shape: `barrel.ts` re-exporting from `internal/` means every import pays an extra module-graph node.

The shared rule: **indirection is for references you can't update.** Where you can update the source, update the source.

## How to do it right (the checklist)

When you add or modify an internal link:

- [ ] **The href is the canonical URL** (the final destination after all redirects in `next.config.ts` / `_redirects` / `nginx.conf` / your routing layer). If you have to think "this will redirect to," fix the link.
- [ ] **The redirects table is for external references only.** Treat each entry as a one-way promise to outside callers, not a routing layer for your own pages.
- [ ] **A site crawl periodically flags `internal links to redirects`.** Screaming Frog, Sitebulb, Lighthouse, Semrush Site Audit, or your own crawler — pick one and put "internal redirect hops = 0" on the dashboard. It's a regression check, not a one-time fix.
- [ ] **The internal-link audit runs after every URL rename.** When you add a new redirect to the table, immediately grep the codebase for the old slug and update internal references. The redirect catches external traffic; the grep catches internal traffic.
- [ ] **In a CMS / content store, the same rule applies to content links.** Editor-written blog posts can also point at old slugs. A content-side crawler / linter is the right tool there.

## Canonical adjacencies

- **301 vs 302** — 301 is permanent (cacheable, passes more equity); 302 is temporary (less equity, more re-checking). Internal redirects should almost always be 301.
- **`rel="canonical"`** — a different tool for a different problem: tells search engines "if you find multiple URLs that show this content, prefer this one." Solves a *duplicate content* problem, not a *redirect hop* problem. Both can be needed; they don't substitute.
- **Trailing-slash normalization** — a sibling redirect class (`/foo` → `/foo/` or vice versa). Same hygiene applies: internal links should match the normalized form.
- **Case-sensitivity in redirects** — Next.js `redirects()` matches case-insensitively. Mixing-case internal links can create silent infinite-loop redirects when the destination case-folds to the source. (Jeneral hit this with the Acton hotfix #199.)
- **HSTS preload** — `http://` → `https://` is also a redirect hop. Internal links should always be relative or `https://`; never hard-code `http://`. HSTS at the browser elides the round-trip for repeat visitors, but the first visit still pays.

## Adjacent traps

- **Redirect chains across config layers.** `_redirects` says `/a → /b`, `nginx` says `/b → /c`, app says `/c → /d`. Each layer is small; the chain is invisible. Use a crawler that follows redirects fully and reports chain depth.
- **CMS-authored internal links to old slugs.** Editors copy-paste URLs. The fix is a "broken-link + redirected-link" content linter, not a one-time crawl.
- **Asset URLs (images, CSS, scripts) redirecting.** Often missed because they're not "links" in the SEO sense. Same hop tax. Same fix.
- **Open-graph and canonical URLs in the same page redirecting.** If `<meta property="og:url">` points at a slug that 301s, Twitter / LinkedIn / iMessage previews fetch the redirected URL, get the canonical one, and may cache the wrong title or image. Edge case but observable.
- **Loops.** The most embarrassing one: `/a → /b` and `/b → /a` (often through case folding or trailing-slash mismatches). A live site goes 308-loop forever. Test redirect chains in CI, not in prod. (See: jeneral hotfix PR #199 — `Acton case redirect causing infinite 308 loop`.)

## Self-check questions

- A site's redirects table has 80 entries. Half of the internal links on the homepage point at slugs in the table. Which problem is bigger: the 80 entries or the half that point at them? Why?
- Why is a direct internal link strictly better than a 301-redirected internal link, even if the redirect "passes 100% link equity"?
- You're asked to remove a redirect entry because "nobody uses it anymore." What do you check before deleting it? What's the failure mode if you guess wrong?
- A teammate proposes: "We don't need to update internal links — the redirects table catches it." What's the strongest argument against this, in terms a non-SEO engineer would buy?
- A redirect-chain audit shows `/a → /b → /c → /d` for a heavily-trafficked URL. Which fixes are equally valid, and which one minimizes risk of regression?
- Why is `rel="canonical"` *not* a substitute for fixing redirected internal links? Name a specific scenario where you need both.
