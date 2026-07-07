# Contributing

Thanks for working on **opencode.guru**. This document is the canonical
guide for how we ship code — read it before opening your first PR.

---

## Branch workflow

```
main         ←  production (Vercel deploys from every push here)
 └─ feat/*    ←  your feature branch (PR target)
 └─ fix/*     ←  bug fix
 └─ chore/*   ←  tooling, deps, docs, no behavior change
```

**`main` is protected.** Direct pushes are blocked by GitHub branch
protection. All changes land via Pull Request, even for the owner.

### Branch naming

Use a short kebab-cased name with a prefix:

- `feat/email-change-flow`
- `fix/admin-leaderboard-permission`
- `chore/bump-next-14`
- `docs/design-system`

### Workflow

```bash
# 1. Sync with main
git checkout main
git pull origin main

# 2. Create a branch
git checkout -b feat/your-thing

# 3. Make changes, commit
git add .
git commit -m "feat: what changed and why"

# 4. Push the branch
git push origin feat/your-thing

# 5. Open a draft PR
gh pr create --draft \
  --base main \
  --title "feat: short summary" \
  --body "## What
- bullet

## Why
- motivation

## How to test
- steps

## Risk
- low / medium / high — why"

# 6. CI runs, reviewers comment, you iterate

# 7. Mark ready for review when CI passes
gh pr ready

# 8. Merge once approved
gh pr merge --squash --delete-branch
```

### Why draft PRs?

- **CI runs early.** You find out about build / lint / type errors
  before review.
- **Visibility.** Reviewers see what's in flight and can comment early.
- **History.** Draft → ready → merge is a clear timeline.

---

## Commit messages

We use **Conventional Commits** style. The format:

```
<type>(<scope>): <short description>

<body explaining why, not what>

<footer with refs / breaking notes>
```

Types:
- `feat` — new user-facing feature
- `fix` — bug fix
- `chore` — tooling, deps, no behavior change
- `docs` — docs only
- `refactor` — code change with no behavior change
- `test` — test additions / fixes
- `perf` — performance
- `style` — formatting (don't bother, just use prettier)

Examples:
- `feat(admin): inline sponsored/featured toggles + reviewer display`
- `fix(db): lazy connection proxy so build doesn't need POSTGRES_URL`
- `chore(deps): sync package-lock.json with package.json`

Keep the subject line **≤ 72 chars** and in the **imperative mood**
("add" not "added").

---

## Code style

- **TypeScript strict mode** is on. Don't add `any`.
- **Tailwind** for styling. No inline styles except for dynamic values
  (e.g. progress bar width).
- **lucide-react** for icons. Stroke-width 2 unless tiny.
- **Server actions** for mutations. Co-locate them in `src/app/actions/`.
- **Zod schemas** for any input that crosses a trust boundary.
- **No console.log** left in production code. Use `console.warn` /
  `console.error` and gate behind `process.env.NODE_ENV` if needed.

Run before committing:

```bash
npm run lint
npm run typecheck
npm run build
```

---

## Schema / database changes

1. Edit `src/db/schema.ts`
2. `npm run db:generate` — produces SQL in `drizzle/000N_*.sql`
3. **Inspect** the generated SQL. Drizzle can't always infer the safest
   conversion — e.g. `varchar → enum` needs a `USING` clause.
4. **Commit** the migration SQL + meta files (don't gitignore `drizzle/meta`)
5. On the **PR**: explicitly say "migration applied manually to staging"
   or "deferred to deploy step" — never assume the reviewer did it.

The Vercel build runs `db:migrate:prod` automatically as part of
`build:vercel` (see `vercel.json`).

---

## Pull request checklist

A reviewer-friendly PR includes:

- [ ] Clear title (Conventional Commit style)
- [ ] Body explains **why**, not just **what**
- [ ] Screenshots / recordings for any UI change
- [ ] Migration SQL committed if schema changed
- [ ] `npm run lint && npm run typecheck && npm run build` all green
- [ ] Manual test steps in the PR body
- [ ] No `console.log` left behind
- [ ] Audit log entries for any privileged action added

---

## Local environment

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
# Fill in: AUTH_SECRET, OAuth credentials, POSTGRES_URL

# Start a Postgres (docker is fine)
docker run -d --name opencode-guru-db \
  -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16

# Run migrations + seed
npm run db:push
npm run db:seed

# Start dev server
npm run dev
```

---

## Releasing

For this single-maintainer project, the release flow is intentionally
simple:

1. PR is merged to `main` via squash
2. Vercel auto-deploys
3. Migrations + seed run automatically as part of the build
4. You verify the Vercel preview URL matches local

When you grow to multiple maintainers, add:

- A `release/*` branch cut weekly / monthly
- Tag-based deploys (`v0.4.2`) for stable rollouts
- A proper CHANGELOG.md

---

## Reporting issues / asking questions

- **Bug reports:** GitHub Issues with reproduction steps + expected vs
  actual behaviour + screenshots.
- **Security issues:** email `security@yourdomain.com` (do NOT file a
  public issue).
- **Questions:** GitHub Discussions.

---

## License

By contributing you agree your work is licensed under the project's
MIT license.