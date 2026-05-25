---
topic: web/security-and-defense-in-depth
canonical_terms: [Permissions-Policy, Feature-Policy (legacy), defense in depth, deny by default, least privilege, security headers, Content Security Policy (CSP), browser-enforced capability gating]
---

# `Permissions-Policy` as browser-enforced feature deny-by-default

## The one-liner
The browser will *enforce* a deny-by-default capability list for you — for free, with one HTTP response header — but only if you set the header. A `Permissions-Policy` declares which Web Platform APIs (camera, microphone, geolocation, payment, USB, motion sensors, etc.) are permitted on this origin. If you don't need a capability, deny it. The cost is one header line; the protection is the *capability* itself becoming inaccessible even to an attacker who lands JavaScript on the page.

## The pattern
A boring marketing site has no business asking for the user's camera, microphone, location, payment instruments, USB device, or motion sensors. But by default, every modern browser permits scripts on the page to *try*. A successful try requires a user-gesture prompt — but the prompt itself is a phishing surface, the API existence is fingerprintable, and a compromised third-party script (analytics, ad tag, chat widget) gets the full API surface to work with.

`Permissions-Policy` is the browser-side enforcement of "this origin has no business doing that":

```ts
response.headers.set(
  "Permissions-Policy",
  "camera=(), microphone=(), geolocation=(), payment=(), usb=(), " +
  "magnetometer=(), accelerometer=(), gyroscope=()"
);
```

The empty parentheses `()` mean "allow no origins" — not even self. Once this header is set, calls to `navigator.mediaDevices.getUserMedia()` reject with `NotAllowedError`, `navigator.geolocation.getCurrentPosition()` errors out, `PaymentRequest` constructor throws, etc. **Even an attacker who succeeds in injecting and executing JavaScript on the page** cannot invoke the disabled capability — the gate is in the browser, not in the page's code.

This sits in the same family as the other "boring header that quietly removes a whole attack class" set:

```ts
response.headers.set("X-Content-Type-Options", "nosniff");          // no MIME sniffing
response.headers.set("X-Frame-Options", "DENY");                    // no iframing
response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
response.headers.set("Permissions-Policy", "camera=(), ...");       // ← this
// + Content-Security-Policy (the big one)
// + Strict-Transport-Security (HSTS)
```

Each header is one line. Each one removes a class of attacks. Most of them are off by default. The cost of setting them is trivial; the cost of *not* setting them is "you find out a third-party script is using `getCurrentPosition()` from your domain when a user complains."

## Why this works — defense in depth

`Permissions-Policy` does **not** replace input sanitization, CSP, or auth. It is a *defense-in-depth* layer underneath those. Reason about it the same way you'd reason about firewalling outbound traffic from a server: even though the application doesn't make outbound calls, you firewall outbound anyway, because the day an attacker lands code on the box you'd rather they not be able to call home.

The threat model `Permissions-Policy` actually addresses:

- **Third-party scripts you trust today, compromised tomorrow.** Analytics, ad tags, chat widgets, A/B testing snippets. They run with the full Web Platform API surface unless you take it away. `Permissions-Policy` takes it away.
- **Supply-chain attacks via npm.** Same shape: code you executed yesterday gets a malicious update today. If the package never needed `getUserMedia`, deny `camera=()` and the malicious version still can't call it.
- **XSS injection that survives CSP.** Even with a strict CSP, an inline script via an event handler attribute can sometimes execute. Without `Permissions-Policy`, that script can `navigator.geolocation.getCurrentPosition()` for the user's location. With it, the API throws.
- **Iframe-embedded scripts.** `Permissions-Policy` controls which features iframes on your page can use. The default is "inherits the parent's policy" — meaning if you set `camera=()`, no iframe on your page can ask for camera either.

## Reading the syntax

```
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(self "https://checkout.stripe.com")
```

- `camera=()` — no one can use camera (deny-all).
- `geolocation=(self)` — only the page's own origin (the `<iframe>` test fails for cross-origin frames).
- `payment=(self "https://checkout.stripe.com")` — own origin **plus** an explicit cross-origin allowlist.
- `*` (asterisk) — wildcard, any origin. Almost never the right answer.

The default for a feature not listed is browser-dependent and varies by feature; see MDN's per-feature default table. **The safe move is to explicitly deny everything you don't need**, then add back specific allowances if the feature is used (and only for the origins that use it).

## The feature list to consider

The headline ones to deny on a typical site that doesn't use them:

| Feature | Why deny |
|---|---|
| `camera`, `microphone` | Surveillance, audio fingerprinting |
| `geolocation` | PII leak; even denied, the prompt itself is a phishing surface |
| `payment` | Spoof of payment-request UI |
| `usb`, `serial`, `hid`, `bluetooth` | Hardware access — almost never needed by a website |
| `magnetometer`, `accelerometer`, `gyroscope` | Side-channel fingerprinting (orientation can identify a device) |
| `autoplay` | UX hostility; sometimes denied to prevent third-party ads |
| `display-capture` | Screen-share APIs |
| `fullscreen` | Often left as `(self)` for legitimate use |
| `clipboard-read`, `clipboard-write` | Data exfiltration vector |
| `screen-wake-lock` | Battery drain by malicious script |
| `interest-cohort` (legacy FLoC) / `browsing-topics` | Opt-out of behavioral profiling |

