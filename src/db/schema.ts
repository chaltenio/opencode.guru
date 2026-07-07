import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", [
  "SUPER_ADMIN",
  "MODERATOR",
  "USER",
]);

export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "SUSPENDED",
  "BANNED",
]);

export const providerEnum = pgEnum("oauth_provider", ["GITHUB", "GOOGLE"]);

export const videoPlatformEnum = pgEnum("video_platform", [
  "YOUTUBE",
  "VIMEO",
  "TWITCH",
  "OTHER",
]);

export const videoLevelEnum = pgEnum("video_level", [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
]);

export const videoStatusEnum = pgEnum("video_status", [
  "REVIEW",
  "APPROVED",
  "REJECTED",
]);

export const videoUserLabelEnum = pgEnum("video_user_label", [
  "TO_WATCH",
  "WATCHED",
  "TO_REWATCH",
]);

/**
 * Five most common spoken languages for video tutorials. English is the
 * default; the site admin can extend this enum later if needed.
 */
export const videoLanguageEnum = pgEnum("video_language", [
  "EN",
  "ES",
  "PT",
  "HI",
  "ZH",
]);

export const commentStatusEnum = pgEnum("comment_status", [
  "VISIBLE",
  "HIDDEN",
  "DELETED",
]);

export const likeValueEnum = pgEnum("like_value", ["LIKE", "DISLIKE"]);

export const tagCategoryEnum = pgEnum("tag_category", [
  "TOPIC",
  "TOOL",
  "LANGUAGE",
]);

export const tagSuggestionStatusEnum = pgEnum("tag_suggestion_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const subscriptionTargetEnum = pgEnum("subscription_target", [
  "USER",
  "TAG",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "VIDEO_APPROVED",
  "VIDEO_REJECTED",
  "NEW_COMMENT",
  "NEW_REPLY",
  "NEW_VIDEO_FROM_SUBSCRIPTION",
  "VIDEO_REPORTED",
]);

export const reportTargetEnum = pgEnum("report_target", [
  "VIDEO",
  "COMMENT",
  "USER",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "OPEN",
  "RESOLVED",
  "DISMISSED",
]);

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    username: varchar("username", { length: 32 }).notNull(),
    displayName: varchar("display_name", { length: 80 }),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    role: userRoleEnum("role").notNull().default("USER"),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    // ---- social handles (per user; opt-in) ----
    githubUsername: varchar("github_username", { length: 64 }),
    youtubeHandle: varchar("youtube_handle", { length: 64 }),
    twitchUsername: varchar("twitch_username", { length: 64 }),
    vimeoUsername: varchar("vimeo_username", { length: 64 }),
    linkedinSlug: varchar("linkedin_slug", { length: 128 }),
    xHandle: varchar("x_handle", { length: 64 }),

    // ---- email change (double verification) ----
    // When the user requests a change, we set pendingEmail + generate a
    // emailChangeToken + emailChangeExpiresAt. They must click the link
    // sent to the NEW address before the swap is committed.
    pendingEmail: text("pending_email"),
    emailChangeToken: text("email_change_token"),
    emailChangeExpiresAt: timestamp("email_change_expires_at", {
      withTimezone: true,
    }),
  },
  (t) => ({
    emailUq: uniqueIndex("users_email_uq").on(t.email),
    pendingEmailUq: uniqueIndex("users_pending_email_uq").on(t.pendingEmail),
    usernameUq: uniqueIndex("users_username_uq").on(t.username),
    roleIdx: index("users_role_idx").on(t.role),
    emailChangeTokenIdx: index("users_email_change_token_idx").on(
      t.emailChangeToken,
    ),
  }),
);

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    provider: providerEnum("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerUserId] }),
    userIdx: index("oauth_user_idx").on(t.userId),
  }),
);

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------
export const videoSeries = pgTable("video_series", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull(),
  description: text("description"),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    shortDescription: varchar("short_description", { length: 150 }).notNull(),
    description: text("description").notNull().default(""),
    externalUrl: text("external_url").notNull(),
    platform: videoPlatformEnum("platform").notNull(),
    platformVideoId: varchar("platform_video_id", { length: 64 }),
    thumbnailUrl: text("thumbnail_url"),
    durationSec: integer("duration_sec"),
    level: videoLevelEnum("level").notNull(),
    order: integer("order").notNull().default(10),
    isSponsored: boolean("is_sponsored").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    status: videoStatusEnum("status").notNull().default("REVIEW"),
    published: boolean("published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    unpublishedAt: timestamp("unpublished_at", { withTimezone: true }),
    submittedById: uuid("submitted_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reviewedById: uuid("reviewed_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    language: videoLanguageEnum("language").notNull().default("EN"),
    seriesId: uuid("series_id").references(() => videoSeries.id, {
      onDelete: "set null",
    }),
    viewCount: integer("view_count").notNull().default(0),
    likeCount: integer("like_count").notNull().default(0),
    dislikeCount: integer("dislike_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    reportCount: integer("report_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Soft delete
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedById: uuid("deleted_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => ({
    slugUq: uniqueIndex("videos_slug_uq").on(t.slug),
    publishedAtIdx: index("videos_published_at_idx").on(t.publishedAt),
    deletedAtIdx: index("videos_deleted_at_idx").on(t.deletedAt),
    statusIdx: index("videos_status_idx").on(t.status),
    publishedIdx: index("videos_published_idx").on(t.published),
    orderIdx: index("videos_order_idx").on(t.order),
    levelIdx: index("videos_level_idx").on(t.level),
    seriesIdx: index("videos_series_idx").on(t.seriesId),
    fullSearchIdx: index("videos_search_idx").using(
      "gin",
      sql`to_tsvector('english', ${t.title} || ' ' || ${t.shortDescription} || ' ' || ${t.description})`,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 60 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    description: text("description"),
    category: tagCategoryEnum("category").notNull().default("TOPIC"),
    usageCount: integer("usage_count").notNull().default(0),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    nameUq: uniqueIndex("tags_name_uq").on(t.name),
    slugUq: uniqueIndex("tags_slug_uq").on(t.slug),
  }),
);

export const videoTags = pgTable(
  "video_tags",
  {
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.videoId, t.tagId] }),
    tagIdx: index("video_tags_tag_idx").on(t.tagId),
  }),
);

