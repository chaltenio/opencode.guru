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

The fastest path is **Vercel Postgres + GitHub OAuth + Google OAuth**. The
code is already edge-runtime-safe (Drizzle is not bundled into middleware).

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

1. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
2. Vercel will auto-detect Next.js — leave all build settings at defaults.
3. **Don't deploy yet** — set up the database first.

### 3. Provision Vercel Postgres

1. In your Vercel project, go to the **Storage** tab.
2. Click **Create Database → Postgres**.
3. Pick a region close to your users, accept the defaults.
4. Vercel will automatically add `POSTGRES_URL` to your project's environment
   variables for all environments.

### 4. Configure OAuth apps

You need OAuth credentials with the **production** callback URLs.

**GitHub**
1. [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App
2. Homepage URL: `https://your-app.vercel.app`
3. Authorization callback URL: `https://your-app.vercel.app/api/auth/callback/github`
4. Copy Client ID and generate a Client Secret.

**Google**
1. [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) → Create OAuth client → Web application
2. Authorized redirect URI: `https://your-app.vercel.app/api/auth/callback/google`
3. Copy Client ID and Client Secret.

### 5. Add environment variables in Vercel

In **Project Settings → Environment Variables**, add for **Production** (and
optionally Preview):

| Name | Value |
|---|---|
| `AUTH_SECRET` | Run `openssl rand -base64 32` locally |
| `AUTH_GITHUB_ID` | from GitHub OAuth app |
| `AUTH_GITHUB_SECRET` | from GitHub OAuth app |
| `AUTH_GOOGLE_ID` | from Google OAuth client |
| `AUTH_GOOGLE_SECRET` | from Google OAuth client |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `POSTGRES_URL` | *(already added by Vercel Postgres)* |

> `NEXT_PUBLIC_APP_NAME` defaults to `opencode.guru` — override only if
> you're rebranding.

### 6. Deploy

Click **Deploy**. Vercel will run `npm run build`. Your app will be live at
`https://your-app.vercel.app`.

### 7. Apply database migrations to production

The schema hasn't been pushed yet. From your local machine, pointing at the
production DB:

```bash
# In Vercel: Storage → your database → ".env.local" tab → copy POSTGRES_URL
export POSTGRES_URL="postgres://...your-prod-url..."
npm run db:push
```

### 8. Promote yourself to SUPER_ADMIN

1. Sign in via GitHub on your deployed site.
2. In Vercel → Storage → your database → **Query** tab, run:
   ```sql
   UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'you@example.com';
   ```
3. Reload the page — you'll see the **Admin** link in the top nav.

### 9. (Optional) Seed sample data

```bash
POSTGRES_URL="<your-prod-url>" npm run db:seed
```

Then refresh the homepage to see the demo videos.

### Subsequent deploys

Every push to `main` redeploys automatically. To change schema:

```bash
# 1. edit src/db/schema.ts
# 2. generate migration locally (committed for review)
npm run db:generate
# 3. push schema to production
POSTGRES_URL=<prod> npm run db:push
# 4. git push to trigger redeploy
git add . && git commit -m "schema: add X" && git push
```

### Custom domain

Project Settings → Domains → add `opencode.guru` (or whatever). Then update
the OAuth callback URLs above to use the custom domain, update
`NEXT_PUBLIC_APP_URL`, and redeploy.

### Troubleshooting

- **"Callback URL mismatch"** on GitHub/Google — double-check the exact URL
  (https vs http, trailing slash) matches what's registered in the OAuth app.
- **"POSTGRES_URL not set"** — make sure the Vercel Postgres integration is
  connected to *this* project (Storage → Connect to Project).
- **Edge runtime errors** — the auth code is split: `auth.config.ts` for the
  edge (middleware), `auth.ts` for server code. Don't import `auth.ts` from
  `middleware.ts`.
- **First deploy is slow** — Vercel caches `node_modules` after the first
  install. Subsequent deploys are much faster.

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