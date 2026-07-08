# SYSTEM.md — opencode.guru system reference

> A full reference to the opencode.guru product, written for a clone-bootstrap
> team. Read this top-to-bottom on day one; treat it as the source of truth for
> **what** the system does and **why**. For setup, deploy, git workflow, and
> brand tokens, see `README.md`, `CONTRIBUTING.md`, and `DESIGN.md` respectively.

---

## 0. System overview

**opencode.guru** is a curated Netflix-style library of video tutorials about
[**opencode**](https://opencode.ai) — an open-source AI coding CLI/IDE.
Anyone can browse; signed-in users can submit videos, comment, like, label,
and track their watch history. A small team of moderators and super admins
keeps quality up by reviewing submissions, hiding bad content, and curating
the homepage.

The product is **dark-mode-first**, dense, dev-tool native, and deliberately
quiet. The aesthetic comes from Netflix and Vercel design: confident,
uncluttered, content-first. Light mode is not built yet (see §13.5).

### Tech stack (one-glance)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server components + server actions |
| Language | TypeScript (strict) | No `any` in app code |
| Database | PostgreSQL (Supabase in prod) | Pooled `POSTGRES_URL` for runtime, non-pooling for migrations |
| ORM | Drizzle | Schema-as-code, plain SQL migrations |
| Auth | Auth.js v5 (NextAuth) | JWT sessions, OAuth only (no passwords) |
| OAuth providers | GitHub + Google | Both force account picker (`prompt=select_account`) |
| Email | SMTP via nodemailer | Works with SES SMTP, Resend, Postmark, Mailgun |
| Styling | Tailwind CSS | Token-driven (see `DESIGN.md`) |
| Icons | lucide-react | Stroke 2 except tiny icons |
| Validation | Zod | Shared client/server |
| Fonts | Inter via `next/font` | Self-hosted, no CLS |
| Hosting | Vercel | Auto-deploy on push to `main` |
| DB ops | Vercel Postgres / Supabase | Migrations run during build |

### Production URL and hosting model

The production deployment is served from **`https://www.opencode.guru`**.
Every environment variable, default fallback, OAuth callback URL, RSS link,
sitemap entry, and email verification link references this domain. Local
development overrides via `NEXT_PUBLIC_APP_URL`.

The Vercel build runs `db:migrate:prod` followed by `db:seed` and then
`next build`. Migrations are idempotent; seed only inserts data when the
videos table is empty.

---

## 1. Stakeholders

### 1.1 Roles

The system recognises four principal roles. Three are persisted on the
user record; the fourth is the implicit state of any unauthenticated
visitor.

| Role | Stored as | Who it is | What they can do |
|---|---|---|---|
| **Anonymous** | _(no record)_ | Anyone visiting the site without signing in | Browse public videos, search, filter, view profiles, read the static pages |
| **USER** | `users.role = 'USER'` | Anyone who has signed in via OAuth | All of the above plus submit videos, comment, like, save to library, label videos, set social handles, request an email change |
| **MODERATOR** | `users.role = 'MODERATOR'` | A trusted community member or staff member | All USER abilities plus review submissions (approve/reject), change video level, unpublish videos, manage tags and tag suggestions, resolve reports |
| **SUPER_ADMIN** | `users.role = 'SUPER_ADMIN'` | The product owner(s) | All MODERATOR abilities plus manage users (role + status), see the full audit log, see the leaderboard, perform soft delete + restore, change display order, mark featured and sponsored videos |

Status (`ACTIVE`, `SUSPENDED`, `BANNED`) is orthogonal to role: a banned
super admin still has a row but cannot act. Suspension hides them from
public surfaces; banning hides them entirely.

### 1.2 Community segments (planned)

These are **not** roles — they are derived, read-only labels used for
personalisation, badge display, and the leaderboard. Implementation is
roadmap §13.2.

| Segment | Definition (heuristic) | Display |
|---|---|---|
| **Newcomer** | Signed in < 7 days ago and < 3 videos watched | "New here" badge |
| **Browser** | ≥ 3 videos watched, no submissions yet | _(silent)_ |
| **Regular** | ≥ 3 watches in the last 30 days | "Active this month" badge |
| **Power user** | ≥ 10 approved submissions OR ≥ 50 likes received on own videos | "Trusted contributor" badge |
| **Sponsor** | Has at least one video with `videos.is_sponsored = true` | Brand-tinted badge |
| **Top contributor** | In the top 10 of the leaderboard | "Top 10" badge on profile |

Segments are computed from existing tables at read time — no new column,
no migration needed.

### 1.3 Permission matrix (who can do what)

The "what" here is high-level; the full breakdown is in §5.

| Surface | Anonymous | USER | MODERATOR | SUPER_ADMIN |
|---|---|---|---|---|
| Browse public videos | ✅ | ✅ | ✅ | ✅ |
| View video page + comments | ✅ | ✅ | ✅ | ✅ |
| Like / dislike | ❌ | ✅ | ✅ | ✅ |
| Comment | ❌ | ✅ | ✅ | ✅ |
| Save / label / track | ❌ | ✅ | ✅ | ✅ |
| Submit a video | ❌ | ✅ | ✅ | ✅ |
| Review queue (approve/reject) | ❌ | ❌ | ✅ | ✅ |
| Change video level / unpublish | ❌ | ❌ | ✅ | ✅ |
| Manage tags + suggestions | ❌ | ❌ | ✅ | ✅ |
| Resolve reports | ❌ | ❌ | ✅ | ✅ |
| Change video order / featured / sponsored | ❌ | ❌ | ❌ | ✅ |
| Soft delete + restore | ❌ | ❌ | ❌ | ✅ |
| Manage user roles / ban | ❌ | ❌ | ❌ | ✅ |
| View audit log | ❌ | ❌ | ❌ | ✅ |
| View leaderboard | ❌ | ❌ | ❌ | ✅ |

---

## 2. Architecture

### 2.1 Request flow (the happy path)

A request from a signed-in user reading a video page typically flows
through five layers, top to bottom:

1. **Middleware** (edge runtime). Verifies the JWT session cookie. For
   protected routes it returns `false` from the `authorized` callback if
   the session is missing or the role is wrong. This redirects to
   `/login?callbackUrl=…`.
2. **Route** (server component). Calls the database via Drizzle to load
   the video, its tags, the submitter, the comments, and any user-specific
   data (label, like state, watch history). Renders the page.
3. **Page** (server component). Receives the loaded data and composes it
   with `<VideoPlayer>`, `<VideoActions>`, `<VideoLabelSelector>`,
   `<CommentSection>`, `<AdminFlagsPanel>` (super admin only), etc.
4. **Client component** (small, interactive). Like buttons, label
   selectors, the admin flags panel, the comment composer — each one
   holds only the state it needs and posts via a **server action**.
5. **Server action**. Validates input with Zod, enforces auth + role,
   mutates the database, writes an audit-log entry, and calls
   `revalidatePath` so any page that should reflect the change is
   regenerated on the next request.

This top-down shape means the system never trusts the client: every
mutation is re-validated server-side, every secret lives only on the
server, and every privileged action is logged.

### 2.2 Edge vs Node runtime split

The site deliberately keeps its **edge runtime bundle small** by
splitting auth configuration into two files:

- **The edge-safe config** declares providers and a thin `authorized`
  callback. It runs in Vercel's edge runtime for every protected
  request, before the Node runtime even starts.
- **The full config** adds database-touching callbacks (signIn provisions
  a user row, jwt hydrates the role, session maps back to the session
  shape) and runs only in the Node runtime (server actions, route
  handlers, server components that need the DB).

This split is why some auth checks run cheaply on the edge and others
are deferred to the server.

### 2.3 Database connection strategy

The database layer uses a lazy proxy. The connection is not opened until
the first actual query, which means the Next.js build step never needs
the database to be reachable — it can compile even when `POSTGRES_URL`
is unset. At runtime, queries go through a small connection pool;
migrations use a separate non-pooling URL because PgBouncer transaction
mode breaks DDL.

---

## 3. Data model

The database has seventeen tables. Each section below lists the table's
purpose, its columns with types and defaults, its foreign keys, and the
indexes that back its hot queries.

### 3.1 `users`

The central account table. One row per signed-in person.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK, default random) | |
| `email` | text, unique, not null | The account's primary email; verified on first OAuth sign-in |
| `email_verified_at` | timestamp | Set by Auth.js on first sign-in |
| `username` | varchar(32), unique, not null | URL-safe handle; lowercase + dashes; chosen by Auth.js from email prefix on first sign-in |
| `display_name` | varchar(80) | Optional, user-editable |
| `avatar_url` | text | OAuth avatar, user-editable later |
| `bio` | text | User-editable |
| `role` | enum (USER, MODERATOR, SUPER_ADMIN), default USER | Promoted via admin actions |
| `status` | enum (ACTIVE, SUSPENDED, BANNED), default ACTIVE | Bans are soft via this enum |
| `created_at` / `updated_at` | timestamp | |
| `deleted_at` | timestamp | Soft-delete (currently unused; reserved for future GDPR work) |
| `github_username` | varchar(64) | Social handle, opt-in |
| `youtube_handle` | varchar(64) | Social handle |
| `twitch_username` | varchar(64) | Social handle |
| `vimeo_username` | varchar(64) | Social handle |
| `linkedin_slug` | varchar(128) | Public slug from `linkedin.com/in/<slug>` |
| `x_handle` | varchar(64) | X / Twitter handle |
| `pending_email` | text, unique | Set when an email change is requested; cleared on commit or cancel |
| `email_change_token` | text | Random token (32 bytes, base64url), sent in confirmation email |
| `email_change_expires_at` | timestamp | 24 hours after request |