export const tagSuggestions = pgTable("tag_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 60 }).notNull(),
  category: tagCategoryEnum("category").notNull().default("TOPIC"),
  description: text("description"),
  suggestedById: uuid("suggested_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: tagSuggestionStatusEnum("status").notNull().default("PENDING"),
  resolvedById: uuid("resolved_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Comments (flat — no parentId)
// ---------------------------------------------------------------------------
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: commentStatusEnum("status").notNull().default("VISIBLE"),
    likeCount: integer("like_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    videoIdx: index("comments_video_idx").on(t.videoId),
    userIdx: index("comments_user_idx").on(t.userId),
    createdIdx: index("comments_created_idx").on(t.createdAt),
  }),
);

export const commentLikes = pgTable(
  "comment_likes",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.commentId, t.userId] }),
    userIdx: index("comment_likes_user_idx").on(t.userId),
  }),
);

// ---------------------------------------------------------------------------
// Likes (binary like/dislike on a video)
// ---------------------------------------------------------------------------
export const videoLikes = pgTable(
  "video_likes",
  {
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: likeValueEnum("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.videoId, t.userId] }),
    userIdx: index("video_likes_user_idx").on(t.userId),
  }),
);

// ---------------------------------------------------------------------------
// Watchlist + Watch history (continue watching)
// ---------------------------------------------------------------------------
export const watchlist = pgTable(
  "watchlist",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.videoId] }),
    userIdx: index("watchlist_user_idx").on(t.userId),
  }),
);

/**
 * Per-user labels for videos. Each user can label a video as:
 *   - TO_WATCH    : "I want to watch this" (saved for later)
 *   - WATCHED     : "I have already watched this"
 *   - TO_REWATCH  : "I want to see this again"
 *
 * One label per (user, video). Distinct from `watchlist` (which is a save /
 * bookmark concept) and `watchHistory` (which tracks progress).
 */
