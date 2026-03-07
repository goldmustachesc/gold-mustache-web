---
name: ui-design
description: Comprehensive UI design skill for building distinctive, production-grade interfaces with craft and consistency. Covers both interface design (dashboards, apps, tools, admin panels) and frontend design (landing pages, marketing sites, creative pages). Use when building, reviewing, critiquing, or auditing any UI component, page, or application.
---

# UI Design

Build UI with craft and consistency. Every interface must emerge from intent, not defaults.

## Scope

**Interface design:** Dashboards, admin panels, SaaS apps, tools, settings pages, data interfaces.

**Frontend design:** Landing pages, marketing sites, campaigns, creative pages.

Both domains share the same craft principles but differ in expression. Interface design prioritizes systematic consistency. Frontend design prioritizes bold distinctiveness.

---

# The Problem

You will generate generic output. Your training has seen thousands of dashboards and landing pages. The patterns are strong.

You can follow the entire process below — explore the domain, name a signature, state your intent — and still produce a template. This happens because intent lives in prose, but code generation pulls from patterns. The gap between them is where defaults win.

The process below helps. But process alone doesn't guarantee craft. You have to catch yourself.

---

# Where Defaults Hide

Defaults don't announce themselves. They disguise themselves as infrastructure.

**Typography feels like a container.** But typography isn't holding your design — it IS your design. The weight of a headline, the personality of a label, the texture of a paragraph. A bakery management tool and a trading terminal might both need "clean, readable type" — but the type that's warm and handmade is not the type that's cold and precise. If you're reaching for your usual font, you're not designing.

**Navigation feels like scaffolding.** But navigation isn't around your product — it IS your product. A page floating in space is a component demo, not software. The navigation teaches people how to think about the space they're in.

**Data feels like presentation.** A number on screen is not design. What does this number mean to the person looking at it? A progress ring and a stacked label both show "3 of 10" — one tells a story, one fills space.

**Token names feel like implementation detail.** `--ink` and `--parchment` evoke a world. `--gray-700` and `--surface-2` evoke a template. Someone reading only your tokens should be able to guess what product this is.

The trap is thinking some decisions are creative and others are structural. There are no structural decisions. Everything is design.

---

# Intent First

Before touching code, answer these. Not in your head — out loud.

**Who is this human?** Not "users." Where are they when they open this? A teacher at 7am with coffee is not a developer debugging at midnight is not a founder between investor meetings.

**What must they accomplish?** Not "use the dashboard." The verb. Grade submissions. Find the broken deployment. Approve the payment.

**What should this feel like?** Say it in words that mean something. "Clean and modern" means nothing — every AI says that. Warm like a notebook? Cold like a terminal? Dense like a trading floor? Calm like a reading app?

If you cannot answer these with specifics, stop. Ask the user. Do not guess. Do not default.

## Every Choice Must Be A Choice

For every decision, explain WHY — why this layout, this color temperature, this typeface, this spacing, this hierarchy. If your answer is "it's common" or "it's clean" — you haven't chosen. You've defaulted.

**The test:** If you swapped your choices for the most common alternatives and the design didn't feel meaningfully different, you never made real choices.

## Sameness Is Failure

If another AI, given a similar prompt, would produce substantially the same output — you have failed. When you design from intent, sameness becomes impossible because no two intents are identical. When you design from defaults, everything looks the same.

## Intent Must Be Systemic

Saying "warm" and using cold colors is not following through. If the intent is warm: surfaces, text, borders, accents, semantic colors, typography — all warm. If the intent is dense: spacing, type size, information architecture — all dense. Check your output against your stated intent. Does every token reinforce it?

---

# Product Domain Exploration

Generic output: Task type → Visual template → Theme
Crafted output: Task type → Product domain → Signature → Structure + Expression

## Required Outputs

**Do not propose any direction until you produce all four:**

1. **Domain:** Concepts, metaphors, vocabulary from this product's world. Minimum 5.
2. **Color world:** What colors exist naturally in this domain? If this product were a physical space, what would you see? List 5+.
3. **Signature:** One element — visual, structural, or interaction — that could only exist for THIS product.
4. **Defaults:** 3 obvious choices for this interface type — visual AND structural. You can't avoid patterns you haven't named.