Indexes: `email`, `username`, `pending_email`, `role`, `email_change_token`.

### 3.2 `oauth_accounts`

The link between a user and one of their OAuth providers. A user can
theoretically have multiple rows (one per provider), but the system
currently provisions one per user.

| Column | Type | Notes |
|---|---|---|
| `provider` | enum (GITHUB, GOOGLE) | Part of composite PK |
| `provider_user_id` | text | The OAuth provider's stable id for this user |
| `user_id` | uuid, FK → users.id (cascade) | Part of composite PK |
| `created_at` | timestamp | |

Composite PK on `(provider, provider_user_id)`. Indexed on `user_id`.

### 3.3 `videos`

The catalog. Every video in the system is one row.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `title` | varchar(200) | |
| `slug` | varchar(220), unique | URL-safe; auto-generated from title |
| `short_description` | varchar(150) | Shown on cards and previews |
| `description` | text | Long-form, markdown allowed |
| `external_url` | text | Canonical URL (YouTube, Vimeo, Twitch, anything) |
| `platform` | enum (YOUTUBE, VIMEO, TWITCH, OTHER) | Inferred at submit time from the URL host |
| `platform_video_id` | varchar(64) | Extracted id (e.g. YouTube `dQw4w9WgXcQ`); used to build thumbnails |
| `thumbnail_url` | text | Auto-fetched for YouTube at submit time; null otherwise |
| `duration_sec` | int | Optional |
| `level` | enum (BEGINNER, INTERMEDIATE, ADVANCED) | Set at submit; editable by moderator or super admin |
| `order` | int, default 10 | Homepage ordering; lower = higher; 1 is the hero spot |
| `is_sponsored` | bool, default false | Orange-tinted "Sponsored" badge |
| `is_featured` | bool, default false | Hero candidate |
| `status` | enum (REVIEW, APPROVED, REJECTED), default REVIEW | Moderator decision |
| `published` | bool, default false | Distinct from `status` — a video can be APPROVED but unpublished |
| `published_at` | timestamp | Set when first published; cleared on unpublish |
| `unpublished_at` | timestamp | Set when unpublished; never cleared (audit trail) |
| `submitted_by_id` | uuid, FK → users.id (restrict) | The user who submitted |
| `reviewed_by_id` | uuid, FK → users.id (set null) | The moderator who approved/rejected |
| `reviewed_at` | timestamp | |
| `rejection_reason` | text | Free-form reason given by the moderator |
| `language` | enum (EN, ES, PT, HI, ZH), default EN | Spoken language of the video |
| `series_id` | uuid, FK → video_series.id (set null) | Optional grouping |
| `view_count` | int, default 0 | Denormalised |
| `like_count` / `dislike_count` | int, default 0 | Denormalised |
| `comment_count` | int, default 0 | Denormalised |
| `report_count` | int, default 0 | Denormalised |
| `created_at` / `updated_at` | timestamp | |
| `deleted_at` | timestamp | Soft delete — public queries filter this out |
| `deleted_by_id` | uuid, FK → users.id (set null) | Who deleted it |

Indexes: `slug`, `published_at`, `status`, `published`, `order`, `level`,
`series_id`, `deleted_at`. Also a Postgres full-text index on
`title || short_description || description` for search.

### 3.4 `video_series`

An optional grouping of related videos (e.g. "opencode Essentials" —
a mini-course). Currently lightly used; future roadmap will make this
first-class.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `title` | varchar(200) | |
| `slug` | varchar(220) | Unique by convention; not enforced at DB level |
| `description` | text | |
| `created_by_id` | uuid, FK → users.id | |
| `created_at` | timestamp | |

### 3.5 `tags`

A controlled vocabulary that videos can be tagged with.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `name` | varchar(60), unique | Display label |
| `slug` | varchar(80), unique | URL handle |
| `description` | text | Optional |
| `category` | enum (TOPIC, TOOL, LANGUAGE) | For grouping on `/tags` |
| `usage_count` | int, default 0 | Denormalised; incremented on attach |
| `created_by_id` | uuid, FK → users.id | Who created it |
| `created_at` | timestamp | |

### 3.6 `video_tags`

The many-to-many join between videos and tags.

| Column | Type | Notes |
|---|---|---|
| `video_id` | uuid, FK → videos.id (cascade) | Part of composite PK |
| `tag_id` | uuid, FK → tags.id (cascade) | Part of composite PK |
| `created_at` | timestamp | |

Composite PK on `(video_id, tag_id)`. Indexed on `tag_id`.

### 3.7 `tag_suggestions`

User-submitted tags that need moderator approval before becoming real
tags.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `name` | varchar(60) | Suggested name |
| `category` | enum (TOPIC, TOOL, LANGUAGE) | |
| `description` | text | |
| `suggested_by_id` | uuid, FK → users.id (cascade) | |
| `status` | enum (PENDING, APPROVED, REJECTED), default PENDING | |
| `resolved_by_id` | uuid, FK → users.id (set null) | |
| `resolved_at` | timestamp | |
| `created_at` | timestamp | |

### 3.8 `comments`

