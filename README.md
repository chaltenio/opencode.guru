# opencode.guru

A Netflix-style, community-curated video tutorial library for the
[opencode](https://opencode.ai) IDE/CLI.

## Features

- 🎬 Browse approved tutorials from YouTube, Vimeo, Twitch, and any other
  no-login-required video platform
- 🔎 Filter by level (Beginner / Intermediate / Advanced), platform, and tags
- 👤 GitHub & Google OAuth (no passwords)
- ⭐ Thumbs up/down on videos, with toggle & switch semantics
- 💬 Flat comment threads per video
- 🔖 Watchlist ("My List") with continue-watching progress tracking
- 🏆 Community leaderboard (most active contributors)
- 🛡 Moderation queue, role-based admin (Super Admin / Moderator / User)
- 📜 Audit log for every privileged action
- 🚩 User reporting + tag suggestions
- 🗺 Auto-generated sitemap + RSS feed

## Stack

- **Next.js 14** (App Router, Server Components, Server Actions)
- **PostgreSQL** (Vercel Postgres / Neon / Supabase) via **Drizzle ORM**
- **Auth.js (NextAuth v5)** with GitHub & Google providers, JWT sessions
- **Tailwind CSS** + **lucide-react**
- **Zod** validation shared client/server

## Local development

### 1. Prerequisites

- Node.js 20+
- A PostgreSQL database (local or hosted). Quick local option:

  ```bash
  docker run --name opencode-guru-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
  ```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
|---|---|
| `POSTGRES_URL` | Your Postgres connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | [github.com/settings/developers](https://github.com/settings/developers) — callback: `http://localhost:3000/api/auth/callback/github` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | [console.cloud.google.com](https://console.cloud.google.com) — callback: `http://localhost:3000/api/auth/callback/google` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` in dev |

### 4. Run migrations

```bash
npm run db:generate   # generate SQL from schema (only after schema changes)
npm run db:push       # push schema to DB (development)
# or for production:
npm run db:migrate    # apply migrations from ./drizzle
```

### 5. (Optional) seed sample data

```bash
npm run db:seed
```

### 6. Start the dev server

```bash
npm run dev
```

Visit `http://localhost:3000`.

### Promoting the first SUPER_ADMIN

After signing in for the first time, promote yourself in the DB:

```sql
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'you@example.com';
```

Reload the page and you'll see the admin link in the top nav.

## Deploying to Vercel

The code is edge-runtime-safe (Drizzle is not bundled into middleware) and
includes **automatic database setup** — every deploy runs migrations and
seeds the DB if empty.

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin git@github.com:YOUR_USER/opencode.guru.git
git push -u origin main
```

### 2. Import into Vercel

1. [vercel.com/new](https://vercel.com/new) → import the repo.
2. Vercel auto-detects Next.js. `vercel.json` overrides the build command to
   `npm run build:vercel`, which runs migrations + seed + build in order.
3. **Don't deploy yet** — set up the database first.

### 3. Provision Supabase (or Vercel Postgres)

Either works — `vercel.json` handles both. **Supabase** is recommended because
it gives you a dashboard for ad-hoc queries.

**Option A — Supabase**
1. Create a project at [supabase.com](https://supabase.com).
2. In Vercel → **Storage** → **Browse Marketplace** → install **Supabase**.
3. Connect it to this project. Vercel auto-adds these env vars:
   - `POSTGRES_URL` (pooled — runtime queries)
   - `POSTGRES_URL_NON_POOLING` (direct — **required for migrations**)
   - `POSTGRES_HOST`, `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.
4. Make sure the integration is attached to **Production**, **Preview**, *and*
   **Development**.

**Option B — Vercel Postgres**
1. Vercel → **Storage** → **Create Database → Postgres**.
2. Auto-attaches `POSTGRES_URL` (no separate non-pooling URL — migrations work
   via the same connection).

### 4. Configure OAuth apps

Use the **production** callback URLs.

**GitHub** — [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App
- Homepage URL: `https://your-app.vercel.app`
- Callback URL: `https://your-app.vercel.app/api/auth/callback/github`

**Google** — [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) → Web client
- Authorized redirect URI: `https://your-app.vercel.app/api/auth/callback/google`

### 5. Add remaining env vars in Vercel

Settings → Environment Variables:

| Name | Value |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | from GitHub OAuth app |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | from Google OAuth client |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `SEED_ENABLED` | `true` *(default; set to `false` to skip seed on deploy)* |
| `SEED_ADMIN_EMAIL` | optional — defaults to `admin@opencode.guru` |

Database vars (`POSTGRES_URL`, etc.) are already set by the Supabase / Vercel
Postgres integration.

### 6. Deploy

Click **Deploy**. The build does, in order:

```
npm run db:migrate:prod   # creates/updates tables via POSTGRES_URL_NON_POOLING
npm run db:seed            # idempotent — skips if DB already has data
next build                 # compiles the Next.js app
```

Migrations are tracked in `drizzle/0000_*.sql` and applied via Drizzle's
migrator. Subsequent deploys only apply new migrations.

### 7. Promote yourself to SUPER_ADMIN

1. Sign in via GitHub on your deployed site.
2. In Supabase → **SQL Editor** (or Vercel → Storage → Query), run:
   ```sql
   UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'you@example.com';
   ```
3. Reload — the **Admin** link appears in the nav.

If you let the seed run, `admin@opencode.guru` is already a SUPER_ADMIN. To
use that account, register on the site with that email (you'll need to
change your GitHub primary email, or just create a new OAuth user and promote
them).

### Subsequent deploys

Every `git push` → auto-deploy → migrations + seed + build.

To evolve the schema:

```bash
# 1. edit src/db/schema.ts
# 2. generate a new migration (commit the SQL file)
npm run db:generate
# 3. git push — Vercel applies the new migration automatically
git add . && git commit -m "schema: add foo" && git push
```

To disable seeding on a particular deploy, set `SEED_ENABLED=false` in the
Vercel env vars (or in a single redeploy via the deploy dialog).

### Custom domain

Project Settings → Domains → add `opencode.guru`. Then update:
- OAuth callback URLs to use the custom domain
- `NEXT_PUBLIC_APP_URL` env var
- Redeploy

### Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails: `POSTGRES_URL is not set` | Make sure the Supabase / Vercel Postgres integration is connected to *this* project (Storage → Connect Project) and that env vars apply to **Production** |
| Build fails: `drizzle-kit … ECONNREFUSED` | Use `POSTGRES_URL_NON_POOLING` for migrations (already configured in `scripts/migrate.ts`) |
| Tables missing on first deploy | Migrations run on every build — check the build log for `[migrate]` lines. If a migration is missing, commit the SQL file under `drizzle/` |
| Seed didn't run | The seed is idempotent and skips when the DB has any video. To re-seed, `DELETE FROM videos CASCADE;` in the SQL editor, then redeploy |
| OAuth callback mismatch | Exact URL must match (https vs http, trailing slash). Update both GitHub and Google consoles |

## Project structure

```
src/
  app/
    page.tsx               # homepage with hero + rows
    layout.tsx             # root layout + nav
    browse/                # filterable grid
    v/[slug]/              # video page (player + comments)
    tags/                  # tag index + per-tag page
    submit/                # video submission flow
    watchlist/             # saved + continue watching
    leaderboard/           # most active users
    admin/                 # role-gated admin UI
      queue/               # moderation review queue
      videos/              # all videos + reorder
      tags/                # tag mgmt + suggestions
      users/               # role/status management
      reports/             # abuse reports
      audit/               # audit log
    actions/               # server actions (mutations)
    api/auth/              # Auth.js handlers
  components/              # UI components
  db/
    schema.ts              # Drizzle schema (single source of truth)
    queries.ts             # typed query helpers
    index.ts               # connection
  lib/
    validation.ts          # Zod schemas
    video.ts               # URL parsing, embed/thumbnail helpers
    utils.ts               # cn(), formatDuration(), timeAgo()
  auth.ts                  # Auth.js v5 config
  middleware.ts            # role-gated routes
```

## Data model overview

See [`src/db/schema.ts`](src/db/schema.ts) for the full schema.

| Table | Purpose |
|---|---|
| `users` | All accounts, with role/status enums |
| `oauth_accounts` | GitHub/Google account linkage |
| `videos` | The core catalog (title, slug, URL, level, order, status, denormalized counters) |
| `video_series` | Multi-part tutorial grouping |
| `tags` + `video_tags` + `tag_suggestions` | Tagging system |
| `comments` + `comment_likes` | Flat comment threads |
| `video_likes` | Binary like/dislike (one per user) |
| `watchlist` | Saved videos |
| `watch_history` | Continue-watching progress |
| `subscriptions` | Follow users or tags |
| `notifications` | In-app notifications |
| `reports` | Abuse reports (video/comment/user) |
| `audit_log` | Every privileged action is logged |
| `sponsorships` | Sponsored-video metadata |

## Roles & permissions

- **USER** — sign in, submit videos, comment, like, save, watch history
- **MODERATOR** — review queue, manage tags, hide comments, resolve reports
- **SUPER_ADMIN** — everything above + change video order/sponsored/featured, set roles, ban users

## Contributing

PRs welcome. Open an issue first for non-trivial changes.

## License

MIT