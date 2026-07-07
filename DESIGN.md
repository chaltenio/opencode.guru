# DESIGN.md

Visual & interaction design system for **opencode.guru**. Single source of
truth for the designer (Figma) and the engineer (code).

> **Stack:** Next.js 14 + Tailwind CSS + Inter (via `next/font`).
> All tokens are defined in `tailwind.config.js` + `src/app/globals.css`.
> A designer should treat those two files as the implementation of this
> document.

---

## 1. Brand

| | |
|---|---|
| **Product** | opencode.guru |
| **One-liner** | A curated Netflix-style library of opencode tutorials |
| **Voice** | Quiet authority. Confident, not loud. Dev-tool native. |
| **Inspiration** | Netflix UI · Vercel design · Linear's restraint |

We are NOT a playful / SaaS-marketing site. The aesthetic is *deep, dense,
crisp*: a tool for people who already know what they're looking for.

---

## 2. Color tokens

Defined in `tailwind.config.js` under `theme.extend.colors`.

### Neutrals (the only background family)

| Token        | Hex       | Where                                              |
|--------------|-----------|----------------------------------------------------|
| `bg`         | `#0a0a0a` | Page background (slightly warmer than pure black) |
| `bg-elev`    | `#141414` | Cards, sidebars, dropdowns                         |
| `bg-card`    | `#1a1a1a` | Hover/raised card (rarely used; prefer `bg-elev`)  |
| `zinc-900`   | `#18181b` | Dividers, input borders                            |
| `zinc-800`   | `#27272a` | Borders, secondary buttons                         |
| `zinc-700`   | `#3f3f46` | Hover borders, icon bg                             |
| `zinc-500`   | `#71717a` | `text-zinc-500` — captions, timeAgo, helper text   |
| `zinc-400`   | `#a1a1aa` | `text-zinc-400` — metadata on hero, sublabels      |
| `zinc-300`   | `#d4d4d8` | `text-zinc-300` — body copy default                |
| `zinc-200`   | `#e4e4e7` | `text-zinc-200` — emphasized inline text           |
| `zinc-100`   | `#f4f4f5` | (rare)                                             |
| `white`      | `#ffffff` | Headings, primary buttons                          |

### Brand red (single accent)

| Token         | Hex        | Use                                    |
|---------------|------------|----------------------------------------|
| `brand`       | `#ff2d3a`  | Primary actions, sponsored tag, focus   |
| `brand-hover` | `#ff4d59`  | Hover state                            |
| `brand/15`    | rgba 0.15  | Tinted backgrounds (badges, banners)   |

> Tailwind `text-red-*` is overridden in `globals.css` to be readable on
> dark — use semantic Tailwind classes (`text-red-300` etc) and trust the
> overrides. Don't hardcode hex red values in components.

### Semantic

| Meaning            | Class                | Notes                             |
|--------------------|----------------------|-----------------------------------|
| Error / destructive| `text-red-300` `bg-red-900/40` `border-red-900/60` | Danger zone, form errors |
| Warning            | `text-amber-300`     | "Already unpublished" badges      |
| Success            | `text-emerald-300/400` | "Saved" flashes                  |
| Info               | `text-sky-300`       | "To watch" labels                 |

---

## 3. Typography

**Font family:** Inter (weights 400, 500, 600, 700, 800) loaded via
`next/font/google`. Self-hosted, `font-display: swap`, no CLS.

### Scale (use Tailwind classes)

| Use case            | Class                       | Example                          |
|---------------------|------------------------------|----------------------------------|
| Page hero title     | `text-3xl md:text-5xl font-extrabold` | "opencode in 5 minutes…"  |
| Section title       | `text-2xl font-bold`         | "Continue watching"              |
| Card title          | `text-sm font-semibold`      | Video card title                 |
| Body                | `text-sm` (default `text-zinc-300`) | Description text        |
| Caption / metadata  | `text-xs text-zinc-500`      | "3 hours ago"                    |
| Micro label         | `text-[10px] uppercase tracking-wider` | "SPONSORED" badge   |
| Code / mono         | `font-mono`                  | Slug fields, embed URLs          |

### Rendering

Global CSS applies:

- `-webkit-font-smoothing: antialiased`
- `-moz-osx-font-smoothing: grayscale`
- `text-rendering: optimizeLegibility`
- Heading letter-spacing: `-0.02em`
- Body letter-spacing: `-0.005em`
- Body line-height: `1.65`

> If text looks blurry on a particular monitor / browser combo, the
> culprit is almost always missing font-feature-settings. The base CSS
> already enables `ss01` + `cv11`. Don't override unless you know why.

---

## 4. Spacing & layout

Container: `mx-auto max-w-7xl px-6` (most pages), `max-w-3xl` (long-form:
about / verify-email / settings).

Section gaps: prefer `mb-8` / `mb-10` / `mb-12` over `gap-*` on stacked
sections.