Flat (non-threaded) per-video comments. One row per comment.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `video_id` | uuid, FK → videos.id (cascade) | |
| `user_id` | uuid, FK → users.id (cascade) | |
| `body` | text | Markdown not rendered today (future) |
| `status` | enum (VISIBLE, HIDDEN, DELETED), default VISIBLE | Soft-delete via this enum |
| `like_count` | int, default 0 | Denormalised; reserved |
| `created_at` / `edited_at` / `deleted_at` | timestamp | |

Indexed on `video_id`, `user_id`, `created_at`.

### 3.9 `comment_likes`

Reserved for future. One row per (comment, user).

### 3.10 `video_likes`

A user's binary like/dislike on a video. One row per (video, user).
Toggle semantics: the same value clicked again removes the row.
Switch semantics: the opposite value replaces it.

| Column | Type | Notes |
|---|---|---|
| `video_id` | uuid, FK → videos.id (cascade) | Part of composite PK |
| `user_id` | uuid, FK → users.id (cascade) | Part of composite PK |
| `value` | enum (LIKE, DISLIKE) | |
| `created_at` | timestamp | Updated on switch |

Composite PK on `(video_id, user_id)`. Indexed on `user_id`.

### 3.11 `watchlist`

A user's "saved for later" list. Distinct from per-user labels (§3.13).

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid, FK → users.id (cascade) | Part of composite PK |
| `video_id` | uuid, FK → videos.id (cascade) | Part of composite PK |
| `added_at` | timestamp | |

Composite PK on `(user_id, video_id)`. Indexed on `user_id`.

### 3.12 `video_labels`

Per-user, per-video labels used for personal library organisation.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid, FK → users.id (cascade) | Part of composite PK |
| `video_id` | uuid, FK → videos.id (cascade) | Part of composite PK |
| `label` | enum (TO_WATCH, WATCHED, TO_REWATCH) | |
| `created_at` / `updated_at` | timestamp | |

Composite PK on `(user_id, video_id)`. Indexed on `(user_id, label)` for
the library tabs.

### 3.13 `watch_history`

A user's playback progress on a video. One row per (user, video);
upserted on each progress event.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid, FK → users.id (cascade) | Part of composite PK |
| `video_id` | uuid, FK → videos.id (cascade) | Part of composite PK |
| `watched_seconds` | int, default 0 | |
| `total_duration_sec` | int, default 0 | Snapshot at watch time (so the percentage survives video re-encoding) |
| `completed` | bool, default false | Set when `watched_seconds / total_duration_sec ≥ 0.9` |
| `last_watched_at` | timestamp | Used to surface "Continue watching" on the library page |

Composite PK on `(user_id, video_id)`. Indexed on `(user_id,
last_watched_at)` for the "continue watching" query.

### 3.14 `subscriptions`

A user's follows of either another user or a tag. Notifications of new
content from a subscription are partially wired (the table exists, the
notification type is declared) but not yet fired.

| Column | Type | Notes |
|---|---|---|
| `follower_id` | uuid, FK → users.id (cascade) | Part of composite PK |
| `target_type` | enum (USER, TAG) | Part of composite PK |
| `target_id` | uuid | FK is application-enforced (target may be users.id or tags.id) |
| `created_at` | timestamp | |

Composite PK on `(follower_id, target_type, target_id)`. Indexed on
`(target_type, target_id)`.

### 3.15 `notifications`

Per-user inbox. The query side is built (an unread count and a list
endpoint exist in the data layer), but the surface UI hasn't shipped —
this is roadmap §13.4.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid, FK → users.id (cascade) | |
| `type` | enum (VIDEO_APPROVED, VIDEO_REJECTED, NEW_COMMENT, NEW_REPLY, NEW_VIDEO_FROM_SUBSCRIPTION, VIDEO_REPORTED) | |
| `payload` | jsonb | Type-specific blob (e.g. `{ videoId, videoSlug, fromUser }`) |
| `read_at` | timestamp | Null = unread |
| `created_at` | timestamp | |

Indexed on `(user_id, read_at)`.

### 3.16 `reports`

User-submitted reports of abuse.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `reporter_id` | uuid, FK → users.id (cascade) | |
| `target_type` | enum (VIDEO, COMMENT, USER) | |
| `target_id` | uuid | FK is application-enforced |
| `reason` | text | Free-form, ≥ 10 chars |
| `status` | enum (OPEN, RESOLVED, DISMISSED), default OPEN | |
| `resolved_by_id` | uuid, FK → users.id (set null) | |
| `resolved_at` | timestamp | |
| `created_at` | timestamp | |

Indexed on `(target_type, target_id)` and `status`.

### 3.17 `audit_log`

The single source of truth for every privileged action. Written on every
mutation that touches a moderator- or admin-only operation.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `actor_id` | uuid, FK → users.id (set null) | Null on system actions |
| `action` | varchar(80) | e.g. `video.approve`, `user.set_role` |
| `entity_type` | varchar(40) | e.g. `video`, `user`, `tag` |
| `entity_id` | uuid | The thing acted on |
| `diff` | jsonb | Action-specific payload (`{ from, to }` for changes; reason for deletes; etc.) |
| `ip` | varchar(64) | Reserved; not currently captured |
| `created_at` | timestamp | |

Indexed on `actor_id`, `(entity_type, entity_id)`, and `created_at` for
the admin audit-log table.

### 3.18 `sponsorships`

Metadata about a sponsored video. The data exists; the editor and
billing surface do not yet — this is roadmap §13.7.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `video_id` | uuid, FK → videos.id (cascade) | |
| `sponsor_name` | varchar(120) | |
| `amount_cents` | int, default 0 | |
| `started_at` | timestamp | |
| `expires_at` | timestamp | |

---

## 4. Authentication

### 4.1 OAuth providers and the "always-pick" flow

The site accepts sign-in from **GitHub** and **Google**. Neither provider
exposes a password; both redirect to a consent screen that asks the
user to confirm their account.

Crucially, both providers are configured with
`prompt=select_account`. This is OAuth 2.0's "always show the account
chooser" hint. Without it, if the user has an active session cookie for
the provider, the OAuth flow silently re-authenticates them with the
same account — they never get a choice. With it, every sign-in shows
the chooser, even right after signing out.

### 4.2 Session strategy

Sessions are JWTs (signed with `AUTH_SECRET`), not database sessions.
This means the application server does not have to query the database on
every request to validate a session — only when it needs to enrich the
session with role + username (which it does on the first request after
sign-in and then embeds in the token).

The JWT carries `uid`, `role`, `username`. `uid` is the user's UUID,
`role` is one of the three persisted roles, `username` is the URL-safe
handle. These are populated by the `jwt` callback after the first DB
lookup for the user.

### 4.3 Callback chain

Three Auth.js callbacks run on each sign-in:

1. **`signIn`** — runs on every OAuth callback. Looks up the user by
   email. If none exists, creates one with a generated username derived
   from the email local part (with collision-resolution fallback) and
   links the OAuth provider to it.
2. **`jwt`** — runs every time the JWT is decoded or refreshed.
   Enriches the token with `uid`, `role`, `username` from the database
   the first time. Subsequent calls hit the database too, so role
   changes propagate within a session lifetime.
3. **`session`** — runs on every page that reads the session. Maps the
   token fields back to `session.user.id`, `session.user.role`,
   `session.user.username`.

### 4.4 Email change with double verification

The site supports changing an account email. The flow exists because a
user typing the wrong address is the easiest way to lose access to their
account — the confirmation link is sent to the NEW address, so a typo
means the user never sees the link and the change never commits.