`Feature-Policy` (the previous name) is deprecated but still supported by older browsers — modern code should emit `Permissions-Policy` only; the syntax differs slightly between the two.

## How to do it right (the checklist)

When you set `Permissions-Policy` on a new project or audit it on an existing one:

- [ ] **Header is set on every response.** Middleware / edge function / framework header-set hook — not in `<meta>` (the meta-tag form has narrower browser support and weaker semantics).
- [ ] **Deny everything you don't use.** Default to `()` (no origins); add `(self)` only for features the page actually invokes.
- [ ] **Audit `(self)` allowances against actual code.** Grep for `navigator.geolocation`, `navigator.mediaDevices`, `PaymentRequest`, `navigator.usb` — if no usage, don't allow.
- [ ] **Verify in devtools.** Network tab → response headers. Should see `Permissions-Policy` on every page, not just the root. (Common bug: header set on HTML but not on iframe-served assets.)
- [ ] **Test that a denied capability actually throws.** A line in your e2e suite that attempts `navigator.geolocation.getCurrentPosition` and asserts the error keeps the policy honest if a teammate later relaxes it.
- [ ] **Pair with CSP.** `Permissions-Policy` controls *what code can do*; CSP controls *what code can run*. Both, not either.
- [ ] **Include `interest-cohort=()` / `browsing-topics=()`** if you don't want to be part of Google's advertising-cohort experiments. Opt-out, not opt-in.

## Canonical adjacencies

- **Content Security Policy (CSP)** — sibling header, broader scope, controls script execution and source loading. CSP says "no script from foo.com"; `Permissions-Policy` says "even allowed script can't call camera." Layered.
- **`X-Frame-Options` / `frame-ancestors` (CSP)** — anti-clickjacking. Same family of "browser-enforced negative space."
- **`Cross-Origin-Embedder-Policy` / `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy`** — the COEP/COOP/CORP triad, for isolating cross-origin resource access. Same family, more recent vintage.
- **Linux capabilities / seccomp** — same conceptual move at the kernel layer: "this process can do these things and nothing else." Browser is to `Permissions-Policy` as kernel is to seccomp.
- **AWS IAM permission boundaries** — same shape at the cloud-resource layer: an IAM role's effective permissions are intersected with the boundary; a `Permissions-Policy` is the browser's permission boundary on the origin.
- **`sandbox` attribute on `<iframe>`** — the iframe-local version of the same idea: opt-in to a deny-by-default capability set.

## Adjacent traps

- **Setting the header on the HTML response but not on iframes / workers / nested documents.** Each has its own header surface; verify the policy is applied everywhere capability-sensitive code might run.
- **Using `*` (allow-all) as a "we'll restrict later" placeholder.** It almost always stays. If you don't know what to set, deny — restriction is the safe default, allowance is the load-bearing decision.
- **Allowlisting an origin you don't fully control.** `geolocation=(self "https://maps.example.com")` is a delegation of trust to `maps.example.com`. If their site is XSS'd, the API is reachable from your origin's allowlist.
- **Forgetting `Feature-Policy` legacy header.** Some monitoring/security scanners still flag its absence. If you support very old browsers and care, emit both — but the modern world is `Permissions-Policy` only.
- **Confusing this header with `Permission` (singular) request prompts.** `Permissions-Policy` (plural, response header) is the deny gate. The `Permissions API` and per-feature prompts are user-facing affordances. Different layers.
- **Hidden third-party iframes inheriting your policy.** If an embedded chat widget needs camera (for video chat) and your policy says `camera=()`, the widget breaks. Audit the policy against the actual third-party feature requirements before deploying.

## Self-check questions

- A site has CSP, XFO, and `X-Content-Type-Options: nosniff`, but no `Permissions-Policy`. An attacker lands XSS on a page via a stored-data injection that CSP didn't catch. Which capabilities are the most immediate concern, and which would `Permissions-Policy` have prevented?
- What does `Permissions-Policy: camera=()` actually do at the JavaScript layer? Walk through what `await navigator.mediaDevices.getUserMedia({video: true})` returns.
- Why is "deny everything, add back what you use" safer than "allow everything, deny known-bad"? Why is the same logic *also* the standard for CSP, firewall rules, IAM, and seccomp?
- A teammate proposes setting the header in a `<meta>` tag instead of the HTTP response. What do they lose, and why?
- Your site uses `navigator.clipboard.writeText` for a copy-link button. What's the minimal `clipboard-write` policy that keeps the button working and denies cross-origin abuse?
- Explain how `Permissions-Policy` is analogous to AWS IAM permission boundaries. Where does the analogy break?
