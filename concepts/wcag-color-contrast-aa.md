---
topic: web/accessibility-and-a11y-math
canonical_terms: [WCAG 2.x, color contrast ratio, AA threshold, AAA threshold, relative luminance, contrast math, accessible text, low-vision accommodation, gray-on-white anti-pattern]
---

# WCAG color-contrast AA — the math, the thresholds, the trap

## The one-liner
Web accessibility's color-contrast requirement is an **objective arithmetic test**, not a design opinion. The ratio is a formula over the two colors' relative luminances; the threshold is a fixed number from the WCAG specification. A failing contrast ratio is a fact, not a preference — and one of the most common, fixable accessibility findings in production code.

## The formula

For two colors with relative luminances `L_lighter` and `L_darker`:

```
contrast_ratio = (L_lighter + 0.05) / (L_darker + 0.05)
```

The result is a number from 1.0 (identical colors) to 21.0 (pure black on pure white). WCAG defines pass/fail thresholds against this number:

| Threshold | Ratio | Applies to |
|---|---|---|
| AA — body text | ≥ 4.5:1 | Normal-weight text < 18pt (or < 14pt bold) |
| AA — large text | ≥ 3.0:1 | Bold ≥ 14pt or regular ≥ 18pt |
| AAA — body text | ≥ 7.0:1 | Same size rules, stricter threshold |
| AAA — large text | ≥ 4.5:1 | |
| AA — non-text UI | ≥ 3.0:1 | Icons, buttons, focus indicators, form-field boundaries |

Relative luminance itself is a weighted sum of the sRGB components, gamma-corrected:

```
L = 0.2126 * f(R) + 0.7152 * f(G) + 0.0722 * f(B)

where each channel value c (in 0..1) is gamma-decoded:
  f(c) = c / 12.92                      if c <= 0.03928
  f(c) = ((c + 0.055) / 1.055)^2.4      otherwise
```

The green channel dominates the luminance contribution (0.7152 weight) — a counterintuitive consequence: a "dark" green can be functionally *lighter* than a "light" red, for contrast purposes. Don't eyeball it. Compute it.

## Working through a real example

A form placeholder of `#767676` on a background of `#fcfbff`:

```
#767676 → RGB(0.4627, 0.4627, 0.4627)
  channels above threshold → f(c) = ((0.4627+0.055)/1.055)^2.4 = 0.1832
  L₁ = 0.2126*0.1832 + 0.7152*0.1832 + 0.0722*0.1832 = 0.1832

#fcfbff → RGB(0.9882, 0.9843, 1.0)
  all above threshold → average gamma-decoded ≈ 0.9647
  L₂ ≈ 0.968

ratio = (0.968 + 0.05) / (0.1832 + 0.05) = 1.018 / 0.2332 ≈ 4.37
```

**4.37 < 4.5.** Fails AA for body text. Lighthouse will report this; assistive-technology users will struggle to read it; the issue is real.

Bumping the gray to `#6b7280` (Tailwind `gray-500`):
```
#6b7280 → L ≈ 0.156
ratio = (0.968 + 0.05) / (0.156 + 0.05) = 1.018 / 0.206 ≈ 4.94
```

**4.94 > 4.5.** Clears AA with margin. Same visual intent, different number, passes the test. The fix is two hex characters.

## Why this trap recurs

Designers — and especially developers borrowing design-system defaults — reach for gray-on-white placeholder text because the visual hierarchy reads "this is hint text, not the value." The hierarchical instinct is correct; the chosen gray is too light. A few specific reasons this is everywhere:

1. **The eye is adaptive; the formula isn't.** On a calibrated bright screen, `#999` on white looks fine. On a dim laptop, on a phone outdoors, on a low-vision user's display, it disappears. The threshold is *for* the user who can't compensate.
2. **Design tokens drift slower than thresholds.** WCAG 2.0 (2008) had `4.5:1`; teams that adopted older tokens at design time kept them past the spec's adoption curve.
3. **Tools default to AA-fail.** Tailwind `gray-400` (`#9ca3af`) on white is `2.85:1` — below AA. The framework gave you a popular default that doesn't pass. Designers reach for it; nobody checks.
4. **Placeholder text specifically is doubly-affected.** Browsers further fade `<input>` placeholders by default — a `#767676` placeholder on `#fcfbff` is rendered effectively lighter than the raw value. The contrast you compute is already the optimistic case.