The flow is two-step:

1. **Step 1 — request.** The user types the new address twice. The
   server validates: both fields match, the new address is not already
   the user's current email, no other user holds that address. It then
   stores `pending_email`, a random 32-byte base64url token, and a
   24-hour expiry timestamp. It writes an `user.email_change_requested`
   audit entry with `{ to: <new email> }` and **sends the confirmation
   link** via SMTP.
2. **Step 2 — confirm.** The user clicks the link and lands on
   `/verify-email?token=…`. The server re-checks the token, the expiry,
   and uniqueness of the new address (in case someone else registered
   it in the meantime). If all clear, it commits the swap: `email`
   becomes the pending value, `email_verified_at` is set to now, and
   `pending_email` / `email_change_token` / `email_change_expires_at`
   are cleared. The `user.email_change_committed` audit entry is
   written with `{ from, to }`.

The user can cancel a pending change from the settings page at any time
before clicking the link. The user can also re-request — each request
overwrites the previous one and invalidates the prior token.

---

## 5. Features by role

This section is the matrix. For each role, here is what they can do
across the surface. Each item links to a deep-dive in §6.

### 5.1 Anonymous viewer

The full public surface of the site, no sign-in required.

- Visit the homepage with hero + row of latest + curated rows by level
- Browse all approved and published videos with filters: level
  (beginner / intermediate / advanced), platform (YouTube / Vimeo /
  Twitch / other), full-text search across title + description, tag
  filter via `/tags/[slug]`
- View any video page: embedded player, full description, comments,
  tags, related videos at the same level, the submitter's profile card
- View any public user profile at `/u/[username]`: bio, social handles,
  their submitted videos
- View all tags at `/tags`
- Read static pages: `/about`, `/code-of-conduct`
- Read the RSS feed at `/rss.xml`
- Sign in or sign up from `/login` (OAuth only)

### 5.2 USER

Everything Anonymous can do, plus:

- **Submit** a video (`/submit`): title, short description, video URL,
  level, language, up to ~5 tags. Lands in the moderation queue.
- **Comment** on any video
- **Like / dislike** any video (binary, toggle, switch)
- **Save** videos to a personal watchlist (Netflix-style "My List")
- **Label** videos: To watch, Watched, To re-watch
- **Continue watching** is surfaced on `/watchlist` for any in-progress
  video
- **Edit profile**: display name, bio, six social handles (GitHub,
  YouTube, Twitch, Vimeo, LinkedIn, X), avatar defaults to the OAuth
  picture
- **Change email** with double verification
- **Report** abuse on any video, comment, or user
- **Suggest** new tags that go to the moderation queue

### 5.3 MODERATOR

Everything USER can do, plus:

- See and process the **review queue** at `/admin/queue` — every video
  in `status = REVIEW`, ordered oldest first
- **Approve** a video: sets `status = APPROVED`, `published = true`,
  `published_at = now`, captures reviewer id and timestamp, optionally
  applies `is_featured` / `is_sponsored` / `order` at the same moment
- **Reject** a video: sets `status = REJECTED`, captures rejection
  reason, fires a `VIDEO_REJECTED` notification to the submitter
- **Change a video's level** at any time
- **Unpublish** an approved video without rejecting it
- **Manage tags**: create new tags, browse pending tag suggestions,
  approve or reject each (approval creates the tag; rejection just
  closes the suggestion)
- **Resolve reports** from `/admin/reports`

Moderators **cannot** change video order, mark sponsored, mark featured,
manage users, soft-delete, view the audit log, or see the leaderboard.

### 5.4 SUPER_ADMIN

Everything MODERATOR can do, plus the full control surface:

- **All videos table** at `/admin/videos`: filter by status, filter by
  "Active" or "Deleted" (toggle that surfaces soft-deleted rows)
- **Inline controls** on each row:
  - Order (1–10) — saves via an explicit button
  - **Feature** toggle — instantly marks `is_featured`
  - **Sponsor** toggle — instantly marks `is_sponsored`
  - **Delete video (soft)** — sets `deleted_at`, removes from public
- **Open video** → detail page with the full admin surface:
  - Review status card (status / published / reviewer / timestamp /
    rejection reason)
  - **Super admin controls** panel: change level + unpublish buttons
  - **Admin flags panel**: change level, feature / sponsor toggles,
    set display order
  - **Danger zone**: soft-delete or restore
  - **Admin history**: last 15 privileged actions on this video
- **Manage users** at `/admin/users`: change any user's role and status
  inline. Super admin only for `BANNED`.
- **Audit log** at `/admin/audit`: scrollable reverse-chronological list
  of every privileged action with actor, target, and diff
- **Leaderboard** at `/leaderboard` (the only place that shows
  most-active contributors; hidden from the public)

---

## 6. Feature deep-dives

For each feature: **what** it does, **why** it exists, **how** it
flows, **what data** it touches, **what edge cases** it has.

### 6.1 Browse, search, and filter

**What.** The browse page lists every approved-and-published video
(filtered to exclude soft-deleted) with three optional filters plus
full-text search.

**Why.** Users arrive from many entry points — homepage, a tag page,
search engines, the RSS feed. The browse page is the canonical index
for "everything we've curated".

**How.** The page reads query-string parameters for level, platform,
tag, and a free-text `q`. Queries are assembled from a base
`status = APPROVED AND published = true` filter. Results are sorted by
`order ASC, published_at DESC` — sponsored or featured videos with
order = 1 appear first. Each result row includes the submitter's name
and avatar so users see a person behind every video.

**Edge cases.** Soft-deleted videos are excluded even if a query string
somehow references them (URL-only attack). Results are capped at 100
to keep the page light. Search is case-insensitive substring matching
on `title` and `short_description` (description is searched via the
full-text index when present).

### 6.2 Submit a video

**What.** A signed-in user fills in a form, hits submit, and the
video lands in the review queue.

**Why.** Submissions are the engine of the catalog — every video
starts here.

**How.** The form validates with Zod: title ≤ 200, short description
≤ 150, URL is a parseable URL, level is one of three, language is one
of five. The server parses the URL to infer the platform (YouTube,
Vimeo, Twitch) and extract the platform-specific video id. For
YouTube, it auto-fills a thumbnail URL using the standard `i.ytimg.com`
endpoint. A URL-safe slug is generated from the title and made unique
by appending a counter. The video is inserted with `status = REVIEW`,
`published = false`, `submitted_by_id = <current user>`. The user
is redirected to a "thanks" page. An `user.video_submit` audit entry
is written.

**Edge cases.** Two submitters racing on the same title get
suffix-appended slugs (e.g. `opencode-in-5-minutes`, `…-1`, `…-2`).
Non-recognised URLs are accepted as `platform = OTHER`; the embed is
the original URL itself.

### 6.3 Moderation: approve, reject, soft-delete, unpublish

**What.** Four operations, each with a distinct semantics:

- **Approve.** Marks the video eligible for the public surface. Sets
  `status = APPROVED`, `published = true`, captures reviewer id and
  timestamp, optionally sets `order / is_featured / is_sponsored` at
  the same moment.
- **Reject.** Removes the video from the catalog. Sets `status =
  REJECTED`, captures rejection reason. The video never becomes public.
- **Soft-delete.** Removes an already-published video from the public
  surface without changing its `status` (which stays `APPROVED`).
  Sets `deleted_at` and `published = false`. The row stays in the DB
  for the audit log.