Radii: `rounded-md` for buttons/inputs, `rounded-lg` for cards, `rounded-full`
for tags/pills, `rounded-xl` for the auth/settings panels.

Shadows: minimal. `shadow-brand-glow` only for focus rings; otherwise rely
on `border-zinc-800` to delineate surfaces.

---

## 5. Components in `src/components/`

These are the components a designer should keep in sync with Figma:

| File                                      | Purpose                              |
|-------------------------------------------|--------------------------------------|
| `top-nav.tsx`                             | Fixed header, brand, links, user     |
| `admin-dropdown.tsx`                      | Privileged-action menu               |
| `video-card.tsx`                          | The Netflix-style grid card         |
| `video-row.tsx`                           | Horizontal scroll row wrapper        |
| `video-player.tsx`                        | Iframe wrapper for embed players     |
| `video-actions.tsx`                       | Like / Save / Report buttons         |
| `video-label-selector.tsx`                | To watch / Watched / To re-watch    |
| `comment-section.tsx`                     | Flat comment thread                  |
| `error.tsx` / `global-error.tsx`           | Branded error UI                     |
| `admin/admin-flags-panel.tsx`             | Super-admin flag toggles            |
| `admin/admin-video-controls.tsx`          | Level + Unpublish                    |
| `admin/admin-delete-panel.tsx`            | Soft delete / Restore               |
| `admin/admin-tags-form.tsx`               | Tag creation                         |
| `admin/admin-tag-suggestion-row.tsx`      | Tag suggestion row                  |
| `admin/review-form.tsx`                   | Approve / reject form               |
| `admin/review-quick-actions.tsx`          | Inline order/featured/sponsored     |
| `admin/review-quick-actions.tsx`          | Inline order/featured/sponsored     |
| `admin/user-row.tsx`                      | User mgmt row (role + status)       |
| `settings/social-profile-form.tsx`        | Social handles editor               |
| `settings/email-change-form.tsx`          | Email change request                |

When the designer updates Figma, they should:
1. Update the corresponding tokens in `tailwind.config.js` / `globals.css`
2. Send a PR (or open an issue with screenshots + token diffs)

---

## 6. Iconography

`lucide-react` for the entire app. Stroke-width `2` everywhere except
small icons (`w-3 h-3`) which use `1.5` via utility.

No emoji as functional UI. Emoji are reserved for marketing copy
(footer "☕ Support my project") and brand flavour.

---

## 7. Motion

Defaults:
- Card hover: `transform 180ms ease + shadow`
- Button hover: `bg` change, no transform
- Dropdown: instant open, 150 ms fade

Use sparingly. No scroll-triggered animations. No parallax.

---

## 8. Accessibility (WCAG AA baseline)

- All text passes 4.5:1 contrast on its background (verified with the
  tuned `red-*` / `amber-*` overrides).
- All interactive elements are keyboard-reachable.
- Focus rings: 2 px brand red, 2 px offset, 4 px radius.
- Touch targets: minimum 32 px.
- Form fields always have visible labels (not just placeholders).
- Color is never the only signal: badges have text, errors have icons,
  disabled buttons have alt state via text.

---

## 9. Onboarding a designer

If you're bringing in a freelance / contract designer, here's the
recommended workflow.

### Option A — Designer works in this repo (recommended)

1. Add the designer as a GitHub collaborator (Settings → Collaborators)
2. They install: `npm install`
3. Run: `npm run dev` — site reloads on file save
4. They edit `tailwind.config.js` and `src/app/globals.css` directly
5. PR a Figma link in the PR description so the engineer can compare

### Option B — Designer works only in Figma

1. Designer exports a Figma file using the tokens above
2. For each PR, designer posts Figma links + the engineer applies
   values to `tailwind.config.js` / `globals.css`
3. Designer reviews the deployed Vercel preview URL for visual diffs

### Option C — Bring them in for a specific pass

For one-off visual reviews (e.g. you want a hero page redesign):
1. Open an issue describing the goal + a few screenshots
2. Tag the designer; they reply with a Figma file
3. Engineer implements, designer reviews the preview

### Files the designer MUST know

- `tailwind.config.js` — design tokens live here
- `src/app/globals.css` — base typography + global overrides
- `DESIGN.md` — this file
- `src/app/layout.tsx` — font loading

### What NOT to ask the designer to do

- Database schema (that's engineering)
- Server actions (engineering)
- OAuth / auth flows (engineering)
- Vercel deployment (engineering)

---

## 10. Future design system work (suggested)

When the project grows, consider:

- A `/storybook` route or Storybook setup for component-driven dev
- A small Figma library mapping every component 1:1 with this file
- A iconography pass: replace mixed-weight lucide icons with a custom
  stroke-tuned set
- Light-mode: currently dark-only. If needed, design a parallel
  `theme.extend.colors.light.*` palette.
- Animated hero: replace the static hero with a subtle motion design
  once content volume justifies it.
- OG image generator: programmatic 1200×630 cards for share previews.