export const videoLabels = pgTable(
  "video_labels",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    label: videoUserLabelEnum("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.videoId] }),
    userLabelIdx: index("video_labels_user_label_idx").on(t.userId, t.label),
    videoIdx: index("video_labels_video_idx").on(t.videoId),
  }),
);

export const watchHistory = pgTable(
  "watch_history",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    watchedSeconds: integer("watched_seconds").notNull().default(0),
    totalDurationSec: integer("total_duration_sec").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    lastWatchedAt: timestamp("last_watched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.videoId] }),
    userLastIdx: index("watch_history_user_last_idx").on(
      t.userId,
      t.lastWatchedAt,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Subscriptions (follow user or tag)
// ---------------------------------------------------------------------------
export const subscriptions = pgTable(
  "subscriptions",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: subscriptionTargetEnum("target_type").notNull(),
    // For USER we store users.id; for TAG we store tags.id
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.followerId, t.targetType, t.targetId] }),
    targetIdx: index("subscriptions_target_idx").on(t.targetType, t.targetId),
  }),
);

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userUnreadIdx: index("notifications_user_unread_idx").on(
      t.userId,
      t.readAt,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Reports (abuse)
// ---------------------------------------------------------------------------
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: reportTargetEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    status: reportStatusEnum("status").notNull().default("OPEN"),
    resolvedById: uuid("resolved_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    targetIdx: index("reports_target_idx").on(t.targetType, t.targetId),
    statusIdx: index("reports_status_idx").on(t.status),
  }),
);

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    entityId: uuid("entity_id"),
    diff: jsonb("diff"),
    ip: varchar("ip", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    actorIdx: index("audit_actor_idx").on(t.actorId),
    entityIdx: index("audit_entity_idx").on(t.entityType, t.entityId),
    createdIdx: index("audit_created_idx").on(t.createdAt),
  }),
);

// ---------------------------------------------------------------------------
// Sponsorships (sponsored videos metadata)
// ---------------------------------------------------------------------------
export const sponsorships = pgTable("sponsorships", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: uuid("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  sponsorName: varchar("sponsor_name", { length: 120 }).notNull(),
  amountCents: integer("amount_cents").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos, { relationName: "submittedVideos" }),
  comments: many(comments),
  watchlist: many(watchlist),
  history: many(watchHistory),
  videoLikes: many(videoLikes),
  subscriptions: many(subscriptions, { relationName: "follower" }),
  notifications: many(notifications),
  reports: many(reports, { relationName: "reporter" }),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  submittedBy: one(users, {
    fields: [videos.submittedById],
    references: [users.id],
    relationName: "submittedVideos",
  }),
  reviewedBy: one(users, {
    fields: [videos.reviewedById],
    references: [users.id],
  }),
  series: one(videoSeries, {
    fields: [videos.seriesId],
    references: [videoSeries.id],
  }),
  tags: many(videoTags),
  comments: many(comments),
  likes: many(videoLikes),
  watchlistEntries: many(watchlist),
  historyEntries: many(watchHistory),
  sponsorship: many(sponsorships),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  videos: many(videoTags),
}));

export const videoTagsRelations = relations(videoTags, ({ one }) => ({
  video: one(videos, {
    fields: [videoTags.videoId],
    references: [videos.id],
  }),
  tag: one(tags, {
    fields: [videoTags.tagId],
    references: [tags.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  video: one(videos, {
    fields: [comments.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  likes: many(commentLikes),
}));

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type VideoLike = typeof videoLikes.$inferSelect;
export type NewVideoLike = typeof videoLikes.$inferInsert;
export type WatchHistoryRow = typeof watchHistory.$inferSelect;
export type VideoLabel = typeof videoLabels.$inferSelect;
export type NewVideoLabel = typeof videoLabels.$inferInsert;
export type VideoUserLabel = (typeof videoUserLabelEnum.enumValues)[number];
export type VideoLanguage = (typeof videoLanguageEnum.enumValues)[number];
export type Notification = typeof notifications.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type VideoPlatform = (typeof videoPlatformEnum.enumValues)[number];
export type VideoLevel = (typeof videoLevelEnum.enumValues)[number];
export type VideoStatus = (typeof videoStatusEnum.enumValues)[number];