- **Unpublish.** Hides the video from the public surface but keeps
  the row visible to admins. Sets `published = false` and captures
  `unpublished_at`. The video can be re-published later (which sets
  `published = true` again; `unpublished_at` is never cleared, so the
  history survives).

**Why.** A clean separation. Reject = bad content, never publish. Soft
delete = temporary removal, may restore. Unpublish = take down but
keep on record. Each one writes a distinct audit entry.

**How.** Four distinct server actions. The reviewer's user id and the
timestamp are captured atomically with the status change. Every action
revalidates `/`, `/browse`, `/admin`, the admin detail page, and the
public video page so the change is visible on the next request.

**Edge cases.** Approve + unpublish sequence leaves the video approved
but invisible. Unpublish + soft-delete leaves a doubly-hidden row
(hidden by both `published = false` and `deleted_at`); restore clears
both. Soft-deleted videos stay accessible to admins via the
"Deleted" filter on `/admin/videos`.

### 6.4 Like and dislike

**What.** A binary vote per (user, video).

**Why.** Quality signal. Denormalised counts (`like_count`,
`dislike_count`) drive a future ranking feature.

**How.** Three behaviours:
- **No prior vote → click LIKE.** Insert a row, increment `like_count`.
- **Prior LIKE → click LIKE again.** Delete the row, decrement
  `like_count` (toggle off).
- **Prior LIKE → click DISLIKE.** Update the row's `value`, decrement
  `like_count`, increment `dislike_count` (switch).

The opposite pair (DISLIKE → DISLIKE toggle, DISLIKE → LIKE) is the
mirror. This gives "click again to undo" and "click the other to
switch" for free.

**Edge cases.** Anonymous clicks are rejected by the server action
before the DB write — the action returns `{ ok: false, error: "Sign in
required" }`. The UI never sends the request in that case.

### 6.5 Watchlist and continue-watching

**What.** Two distinct concepts, both surface in the same `/watchlist`
("Library") page.

**Why.** They solve different problems. Watchlist = "I want to watch
this later". Continue-watching = "I started this and want to pick up
where I left off".

**How.** The library page lists three label tabs (To watch / Watched
/ To re-watch) plus a "Continue watching" rail that's only shown on
the default (un-filtered) view. Continue-watching reads from
`watch_history` where `completed = false`, sorted by `last_watched_at
DESC`, capped at 12 items.

**Edge cases.** A video can appear in both the watchlist and the
continue-watching list if a user saved it but hasn't finished. The
progress percentage shown in the continue-watching card uses
`watched_seconds / total_duration_sec`; if `total_duration_sec` is 0
(unknown duration), it shows 0% with a fallback message.

### 6.6 Per-user video labels

**What.** Each user can label a video as one of three states: To
watch, Watched, To re-watch. One label per (user, video). Setting a
label replaces any prior label; clicking the active label removes the
label entirely.

**Why.** Power users want finer-grained personal library organisation
than a single "saved for later" list.

**How.** The `video_labels` table stores one row per (user, video)
with the chosen label. The video page renders three buttons (one per
label), and the active one is filled. Clicking the active button or
clicking "Clear" deletes the row. A "Clear" link appears when any
label is set.

**Edge cases.** Labels are private — they are never exposed on the
public video page or to other users. The `updated_at` timestamp is
the sort key for the library tabs (most recently labelled first).

### 6.7 Comments and reporting abuse

**What.** Signed-in users can comment on any video. Anyone (signed-in
or anonymous) can see comments. Anyone signed-in can report abuse on
a video, comment, or user.

**Why.** Conversation is the social glue; reporting is the safety net.

**How.** Comments are flat — no threading. Comment creation is a
server action that validates the body (2–2000 chars), inserts the row,
increments `videos.comment_count`, fires a `NEW_COMMENT` notification
to the video submitter (unless they're commenting on their own
video), and revalidates the video page.

Reports are also a server action. Each report validates the reason
(10+ chars) and inserts a row. For `target_type = VIDEO` the action
also increments `videos.report_count` as a soft signal. Open reports
appear on `/admin/reports`.

**Edge cases.** Comment soft-delete via `status = DELETED` is reserved
for moderators; today the only path is via direct DB intervention.

### 6.8 Tags: browse, suggest, manage

**What.** Tags are a controlled vocabulary. Any user can browse them;
signed-in users can suggest new ones; moderators and super admins can
create them directly or approve suggestions.

**Why.** Tags make the catalogue navigable without relying on free-text
search alone.

**How.** Three surfaces:
- **Browse** at `/tags`: groups by category (TOPIC, TOOL, LANGUAGE).
- **Per-tag page** at `/tags/[slug]`: lists approved-and-published
  videos with that tag.
- **Suggest** on the submit form: checkboxes for existing tags + a
  note that moderators will consider new ones.

The tag-suggestion flow: user clicks "Suggest" (future) → submits a
name and category → lands in the queue at `/admin/tags` → moderator
either approves (which creates the real tag) or rejects.

**Edge cases.** Tag names are unique on `name` and `slug`; duplicates
silently `onConflictDoNothing`. The `usage_count` column is incremented
on attach and decremented on detach — but currently neither detach
nor delete-from-video is implemented; the column tends to grow over a
tag's lifetime, which is fine for ranking purposes.

### 6.9 Leaderboard (super admin only)

**What.** A ranked list of the most active contributors, computed
on-the-fly from the database. Hidden from the public surface; only
super admins see it.

**Why.** It's a staff tool, not a community feature. The product
owner wants to know who's contributing without exposing contributor
counts to the world.

**How.** The page queries three aggregates in one pass: approved-video
count per submitter (weighted 3×), comment count per author, and
total likes received on the user's videos. A combined score sorts the
list. Top 5 are shown on `/admin`; the full list (50) is on
`/leaderboard`.

**Edge cases.** Empty contribution shows up as `videosApproved: 0,
commentsCount: 0, likesReceived: 0`. Users with `status = BANNED` are
excluded.

### 6.10 Profile (public)

**What.** `/u/[username]` shows a user's avatar, display name, bio,
social-handle pills, role badge, and their submitted videos.

**Why.** Personal pages build trust and let contributors point to their
work elsewhere.

**How.** Loads the user record by username. If `status = BANNED`,
404. Otherwise loads their videos where `status = APPROVED AND
published = true AND deleted_at IS NULL`, ordered by `published_at
DESC`. Social-handle pills link out to the respective platforms.

**Edge cases.** A user with no social handles sees no pills. A user
with no approved videos sees an empty grid with a "Submit one" prompt
(deep-link to `/submit`).

### 6.11 Settings (private)

**What.** `/settings` lets the signed-in user edit their display name,
bio, six social handles, and change their email address.

**Why.** A user owns their own data; the platform shouldn't gatekeep
trivial edits.

**How.** Server components load the current user record. A client
form posts to a server action that validates and writes. Two forms:
one for socials + bio + display name, one for email change (which has
its own double-verification flow).

**Edge cases.** A pending email change is shown on the page with a
"Cancel pending" button. The current email shows a "Verified" or
"Unverified" badge based on `email_verified_at`.

### 6.12 Notifications (in-app, partial)

**What.** A per-user inbox keyed by `notifications.user_id`. Each
notification has a type and a JSON payload.

**Why.** Asynchronous feedback for things the user did or that
happened to their content.

**How.** Today, the only writers are:
- `NEW_COMMENT` — fires when a user comments on someone else's video
- `VIDEO_APPROVED` — fires when a moderator approves a submission
- `VIDEO_REJECTED` — fires when a moderator rejects a submission