The fix is mechanical once detected. The detection is the hard part — Lighthouse, axe-core, WAVE, and Pa11y all surface contrast failures. Put one in CI and the class disappears.

## How to do it right (the checklist)

When you touch text-or-icon color in the design system:

- [ ] **Compute the contrast ratio** against every background the color will appear on. Use a calculator (`contrast.tools`, browser devtools' contrast widget, WebAIM's tool) — don't eyeball.
- [ ] **Compare to the right threshold** — body text is 4.5; large is 3.0; non-text UI is 3.0. Don't mix them up.
- [ ] **For placeholders specifically, recompute including the browser's default fade** if you can. Or test in the actual rendered DOM with a contrast tool.
- [ ] **Pick AA or AAA explicitly.** AA is the legal-baseline; AAA is best-practice for content-heavy and assistive-tech-heavy sites. Don't aim for "as high as possible" without naming the target.
- [ ] **Bake it into the build.** Lighthouse CI, axe-core in Playwright, or `eslint-plugin-jsx-a11y` for some checks. A failing contrast number should be a CI failure, not a discovery during a Lighthouse trace months later.
- [ ] **Audit the design tokens, not just the components.** A failing token will spawn N failing components — fix the source.

## Canonical adjacencies

- **WCAG 2.x** — the actual specification. Currently 2.2 (2023); legal references usually anchor on 2.1 (2018) or 2.0 (2008). The 4.5/3.0 numbers haven't changed across versions.
- **WCAG 3 (draft)** — a complete rewrite of the contrast model using APCA ("Accessible Perceptual Contrast Algorithm"), which is closer to human perception but uses a different scoring scheme. Watch this space; the simple ratio test will eventually be obsolete.
- **APCA / Lc** — the new perceptual model. APCA replaces a ratio with a "Lightness contrast" score (Lc); the thresholds are different. If a contrast tool gives you both numbers, AA is still the legally relevant one.
- **Color-blindness simulation** — orthogonal concern. A high-contrast pair can still be hostile to deuteranopes if it depends on hue rather than luminance. Sim tools (Colorblindly, Sim Daltonism) catch this.
- **`prefers-contrast: more` media query** — opt-in user override; honors a system-level "high contrast" preference. The accessible default doesn't replace honoring the user preference when it's set.
- **Forced-colors mode** — Windows / Edge / Chrome can force a system color scheme. CSS should not assume your computed colors will be used; test in forced-colors mode.

## Adjacent traps

- **Computing against `transparent`.** A semi-transparent text color over an image or gradient has no stable contrast. Either use solid colors or recompute against the worst-case underlying pixel.
- **Computing against the wrong "white."** `#ffffff` is not the same as `#fcfbff`; the latter is a tinted off-white some design systems use. Recompute against the *actual* background, not the abstract "white."
- **Hover/focus states reducing contrast.** A button that passes at rest can fail on hover; the hover state is also user-facing and needs to clear the same bar.
- **Disabled states.** WCAG explicitly excludes "disabled" controls from the contrast requirement — but **labels and inputs are not disabled**, even if some related control is. Don't grey out something that isn't actually disabled.
- **Subpixel anti-aliasing changes.** A color that passes computed-contrast can still render as visually thinner / fainter on certain DPI / OS combinations. The math is the floor; perception in context is the ceiling.
- **Trusting a tool's color picker.** Some browser color pickers report hex with a missing leading zero — `#bff` is `#bbffff`, not `#0bff…`. Round-trip the value through a strict parser if it came from a UI.

## Self-check questions

- What contrast ratio does `#767676` on `#ffffff` produce? Pass or fail AA for normal text? For large text? (Pulling out the formula by hand is good practice.)
- Why does the green channel dominate the luminance formula? What does that mean for designing a "dark green on light yellow" palette?
- The CEO insists the brand color is `#888888` and it must work on white. What are your options that don't involve changing the brand color?
- A placeholder `#999` passes 3:1 (AA for large text) but fails 4.5:1 (AA for body text). Which threshold applies to a `<input>`'s placeholder? Why?
- WCAG 3 is in draft; some teams are already shipping APCA-based tokens. What's the legal-risk argument for sticking with WCAG 2.x AA in 2026?
- Forced-colors mode overrides your carefully-chosen contrast pair. What's the right way to ensure your UI still works?