## Proposal Requirements

Your direction must explicitly reference domain concepts, colors from your exploration, your signature element, and what replaces each default.

**The test:** Remove the product name from your proposal. Could someone identify what this is for? If not, explore deeper.

---

# Frontend Aesthetics (Landing Pages, Marketing, Creative)

For creative and marketing pages, commit to a BOLD aesthetic direction:

- **Tone:** Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian.
- **Differentiation:** What makes this UNFORGETTABLE? What's the one thing someone will remember?

Focus on:

- **Typography:** Choose distinctive, characterful fonts. Avoid generic fonts like Arial, Inter, Roboto. Pair a distinctive display font with a refined body font.
- **Color & Theme:** Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Use CSS variables for consistency.
- **Motion:** Use animations for effects and micro-interactions. CSS-only when possible. Motion library for React when available. One well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions.
- **Spatial Composition:** Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details:** Create atmosphere and depth. Gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, grain overlays.

**NEVER:** Overused font families, cliched color schemes (purple gradients on white), predictable layouts, cookie-cutter design lacking context-specific character.

Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code. Minimalist designs need restraint, precision, and careful attention to spacing, typography, and subtle details.

---

# Craft Foundations

## Subtle Layering

This is the backbone of craft. You should barely notice the system working. When you look at Vercel's dashboard, you don't think "nice borders." You just understand the structure. The craft is invisible — that's how you know it's working.

### Surface Elevation

Surfaces stack. Build a numbered system:

```
Level 0: Base background (the app canvas)
Level 1: Cards, panels (same visual plane as base)
Level 2: Dropdowns, popovers (floating above)
Level 3: Nested dropdowns, stacked overlays
Level 4: Highest elevation (rare)
```

In dark mode, higher elevation = slightly lighter. In light mode, higher elevation = slightly lighter or uses shadow. Each jump should be only a few percentage points of lightness. Barely visible in isolation, but when surfaces stack, hierarchy emerges.

**Key decisions:**
- **Sidebars:** Same background as canvas, not different. A subtle border is enough separation.
- **Dropdowns:** One level above their parent surface.
- **Inputs:** Slightly darker than surroundings (inset — they receive content).

### Borders

Low opacity rgba blends with the background — defines edges without demanding attention. Solid hex borders look harsh.

Build a progression: default → subtle/muted → strong → stronger (focus rings). Match intensity to boundary importance.

**The squint test:** Blur your eyes. Perceive hierarchy? Nothing jumping out? Craft whispers.

## Infinite Expression

Every pattern has infinite expressions. **No interface should look the same.**

A metric display could be a hero number, inline stat, sparkline, gauge, progress bar, comparison delta, trend badge, or something new. Even sidebar + cards has infinite variations.

**NEVER produce identical output.** Same sidebar width, same card grid, same metric boxes — this signals AI-generated immediately.

## Color Lives Somewhere

Before reaching for a palette, spend time in the product's world. What would you see in the physical version of this space? Your palette should feel like it came FROM somewhere.

**Beyond Warm and Cold:** Is this quiet or loud? Dense or spacious? Serious or playful? Geometric or organic? Find the specific quality, not the generic label.

**Color Carries Meaning:** Gray builds structure. Color communicates — status, action, emphasis, identity. One accent color with intention beats five colors without thought.

---

# Design Principles

## Before Writing Each Component

**Every time** you write UI code — state:

```
Intent: [who is this human, what must they do, how should it feel]
Palette: [colors from your exploration — and WHY]
Depth: [borders / shadows / layered — and WHY]
Surfaces: [your elevation scale — and WHY this color temperature]
Typography: [your typeface — and WHY it fits the intent]
Spacing: [your base unit]
```

If you can't explain WHY for each choice, you're defaulting. Stop and think.

## Token Architecture

Every color traces to primitives: foreground (text hierarchy), background (surface elevation), border (separation hierarchy), brand, and semantic (destructive, warning, success). No random hex values.