The `notifications` table query side (unread count + list) is built
but the user-facing inbox UI is not yet shipped (roadmap §13.4).

**Edge cases.** Self-actions never fire (e.g. you don't get a
notification when you comment on your own video).

### 6.13 Reports and audit log

**What.** Two complementary safety surfaces.

**Why.** Reports are user-driven: "I saw something bad". The audit log
is moderator-driven: "what did my team do, and when".

**How.** Reports go to `/admin/reports` (status: OPEN). Resolving a
report sets `resolved_by_id` and `resolved_at`. The exact policy for
what "resolve" means (delete the offending content, dismiss, etc.) is
up to the moderator — there's no enforced workflow.

The audit log at `/admin/audit` lists every `audit_log` row,
reverse-chronological, with the actor's username, the action string,
the entity type and id, and a collapsed JSON diff.

**Edge cases.** The audit log is append-only — there's no UI to edit
or delete rows. Diff payloads can be large for things like
`video.flags`; the UI truncates with `truncate` on display.

### 6.14 Code of conduct and footer policy

**What.** A static page at `/code-of-conduct` plus a footer link.

**Why.** Sets expectations for community behaviour. The "be nice"
section explicitly calls out welcoming, patient, considerate,
respectful, and curious as the five norms.

**How.** A static page rendered server-side, linked from the global
footer next to "About" and "RSS".

**Edge cases.** None — it's a static page.

### 6.15 Buy-me-a-coffee and sponsorship surface

**What.** A footer link to the maintainer's personal Buy Me a Coffee
page. The label is short ("Buy me a coffee ☕") so it doesn't crowd the
footer.

**Why.** Direct support for the maintainer.

**How.** Plain `<a target="_blank">` in the footer.

**Edge cases.** None on the surface side. The deeper sponsorship
system (`sponsorships` table) for promoting videos to the top spot
is data-only today; the editor UI is roadmap §13.7.

---

## 7. Email system (SMTP)

### 7.1 Templates

A single template family is in use today: **confirmation email** for
the email-change flow. It renders both plain-text and HTML bodies. The
HTML body uses inline styles only (no external CSS, no images) for
maximum client compatibility.

### 7.2 Triggers

Currently exactly one trigger: the second step of the email change,
when the user requests a confirmation link. The template receives
the to-name, the action label, the action URL (a `/verify-email?token=…`
link), an introduction sentence, and an optional warning.

### 7.3 Dev fallback

If SMTP credentials are unset (or the explicit `forceConsole` flag is
set), the sender logs the message to the server console with a
`[email:console]` prefix instead of opening a connection. The
template's text body is printed verbatim. This makes local development
zero-setup.

### 7.4 Failure modes

The sender never throws. If SMTP connection or send fails, the error
is caught, logged with a `[email:smtp] FAILED …` line, and returned to
the caller as `{ ok: false, channel: 'smtp', error: <message> }`. The
caller (currently the email-change action) surfaces the failure to
the user with a friendly message.

### 7.5 Sender configuration

Two paths are supported and auto-detected at module load:

- **Generic SMTP**: `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`,
  `EMAIL_SERVER_SECURE`, `EMAIL_SERVER_USER`,
  `EMAIL_SERVER_PASSWORD`. Works with any provider.
- **SES SMTP**: `AWS_SES_REGION`, `AWS_SES_SMTP_USER`,
  `AWS_SES_SMTP_PASSWORD`. Host is auto-derived as
  `email-smtp.<region>.amazonaws.com:587` with STARTTLS.

Either path requires `EMAIL_FROM`, the verified sender.

---

## 8. Edge cases and business rules

The rules the system enforces (or deliberately doesn't enforce).
Listed in roughly the order they're likely to bite you.

1. **Soft-deleted videos are invisible to the public.** Every public
   list and detail query filters `deleted_at IS NULL`. The admin
   "Deleted" toggle is the only way to see them. Soft-delete also
   forces `published = false` so a subsequent admin restore must
   re-publish explicitly.
2. **The public video page is gated four ways.** It returns 404
   unless the video exists, has `status = APPROVED`, has
   `published = true`, and has `deleted_at IS NULL`. Any one of those
   failing is enough to 404.
3. **Watch-history "completed" threshold is 90 %.** A video is marked
   complete when `watched_seconds / total_duration_sec ≥ 0.9`. Below
   that, it appears in Continue-watching. If `total_duration_sec` is
   unknown (0), the video never auto-completes.
4. **Email-change token expires in 24 hours.** Expired tokens get a
   "this link has expired — please request a new one" message.
5. **Email-change re-checks uniqueness at commit time.** Between
   request and confirm, the new address might have been claimed by
   another user. If so, the commit fails with a friendly message; the
   pending row stays so the user can re-request with a different
   address.
6. **OAuth account picker is forced every time.** Both GitHub and
   Google providers use `prompt=select_account`. Even right after
   sign-out, clicking "Continue with GitHub" shows the chooser.
7. **Featured and sponsored flags on a deleted video stay.** Soft
   delete does not clear them. If you restore the video, the flags
   remain as they were at deletion time. This is intentional — admin
   decisions survive a soft-delete cycle.
8. **Comment soft-delete preserves the row.** Setting
   `status = DELETED` hides the comment from the public page while
   keeping it for the audit log. There is no UI to do this today; the
   path is reserved for moderator future use.
9. **Unique-email constraints.** Both `users.email` and
   `users.pending_email` are unique. Trying to register or change to
   an already-claimed address is rejected before the DB write.
10. **Slug collisions on submit.** If two users submit videos with
    titles that slugify identically, the second submission gets
    `-1`, `-2`, etc. appended. There's no upper bound; in practice
    titles are distinctive enough that this rarely happens.
11. **OAuth callback URLs are domain-pinned.** The OAuth apps
    registered with GitHub and Google must list
    `https://www.opencode.guru/api/auth/callback/<provider>`. Local
    dev uses a separate registration against the local callback.
12. **Order field semantics.** Lower is higher. `order = 1` is the
    hero spot. `order = 10` is the default and shows up after every
    lower-ordered video.
13. **`is_featured` vs `is_sponsored`.** `is_featured` is a binary
    toggle for the hero candidate. `is_sponsored` is a brand-tinted
    badge and ordering signal. A video can be one, both, or neither.
14. **The watchlist and labels are independent.** A user can have a
    video in both lists. They serve different purposes (save-for-later
    vs. viewing-state tracking).

---

## 9. Server-action catalogue

Every privileged mutation runs as a server action. This table maps
each one to its purpose, required auth, and audit event.

| Action | Purpose | Auth required | Audit event |
|---|---|---|---|
| `submitVideoAction` | Insert a new video in REVIEW | Signed in | `user.video_submit` (caller is `submitter`) |
| `commentAction` | Post a comment on a video | Signed in | (none; comment insert is the audit) |
| `likeAction` | Set/toggle/switch a user's like on a video | Signed in | (none; denormalised counts change) |
| `watchlistAction` | Add or remove a video from a user's watchlist | Signed in | (none) |
| `watchProgressAction` | Upsert `watch_history` for a video | Signed in | (none) |
| `setVideoLabelAction` | Set, change, or clear a user's label on a video | Signed in | (none) |
| `reportAction` | Insert a report against a video/comment/user | Signed in | (none) |
| `suggestTagAction` | Insert a tag suggestion | Signed in | (none — moderator resolves later) |
| `reviewVideoAction` | Approve or reject a pending video | Moderator or super admin | `video.approve` / `video.reject` |
| `updateVideoOrderAction` | Change display order, optionally set featured / sponsored | Super admin | `video.reorder` (diff includes order + flags) |
| `updateVideoFlagsAction` | Toggle just `is_featured` or `is_sponsored` independently | Super admin | `video.flags` (per-flag `{from, to}`) |
| `updateVideoLevelAction` | Change a video's level | Moderator or super admin | `video.level_change` (`{ from, to }`) |
| `unpublishVideoAction` | Take an approved video down | Moderator or super admin | `video.unpublish` (with optional reason) |
| `deleteVideoAction` | Soft-delete a video | Super admin | `video.soft_delete` (with optional reason) |
| `restoreVideoAction` | Restore a soft-deleted video | Super admin | `video.restore` |
| `setUserRoleAction` | Change a user's role | Super admin | `user.set_role` |
| `setUserStatusAction` | Suspend or ban a user (BANNED is super admin only) | Moderator or super admin | `user.set_status` |
| `createTagAction` | Insert a new tag | Moderator or super admin | `tag.create` |
| `resolveTagSuggestionAction` | Approve or reject a pending tag suggestion | Moderator or super admin | `tag.suggestion.resolve` |
| `updateSocialProfileAction` | Update the user's own social handles + bio + display name | Signed in | `user.social_update` |
| `requestEmailChangeAction` | Stage a pending email change + send confirmation email | Signed in | `user.email_change_requested` |
| `verifyEmailChangeAction` | Commit a pending email change after token verification | Public (token-gated) | `user.email_change_committed` (`{ from, to }`) |
| `cancelEmailChangeAction` | Clear a pending email change without committing | Signed in | (none) |

---

## 10. Route catalogue

Every page in the application, by access level.

| Route | Method | Access | Purpose |
|---|---|---|---|
| `/` | GET | Public | Homepage: hero + curated rows |
| `/browse` | GET | Public | All approved videos with filters |
| `/v/[slug]` | GET | Public | Video page: player + details + comments |
| `/tags` | GET | Public | All tags grouped by category |
| `/tags/[slug]` | GET | Public | All approved videos for a tag |
| `/u/[username]` | GET | Public | User profile + their videos |
| `/about` | GET | Public | About the site |
| `/code-of-conduct` | GET | Public | Community Code of Conduct |
| `/rss.xml` | GET | Public | RSS feed of latest approved videos |
| `/sitemap.xml` | GET | Public | Dynamic sitemap |
| `/login` | GET | Public | OAuth sign-in chooser |
| `/submit` | GET | Signed in | Video submission form |
| `/submit/thanks` | GET | Signed in | Confirmation page |
| `/settings` | GET | Signed in | Profile + socials + email settings |
| `/watchlist` | GET | Signed in | Library: labels + continue watching |
| `/verify-email` | GET | Public (token-gated) | Email-change confirmation page |
| `/leaderboard` | GET | Super admin | Most active contributors |
| `/admin` | GET | Moderator / super admin | Admin dashboard |
| `/admin/queue` | GET | Moderator / super admin | Review queue |
| `/admin/videos` | GET | Moderator / super admin | All videos with filters |
| `/admin/videos/[id]` | GET | Moderator / super admin | Video detail + admin controls |
| `/admin/tags` | GET | Moderator / super admin | Tag management + suggestions |
| `/admin/users` | GET | Moderator / super admin | User role + status management |
| `/admin/reports` | GET | Moderator / super admin | Open reports |
| `/admin/audit` | GET | Super admin | Audit log |
| `/api/auth/[...nextauth]` | ANY | Public | Auth.js handlers |

---

## 11. Component catalogue

Components organised by domain. Each component is the visual primitive
for a specific feature.

### 11.1 Public surface

- **TopNav** — fixed header with brand mark, primary links
  (Browse / Tags / Library), submit button, and user menu
- **AdminDropdown** — privileged action menu (only visible to
  moderators + super admins)
- **VideoCard** — the homepage thumbnail card (thumbnail, level,
  platform, title, description, submitter, view count, time-ago)
- **VideoRow** — horizontally scrolling row wrapper around VideoCards
- **VideoPlayer** — embed wrapper around the platform's iframe URL
- **VideoActions** — like, save, report buttons
- **VideoLabelSelector** — three-label picker (To watch / Watched /
  To re-watch) with toggle semantics
- **CommentSection** — flat comment thread with composer
- **ErrorPage** / **GlobalErrorPage** — branded error UI that
  classifies errors (auth, DB, generic)

### 11.2 Admin surface

- **AdminFlagsPanel** — super admin controls: level, feature / sponsor
  toggles, order
- **AdminVideoControls** — moderator+ controls: level + unpublish
- **AdminDeletePanel** — super admin: soft delete + restore
- **ReviewForm** — approve / reject form for the queue
- **ReviewQuickActions** — inline order input + feature / sponsor
  buttons in the all-videos table
- **TagAdminForm** — create-tag form
- **TagSuggestionRow** — single row in the pending suggestions queue
- **UserRow** — single row in the user-management table

### 11.3 Settings surface

- **SocialProfileForm** — display name + bio + six social handles
- **EmailChangeForm** — type-twice confirmation + cancel pending

---

## 12. Audit log schema

The `audit_log` table is the single source of truth for privileged
actions. Every privileged mutation writes a row. The full list of
action types and their diff shapes:

| Action | Actor | Entity | Diff shape |
|---|---|---|---|
| `user.video_submit` | submitter | video | `{ title, platform }` |
| `video.approve` | reviewer | video | `{ published }` (boolean) |
| `video.reject` | reviewer | video | `{ reason }` |
| `video.reorder` | super admin | video | `{ order, isSponsored, isFeatured }` |
| `video.flags` | super admin | video | `{ isFeatured: { from, to }, isSponsored: { from, to } }` |
| `video.level_change` | mod / super admin | video | `{ from, to }` |
| `video.unpublish` | mod / super admin | video | `{ reason }` |
| `video.soft_delete` | super admin | video | `{ reason }` |
| `video.restore` | super admin | video | (empty) |
| `user.set_role` | super admin | user | `{ role }` |
| `user.set_status` | mod / super admin | user | `{ status }` |
| `tag.create` | mod / super admin | tag | `{ name }` |
| `tag.suggestion.resolve` | mod / super admin | tagSuggestion | `{ decision: 'APPROVE' \| 'REJECT' }` |
| `user.social_update` | self | user | (empty — diff would be too noisy) |
| `user.email_change_requested` | self | user | `{ to }` |
| `user.email_change_committed` | self | user | `{ from, to }` |

---

## 13. Roadmap

Items the system is **planning** to build but has not yet shipped. Each
item includes intent, design sketch, and migration considerations.

### 13.1 Personal notes on videos (NEW — full design)

Users will be able to attach private, free-text notes to any video.
Notes are private to the owner — no other user can read them. They
support creation, edit, and delete.

**Schema.** A new table `video_notes`:

- `user_id` (uuid, FK → users.id cascade) — owner of the note
- `video_id` (uuid, FK → videos.id cascade) — what the note is about
- `body` (text) — the note itself
- `created_at` (timestamp) — when the note was first written
- `updated_at` (timestamp) — when the note was last edited
- `deleted_at` (timestamp, nullable) — soft delete; defaults to null

Primary key is composite `(user_id, video_id)` — one note per (user,
video). If a user wants multiple notes per video in the future, drop
the composite PK and add a `note_id` uuid PK plus a
`(user_id, video_id)` index.

**Server actions.**

- `createNote({ videoId, body })` — body must be 1–5000 chars; inserts
  with `created_at = updated_at = now()`; writes
  `video_note.created` audit entry.
- `updateNote({ videoId, body })` — body must be 1–5000 chars;
  updates `updated_at`; writes `video_note.updated` audit entry with
  `{ from: <truncated old body>, to: <truncated new body> }`.
- `deleteNote({ videoId })` — sets `deleted_at` (soft); writes
  `video_note.deleted` audit entry.

All three are signed-in only. Body is escaped on render to prevent
XSS. Notes are NOT exposed on the public video page or any other
surface.

**UI.** A "Notes" panel on the video page, visible only to the
owner when signed in. Empty state: "Add a private note for yourself."
Editing happens inline (textarea with save / cancel buttons). A new
route `/me/notes` lists all of the user's notes across videos,
sorted by `updated_at DESC`, with a search input.

**Privacy guarantees.**

- Row-level access enforced by `WHERE user_id = <current_user>` in
  every query — never `SELECT *` from `video_notes`.
- Soft-delete prevents accidental loss; a restore flow is not
  exposed today but can be added without schema change.
- The audit log captures who-wrote-what-when for the user's own
  review.

**Migration.**

- New migration `0004_video_notes.sql` — additive, no impact on
  existing rows.
- Add the four new audit action types to the audit-log schema
  reference (see §12, which is updated alongside).

### 13.2 Community segments

Computed, not stored. The query that powers the badge on a user's
profile is a single SQL function that combines:

- Days since signup
- Watch count over the last 30 days
- Approved-submission count
- Total likes received on own videos
- Whether any owned video is sponsored

These heuristics are deliberately simple. They live in the data
layer as a function `getCommunitySegment(userId)` returning one of
`newcomer | browser | regular | power | sponsor | top`. The
leaderboard gets an additional personalised rank.

### 13.3 SNS bounce / complaint handling

When Amazon SES reports a bounce (or Google / any provider reports a
complaint), the user's `email_verified_at` should be set to `null`
and `status` should be `SUSPENDED` until the user re-verifies.

The flow:

1. Add an SNS topic to SES for `bounce` and `complaint` events
2. Subscribe an HTTPS endpoint at `/api/sns` to the topic
3. The endpoint verifies the SNS message signature, parses the
   payload, looks up the user by email, and updates the user record
4. The user is notified by an in-app notification explaining what
   happened and how to fix it

### 13.4 Notifications UI

The data model and writers are in place. The user-facing surface
needs:

- A bell icon in the top nav with an unread count badge
- A `/notifications` route with grouped, paginated list
- Mark-as-read and mark-all-as-read actions
- Email digest option for users who prefer it

### 13.5 Light-mode theme

A parallel palette defined in `tailwind.config.js` under
`theme.extend.colors.light`. Switching is via a `<html data-theme>`
attribute set by a theme toggle. Most work is in component auditing
— making sure every component reads colors via tokens, not literals.

### 13.6 Search improvements

The current search uses Postgres `tsvector` + `ILIKE` on
`title || short_description || description`. The next step is moving
to a dedicated search engine (Meilisearch for self-hosted / Algolia
for managed). The migration is straightforward: a daily sync job that
mirrors videos + tags into the search index, then the `/browse`
query swaps to the search API.

### 13.7 Sponsorship editor

The `sponsorships` table exists; the editor doesn't. The plan:

- On `/admin/videos/[id]`, a "Sponsorship" panel alongside the
  existing admin controls
- Fields: sponsor name, amount (in cents), start date, end date
- Submission auto-sets `videos.is_sponsored = true`
- A "Sponsorships" page at `/admin/sponsorships` listing all active
  sponsorships, sortable by expiry

### 13.8 Comment threading

Today comments are flat. The roadmap introduces 1-level replies
(parent comment + replies). Schema change: add `parent_id` to
`comments`, nullable, self-FK.

### 13.9 Mobile-friendly video detail

The video page is desktop-first. Mobile improvements: sticky action
bar at the bottom of the screen, optimised tag/related-video layout
for narrow viewports.

---

## 14. Performance and ops

### 14.1 Indexes (the ones that matter)

The schema declares **24 indexes** across the 17 tables. The hot ones
for the public site are:

- `videos.published_at` (DESC ordering for the homepage)
- `videos.deleted_at` (filter for the public surface)
- `videos.status` + `videos.published` (the two-part public filter)
- `videos.order` (the homepage hero sort)
- `video_labels.user_id + label` (the library tabs)
- `watch_history.user_id + last_watched_at` (continue-watching)
- `comments.video_id + created_at` (per-video comment list)
- `comments.user_id` (per-user comment history — future)
- `audit_log.entity_type + entity_id` (the admin history panel)
- The `videos` full-text index on `title || short_description ||
  description` (search)

### 14.2 Caching strategy

Pages use Next.js's `revalidate` directive to opt into incremental
static regeneration. The default is `revalidate = 60` on most pages,
which means: a request within 60 seconds of the last regeneration is
served from cache, after which the next request regenerates.

The homepage regenerates more aggressively (also 60s by default)
because it's the primary entry point and the most-trafficked surface.

### 14.3 Build chain

Vercel runs these steps in order on every push to `main`:

1. `npm install` — install dependencies
2. `npm run db:migrate:prod` — apply pending migrations via Drizzle
3. `npm run db:seed` — insert seed data only if videos table is empty
4. `next build` — compile the Next.js app

If any step fails, the deploy is blocked. Migrations are idempotent;
seed is gated on emptiness.

### 14.4 Observability

Three surfaces to watch:

- **Vercel function logs** — every server action logs key events
  (`[email:smtp] sent`, `[audit] video.approve`, etc.)
- **Audit log** — every privileged action is queryable in the admin
  panel
- **Postgres metrics** — slow queries, connection count, vacuum
  status

---

## 15. Glossary

- **opencode** — the open-source AI coding CLI/IDE this site is about.
- **Auth.js (NextAuth.js v5)** — the authentication framework.
- **Drizzle** — the TypeScript ORM and schema-first migration tool.
- **JWT** — JSON Web Token. The session format used here.
- **OAuth** — the protocol the providers use.
- **`prompt=select_account`** — the OAuth flag that forces the
  account chooser every time.
- **STARTTLS** — the SMTP upgrade-to-TLS protocol used on port 587.
- **`tsvector`** — Postgres's full-text-search column type.
- **soft delete** — keeping the row but hiding it from public
  surfaces (via `deleted_at`).
- **denormalised counter** — a column on `videos` that mirrors a
  derived count (e.g. `like_count` reflects the count of rows in
  `video_likes` for that video).
- **server action** — a Next.js server-side function callable from a
  client component via form submission or imperative fetch.
- **edge runtime** — Vercel's lightweight V8 isolate, restricted
  Node.js APIs. Used by middleware for fast auth checks.
- **super admin** — the highest privilege role. Has full control
  including user management and audit log access.

---

## 16. Cross-references

- **README.md** — setup, deploy, environment variables, the
  email-provider walkthrough, the local-dev recipe, the production-
  access request guide
- **CONTRIBUTING.md** — branch workflow, Conventional Commits format,
  PR review checklist, schema-change protocol
- **DESIGN.md** — brand tokens, typography scale, component inventory,
  designer-handoff guide