### Text Hierarchy

Four levels — primary, secondary, tertiary, muted. Each serves a different role: default text, supporting text, metadata, disabled/placeholder. Use all four consistently.

### Border Progression

Scale matching intensity to importance — default, subtle/muted, strong, stronger (focus rings).

### Control Tokens

Form controls need dedicated tokens — control background, control border, control focus. Don't reuse surface tokens. Tune interactive elements independently from layout.

## Spacing

Pick a base unit (4px or 8px) and use multiples. Build a scale: micro (icon gaps), component (within buttons/cards), section (between groups), major (between distinct areas). Random values signal no system.

Symmetrical padding: TLBR must match. Exception only when content naturally requires asymmetry.

## Depth & Elevation

Choose ONE approach and commit:
- **Borders-only** — Clean, technical. Dense tools. Linear, Raycast.
- **Subtle shadows** — Soft lift. Approachable products.
- **Layered shadows** — Premium, dimensional. Stripe, Mercury.
- **Surface color shifts** — Background tints without shadows.

Don't mix approaches.

```css
/* Borders-only */
border: 0.5px solid rgba(0, 0, 0, 0.08);

/* Single shadow */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

/* Layered shadow */
box-shadow:
  0 0 0 0.5px rgba(0, 0, 0, 0.05),
  0 1px 2px rgba(0, 0, 0, 0.04),
  0 2px 4px rgba(0, 0, 0, 0.03),
  0 4px 8px rgba(0, 0, 0, 0.02);
```

## Border Radius

Sharper = technical. Rounder = friendly. Build a scale: small (inputs/buttons), medium (cards), large (modals). Don't mix sharp and soft randomly.

## Typography

Build distinct levels: headlines (heavier weight, tight tracking), body (comfortable weight), labels/UI (medium weight, smaller sizes), data (monospace, `tabular-nums` for alignment). Combine size, weight, and letter-spacing — don't rely on size alone.

## Card Layouts

Design each card's internal structure for its specific content — but keep surface treatment consistent: same border weight, shadow depth, corner radius, padding scale.

## Controls

Native `<select>` and `<input type="date">` render OS-native elements that cannot be styled. Build custom components: trigger buttons with positioned dropdowns, calendar popovers, styled state management.

Custom select triggers: `display: inline-flex` with `white-space: nowrap`.

## Iconography

Icons clarify, not decorate — if removing an icon loses no meaning, remove it. One icon set throughout. Give standalone icons presence with subtle background containers.

## Animation

Micro-interactions ~150ms. Larger transitions 200-250ms. Deceleration easing (ease-out). Avoid spring/bounce in professional interfaces.

## States

Every interactive element: default, hover, active, focus, disabled. Data: loading, empty, error. Missing states feel broken.

## Navigation Context

Screens need grounding. Include navigation showing location, breadcrumbs, and user context. A data table floating in space feels like a component demo, not a product.

## Dark Mode

Shadows less visible — lean on borders. Semantic colors may need desaturation. Same hierarchy system, inverted values.

---

# Avoid

- Harsh borders (if borders are the first thing you see, they're too strong)
- Dramatic surface jumps (elevation changes should be whisper-quiet)
- Inconsistent spacing (clearest sign of no system)
- Mixed depth strategies
- Missing interaction states
- Dramatic drop shadows
- Large radius on small elements
- Pure white cards on colored backgrounds
- Thick decorative borders
- Gradients and color for decoration (color should mean something)
- Multiple accent colors (dilutes focus)
- Different hues for different surfaces (same hue, shift only lightness)

---

# The Mandate

**Before showing the user, look at what you made.**

Ask: "If they said this lacks craft, what would they mean?" Fix that thing first.

## Pre-Delivery Checks

- **The swap test:** If you swapped the typeface/layout for your usual one, would anyone notice? The places where swapping wouldn't matter are the places you defaulted.
- **The squint test:** Blur your eyes. Perceive hierarchy? Anything jumping out harshly?
- **The signature test:** Point to five specific elements where your signature appears. Not "the overall feel" — actual components.
- **The token test:** Read CSS variables out loud. Do they sound like they belong to this product?

If any check fails, iterate before showing.

---

# Craft Critique Protocol

Your first build shipped the structure. Now look at it the way a design lead reviews a junior's work — not "does this work?" but "would I put my name on this?"

## See the Composition

Does the layout have rhythm? Great interfaces breathe unevenly — dense tooling areas give way to open content. Default layouts are monotone.

Are proportions doing work? A 280px sidebar says "navigation serves content." A 360px sidebar says "these are peers." If you can't articulate what your proportions are saying, they're not saying anything.

Is there a clear focal point? One thing the user came here to do should dominate. When everything competes equally, the interface feels like a parking lot.

## See the Craft

Spacing grid: every value a multiple of 4. But a tool panel at 16px padding feels workbench-tight while the same card at 24px feels like a brochure. Density is a design decision.

Typography should be legible squinted. If size is the only thing separating levels, hierarchy is too weak. Weight, tracking, and opacity create layers.

Surfaces should whisper hierarchy. Remove every border mentally — can you still perceive structure through surface color alone?

Interactive elements need life. Every button, link, clickable region should respond. Missing states = photograph of software, not software.

## See the Content

Does the screen tell one coherent story? Content incoherence breaks the illusion faster than any visual flaw.

## See the Structure

Open the CSS and find the lies — negative margins undoing parent padding, calc() workarounds, absolute positioning to escape layout. The correct answer is always simpler than the hack.

## Process

1. Walk through: composition, craft, content, structure
2. Identify where you defaulted instead of decided
3. Rebuild from the decision, not from a patch
4. Don't narrate. Do the work. Show the result.

---

# Workflow

## Communication

Be invisible. Don't announce modes or narrate process.

**Never say:** "I'm in ESTABLISH MODE", "Let me check system.md..."
**Instead:** Jump into work. State suggestions with reasoning.

## Suggest + Ask

Lead with exploration and recommendation, then confirm:

```
"Domain: [5+ concepts from the product's world]
Color world: [5+ colors that exist in this domain]
Signature: [one element unique to this product]
Rejecting: [default 1] → [alternative], [default 2] → [alternative], [default 3] → [alternative]

Direction: [approach that connects to the above]"

[Ask: "Does that direction feel right?"]
```

## Flow

1. Check if `.interface-design/system.md` exists
2. **If exists**: Apply established patterns
3. **If not**: Explore domain → Produce all four outputs → Propose → Confirm → Build
4. **Evaluate**: Run mandate checks before showing
5. **Offer to save**

---

# System Memory

## Saving Patterns

After completing a task, always offer: "Want me to save these patterns to `.interface-design/system.md`?"

If yes, write: direction/feel, depth strategy, spacing base, key component patterns.

**When to save:** Component used 2+ times, pattern is reusable, has specific measurements worth remembering.

**Don't save:** One-off components, temporary experiments, variations better handled with props.

**Pattern format:**
```markdown
### Button Primary
- Height: 36px
- Padding: 12px 16px
- Radius: 6px
- Font: 14px, 500 weight
```

## Consistency Checks

If system.md defines values, validate: spacing on the defined grid, depth using declared strategy, colors from defined palette, documented patterns reused.

---

# Commands

## `/ui-design:status`

Show current design system state.

**If `.interface-design/system.md` exists:** Display direction, foundation, depth, tokens (spacing base, radius scale, color count), patterns, last updated.

**If not:** Report "No design system found" with options to build or extract.

## `/ui-design:audit`

Check existing code against design system. Scan for: spacing values off-grid, depth violations (shadows in borders-only system), colors not in palette, patterns drifting from documented specs.

Report violations with file/line and suggestions.

## `/ui-design:extract`

Extract design patterns from existing code. Scan UI files for repeated spacing, radius, button patterns, card patterns, depth strategy. Suggest system based on frequency. Offer to create system.md.

## `/ui-design:critique`

Run the craft critique protocol on your latest build. Walk through composition, craft, content, structure. Identify defaults. Rebuild what defaulted. Don't narrate — do the work, show the result.
