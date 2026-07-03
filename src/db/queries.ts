import { db } from "@/db";
import {
  videos,
  users,
  tags,
  videoTags,
  comments,
  videoLikes,
  watchlist,
  watchHistory,
  notifications,
  reports,
  auditLog,
  tagSuggestions,
  subscriptions,
  sponsorships,
  videoSeries,
  type Video,
  type User,
} from "@/db/schema";
import { and, desc, eq, sql, inArray, or, ilike, lt } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export async function getUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getUserByUsername(username: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return rows[0] ?? null;
}

export async function getActiveUsers(limit = 50) {
  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.status, "ACTIVE"))
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

export async function updateUserProfile(
  userId: string,
  patch: Partial<Pick<User, "displayName" | "bio" | "username">>,
) {
  return db
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
}

export async function setUserRole(userId: string, role: User["role"]) {
  return db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
}

export async function setUserStatus(userId: string, status: User["status"]) {
  return db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------
export interface VideoListItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  thumbnailUrl: string | null;
  platform: Video["platform"];
  level: Video["level"];
  order: number;
  isSponsored: boolean;
  isFeatured: boolean;
  durationSec: number | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  submitter: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
}

const videoSelectFields = {
  id: videos.id,
  slug: videos.slug,
  title: videos.title,
  shortDescription: videos.shortDescription,
  thumbnailUrl: videos.thumbnailUrl,
  platform: videos.platform,
  level: videos.level,
  order: videos.order,
  isSponsored: videos.isSponsored,
  isFeatured: videos.isFeatured,
  durationSec: videos.durationSec,
  viewCount: videos.viewCount,
  likeCount: videos.likeCount,
  commentCount: videos.commentCount,
  publishedAt: videos.publishedAt,
  createdAt: videos.createdAt,
};

export async function listPublishedVideos(opts: {
  limit?: number;
  offset?: number;
  level?: Video["level"];
  platform?: Video["platform"];
  tagSlug?: string;
  q?: string;
  featured?: boolean;
} = {}): Promise<VideoListItem[]> {
  const { limit = 24, offset = 0, level, platform, tagSlug, q, featured } = opts;

  const whereParts = [eq(videos.status, "APPROVED"), eq(videos.published, true)];
  if (level) whereParts.push(eq(videos.level, level));
  if (platform) whereParts.push(eq(videos.platform, platform));
  if (featured) whereParts.push(eq(videos.isFeatured, true));
  if (q) {
    whereParts.push(
      sql`(${videos.title} ILIKE ${`%${q}%`} OR ${videos.shortDescription} ILIKE ${`%${q}%`})`,
    );
  }

  let query = db
    .select({
      ...videoSelectFields,
      submitterId: users.id,
      submitterUsername: users.username,
      submitterDisplayName: users.displayName,
      submitterAvatarUrl: users.avatarUrl,
    })
    .from(videos)
    .innerJoin(users, eq(users.id, videos.submittedById))
    .where(and(...whereParts))
    .orderBy(videos.order, desc(videos.publishedAt))
    .limit(limit)
    .offset(offset);

  if (tagSlug) {
    const tagRow = await db
      .select()
      .from(tags)
      .where(eq(tags.slug, tagSlug))
      .limit(1);
    if (!tagRow[0]) return [];
    const rows = await db
      .select({ videoId: videoTags.videoId })
      .from(videoTags)
      .where(eq(videoTags.tagId, tagRow[0].id));
    const ids = rows.map((r) => r.videoId);
    if (ids.length === 0) return [];
    query = db
      .select({
        ...videoSelectFields,
        submitterId: users.id,
        submitterUsername: users.username,
        submitterDisplayName: users.displayName,
        submitterAvatarUrl: users.avatarUrl,
      })
      .from(videos)
      .innerJoin(users, eq(users.id, videos.submittedById))
      .where(
        and(
          eq(videos.status, "APPROVED"),
          eq(videos.published, true),
          inArray(videos.id, ids),
        ),
      )
      .orderBy(videos.order, desc(videos.publishedAt))
      .limit(limit)
      .offset(offset);
  }

  const rows = await query;
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    shortDescription: r.shortDescription,
    thumbnailUrl: r.thumbnailUrl,
    platform: r.platform,
    level: r.level,
    order: r.order,
    isSponsored: r.isSponsored,
    isFeatured: r.isFeatured,
    durationSec: r.durationSec,
    viewCount: r.viewCount,
    likeCount: r.likeCount,
    commentCount: r.commentCount,
    publishedAt: r.publishedAt,
    createdAt: r.createdAt,
    submitter: {
      id: r.submitterId,
      username: r.submitterUsername,
      displayName: r.submitterDisplayName,
      avatarUrl: r.submitterAvatarUrl,
    },
  }));
}

export async function getVideoBySlug(slug: string) {
  const rows = await db
    .select()
    .from(videos)
    .where(eq(videos.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getVideoById(id: string) {
  const rows = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getSubmitterForVideo(videoId: string) {
  const row = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
    })
    .from(videos)
    .innerJoin(users, eq(users.id, videos.submittedById))
    .where(eq(videos.id, videoId))
    .limit(1);
  return row[0] ?? null;
}

export async function listRelatedVideos(videoId: string, level: Video["level"]) {
  return listPublishedVideos({ level, limit: 8 });
}

export async function listPendingVideos(limit = 50) {
  return db
    .select({
      id: videos.id,
      slug: videos.slug,
      title: videos.title,
      shortDescription: videos.shortDescription,
      platform: videos.platform,
      level: videos.level,
      createdAt: videos.createdAt,
      submitter: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(videos)
    .innerJoin(users, eq(users.id, videos.submittedById))
    .where(eq(videos.status, "REVIEW"))
    .orderBy(desc(videos.createdAt))
    .limit(limit);
}

export async function incrementVideoViews(videoId: string) {
  await db
    .update(videos)
    .set({ viewCount: sql`${videos.viewCount} + 1` })
    .where(eq(videos.id, videoId));
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------
export async function listTags(limit = 200) {
  return db
    .select()
    .from(tags)
    .orderBy(desc(tags.usageCount), tags.name)
    .limit(limit);
}

export async function getTagsForVideo(videoId: string) {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      category: tags.category,
    })
    .from(videoTags)
    .innerJoin(tags, eq(tags.id, videoTags.tagId))
    .where(eq(videoTags.videoId, videoId));
}

export async function attachTagsToVideo(videoId: string, tagIds: string[]) {
  if (tagIds.length === 0) return;
  await db
    .insert(videoTags)
    .values(tagIds.map((tagId) => ({ videoId, tagId })))
    .onConflictDoNothing();
  await db
    .update(tags)
    .set({ usageCount: sql`${tags.usageCount} + 1` })
    .where(inArray(tags.id, tagIds));
}

export async function createTag(input: {
  name: string;
  slug: string;
  description?: string;
  category?: "TOPIC" | "TOOL" | "LANGUAGE";
  createdById: string;
}) {
  return db
    .insert(tags)
    .values({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      category: input.category ?? "TOPIC",
      createdById: input.createdById,
    })
    .returning();
}

export async function listPendingTagSuggestions() {
  return db
    .select({
      id: tagSuggestions.id,
      name: tagSuggestions.name,
      description: tagSuggestions.description,
      category: tagSuggestions.category,
      status: tagSuggestions.status,
      createdAt: tagSuggestions.createdAt,
      suggestedById: tagSuggestions.suggestedById,
      suggester: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(tagSuggestions)
    .innerJoin(users, eq(users.id, tagSuggestions.suggestedById))
    .where(eq(tagSuggestions.status, "PENDING"))
    .orderBy(desc(tagSuggestions.createdAt));
}

// ---------------------------------------------------------------------------
// Comments (flat)
// ---------------------------------------------------------------------------
export async function listCommentsForVideo(videoId: string, limit = 100) {
  return db
    .select({
      id: comments.id,
      body: comments.body,
      likeCount: comments.likeCount,
      status: comments.status,
      createdAt: comments.createdAt,
      editedAt: comments.editedAt,
      author: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
      },
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .where(
      and(eq(comments.videoId, videoId), eq(comments.status, "VISIBLE")),
    )
    .orderBy(desc(comments.createdAt))
    .limit(limit);
}

export async function createComment(input: {
  videoId: string;
  userId: string;
  body: string;
}) {
  const inserted = await db
    .insert(comments)
    .values({
      videoId: input.videoId,
      userId: input.userId,
      body: input.body,
    })
    .returning();
  await db
    .update(videos)
    .set({ commentCount: sql`${videos.commentCount} + 1` })
    .where(eq(videos.id, input.videoId));
  return inserted[0];
}

export async function softDeleteComment(commentId: string) {
  return db
    .update(comments)
    .set({ status: "DELETED", deletedAt: new Date() })
    .where(eq(comments.id, commentId))
    .returning();
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------
export async function getUserLikeForVideo(
  videoId: string,
  userId: string,
): Promise<"LIKE" | "DISLIKE" | null> {
  const rows = await db
    .select({ value: videoLikes.value })
    .from(videoLikes)
    .where(
      and(eq(videoLikes.videoId, videoId), eq(videoLikes.userId, userId)),
    )
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function setVideoLike(input: {
  videoId: string;
  userId: string;
  value: "LIKE" | "DISLIKE" | null;
}) {
  const { videoId, userId, value } = input;
  const existing = await getUserLikeForVideo(videoId, userId);

  if (value === null) {
    if (!existing) return;
    await db
      .delete(videoLikes)
      .where(
        and(eq(videoLikes.videoId, videoId), eq(videoLikes.userId, userId)),
      );
    if (existing === "LIKE") {
      await db
        .update(videos)
        .set({ likeCount: sql`${videos.likeCount} - 1` })
        .where(eq(videos.id, videoId));
    } else {
      await db
        .update(videos)
        .set({ dislikeCount: sql`${videos.dislikeCount} - 1` })
        .where(eq(videos.id, videoId));
    }
    return;
  }

  if (!existing) {
    await db.insert(videoLikes).values({ videoId, userId, value });
    if (value === "LIKE") {
      await db
        .update(videos)
        .set({ likeCount: sql`${videos.likeCount} + 1` })
        .where(eq(videos.id, videoId));
    } else {
      await db
        .update(videos)
        .set({ dislikeCount: sql`${videos.dislikeCount} + 1` })
        .where(eq(videos.id, videoId));
    }
    return;
  }

  if (existing === value) {
    // Toggle off (same value clicked again)
    await db
      .delete(videoLikes)
      .where(
        and(eq(videoLikes.videoId, videoId), eq(videoLikes.userId, userId)),
      );
    if (value === "LIKE") {
      await db
        .update(videos)
        .set({ likeCount: sql`${videos.likeCount} - 1` })
        .where(eq(videos.id, videoId));
    } else {
      await db
        .update(videos)
        .set({ dislikeCount: sql`${videos.dislikeCount} - 1` })
        .where(eq(videos.id, videoId));
    }
    return;
  }

  // Switch like <-> dislike
  await db
    .update(videoLikes)
    .set({ value, createdAt: new Date() })
    .where(
      and(eq(videoLikes.videoId, videoId), eq(videoLikes.userId, userId)),
    );
  if (value === "LIKE") {
    await db
      .update(videos)
      .set({
        likeCount: sql`${videos.likeCount} + 1`,
        dislikeCount: sql`${videos.dislikeCount} - 1`,
      })
      .where(eq(videos.id, videoId));
  } else {
    await db
      .update(videos)
      .set({
        likeCount: sql`${videos.likeCount} - 1`,
        dislikeCount: sql`${videos.dislikeCount} + 1`,
      })
      .where(eq(videos.id, videoId));
  }
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------
export async function addToWatchlist(userId: string, videoId: string) {
  await db
    .insert(watchlist)
    .values({ userId, videoId })
    .onConflictDoNothing();
}

export async function removeFromWatchlist(userId: string, videoId: string) {
  await db
    .delete(watchlist)
    .where(
      and(eq(watchlist.userId, userId), eq(watchlist.videoId, videoId)),
    );
}

export async function listWatchlist(userId: string) {
  const rows = await db
    .select({
      addedAt: watchlist.addedAt,
      videoId: videos.id,
      slug: videos.slug,
      title: videos.title,
      shortDescription: videos.shortDescription,
      thumbnailUrl: videos.thumbnailUrl,
      platform: videos.platform,
      level: videos.level,
      order: videos.order,
      isSponsored: videos.isSponsored,
      isFeatured: videos.isFeatured,
      durationSec: videos.durationSec,
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      commentCount: videos.commentCount,
      publishedAt: videos.publishedAt,
      createdAt: videos.createdAt,
      submitterId: users.id,
      submitterUsername: users.username,
      submitterDisplayName: users.displayName,
      submitterAvatarUrl: users.avatarUrl,
    })
    .from(watchlist)
    .innerJoin(videos, eq(videos.id, watchlist.videoId))
    .innerJoin(users, eq(users.id, videos.submittedById))
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.addedAt));

  return rows.map((r) => ({
    addedAt: r.addedAt,
    video: {
      id: r.videoId,
      slug: r.slug,
      title: r.title,
      shortDescription: r.shortDescription,
      thumbnailUrl: r.thumbnailUrl,
      platform: r.platform,
      level: r.level,
      order: r.order,
      isSponsored: r.isSponsored,
      isFeatured: r.isFeatured,
      durationSec: r.durationSec,
      viewCount: r.viewCount,
      likeCount: r.likeCount,
      commentCount: r.commentCount,
      publishedAt: r.publishedAt,
      createdAt: r.createdAt,
      submitter: {
        id: r.submitterId,
        username: r.submitterUsername,
        displayName: r.submitterDisplayName,
        avatarUrl: r.submitterAvatarUrl,
      },
    },
  }));
}

export async function isInWatchlist(userId: string, videoId: string) {
  const rows = await db
    .select()
    .from(watchlist)
    .where(
      and(eq(watchlist.userId, userId), eq(watchlist.videoId, videoId)),
    )
    .limit(1);
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Watch history (continue watching)
// ---------------------------------------------------------------------------
export async function upsertWatchProgress(input: {
  userId: string;
  videoId: string;
  watchedSeconds: number;
  totalDurationSec?: number;
}) {
  const completed =
    input.totalDurationSec && input.totalDurationSec > 0
      ? input.watchedSeconds / input.totalDurationSec >= 0.9
      : false;
  await db
    .insert(watchHistory)
    .values({
      userId: input.userId,
      videoId: input.videoId,
      watchedSeconds: input.watchedSeconds,
      totalDurationSec: input.totalDurationSec ?? 0,
      completed,
      lastWatchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [watchHistory.userId, watchHistory.videoId],
      set: {
        watchedSeconds: input.watchedSeconds,
        totalDurationSec: input.totalDurationSec ?? 0,
        completed,
        lastWatchedAt: new Date(),
      },
    });
}

export async function listContinueWatching(userId: string, limit = 12) {
  const rows = await db
    .select({
      watchedSeconds: watchHistory.watchedSeconds,
      totalDurationSec: watchHistory.totalDurationSec,
      completed: watchHistory.completed,
      lastWatchedAt: watchHistory.lastWatchedAt,
      videoId: videos.id,
      slug: videos.slug,
      title: videos.title,
      shortDescription: videos.shortDescription,
      thumbnailUrl: videos.thumbnailUrl,
      platform: videos.platform,
      level: videos.level,
      order: videos.order,
      isSponsored: videos.isSponsored,
      isFeatured: videos.isFeatured,
      durationSec: videos.durationSec,
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      commentCount: videos.commentCount,
      publishedAt: videos.publishedAt,
      createdAt: videos.createdAt,
      submitterId: users.id,
      submitterUsername: users.username,
      submitterDisplayName: users.displayName,
      submitterAvatarUrl: users.avatarUrl,
    })
    .from(watchHistory)
    .innerJoin(videos, eq(videos.id, watchHistory.videoId))
    .innerJoin(users, eq(users.id, videos.submittedById))
    .where(
      and(eq(watchHistory.userId, userId), eq(watchHistory.completed, false)),
    )
    .orderBy(desc(watchHistory.lastWatchedAt))
    .limit(limit);

  return rows.map((r) => ({
    watchedSeconds: r.watchedSeconds,
    totalDurationSec: r.totalDurationSec,
    completed: r.completed,
    lastWatchedAt: r.lastWatchedAt,
    video: {
      id: r.videoId,
      slug: r.slug,
      title: r.title,
      shortDescription: r.shortDescription,
      thumbnailUrl: r.thumbnailUrl,
      platform: r.platform,
      level: r.level,
      order: r.order,
      isSponsored: r.isSponsored,
      isFeatured: r.isFeatured,
      durationSec: r.durationSec,
      viewCount: r.viewCount,
      likeCount: r.likeCount,
      commentCount: r.commentCount,
      publishedAt: r.publishedAt,
      createdAt: r.createdAt,
      submitter: {
        id: r.submitterId,
        username: r.submitterUsername,
        displayName: r.submitterDisplayName,
        avatarUrl: r.submitterAvatarUrl,
      },
    },
  }));
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export async function listUnreadNotifications(userId: string, limit = 25) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: string, userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.id, id), eq(notifications.userId, userId)),
    );
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export async function createReport(input: {
  reporterId: string;
  targetType: "VIDEO" | "COMMENT" | "USER";
  targetId: string;
  reason: string;
}) {
  await db.insert(reports).values(input);
  if (input.targetType === "VIDEO") {
    await db
      .update(videos)
      .set({ reportCount: sql`${videos.reportCount} + 1` })
      .where(eq(videos.id, input.targetId));
  }
}

export async function listOpenReports(limit = 50) {
  return db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      status: reports.status,
      createdAt: reports.createdAt,
      reporter: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
      },
    })
    .from(reports)
    .innerJoin(users, eq(users.id, reports.reporterId))
    .where(eq(reports.status, "OPEN"))
    .orderBy(desc(reports.createdAt))
    .limit(limit);
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------
export async function writeAudit(input: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  diff?: unknown;
  ip?: string | null;
}) {
  await db.insert(auditLog).values({
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    diff: input.diff as object | null,
    ip: input.ip ?? null,
  });
}

export async function listAudit(limit = 50) {
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      diff: auditLog.diff,
      ip: auditLog.ip,
      createdAt: auditLog.createdAt,
      actor: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
      },
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

// ---------------------------------------------------------------------------
// Stats / leaderboard
// ---------------------------------------------------------------------------
export interface ActiveUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  videosApproved: number;
  commentsCount: number;
  likesReceived: number;
  helpfulScore: number;
}

export async function mostActiveUsers(limit = 25): Promise<ActiveUser[]> {
  // Composite activity score: videos*3 + comments + likesReceived/2
  const videoAgg = db
    .select({
      userId: videos.submittedById,
      videosApproved: sql<number>`count(*)::int`.as("videos_approved"),
    })
    .from(videos)
    .where(
      and(eq(videos.status, "APPROVED"), eq(videos.published, true)),
    )
    .groupBy(videos.submittedById)
    .as("va");

  const commentAgg = db
    .select({
      userId: comments.userId,
      commentsCount: sql<number>`count(*)::int`.as("comments_count"),
    })
    .from(comments)
    .where(eq(comments.status, "VISIBLE"))
    .groupBy(comments.userId)
    .as("ca");

  const likesAgg = db
    .select({
      userId: videoLikes.userId,
      likesGiven: sql<number>`count(*)::int`.as("likes_given"),
    })
    .from(videoLikes)
    .where(eq(videoLikes.value, "LIKE"))
    .groupBy(videoLikes.userId)
    .as("la");

  const received = db
    .select({
      submitterId: videos.submittedById,
      likesReceived: sql<number>`coalesce(sum(${videos.likeCount}), 0)::int`.as(
        "likes_received",
      ),
    })
    .from(videos)
    .where(
      and(eq(videos.status, "APPROVED"), eq(videos.published, true)),
    )
    .groupBy(videos.submittedById)
    .as("ra");

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      videosApproved: sql<number>`coalesce(${videoAgg.videosApproved}, 0)`.as(
        "v",
      ),
      commentsCount: sql<number>`coalesce(${commentAgg.commentsCount}, 0)`.as(
        "c",
      ),
      likesReceived: sql<number>`coalesce(${received.likesReceived}, 0)`.as(
        "r",
      ),
    })
    .from(users)
    .leftJoin(videoAgg, eq(videoAgg.userId, users.id))
    .leftJoin(commentAgg, eq(commentAgg.userId, users.id))
    .leftJoin(likesAgg, eq(likesAgg.userId, users.id))
    .leftJoin(received, eq(received.submitterId, users.id))
    .where(eq(users.status, "ACTIVE"))
    .orderBy(
      desc(
        sql`(coalesce(${videoAgg.videosApproved}, 0) * 3 + coalesce(${commentAgg.commentsCount}, 0) + coalesce(${received.likesReceived}, 0))`,
      ),
    )
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    helpfulScore: r.likesReceived + r.commentsCount * 2,
  }));
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------
export async function subscribe(input: {
  followerId: string;
  targetType: "USER" | "TAG";
  targetId: string;
}) {
  await db.insert(subscriptions).values(input).onConflictDoNothing();
}

export async function unsubscribe(input: {
  followerId: string;
  targetType: "USER" | "TAG";
  targetId: string;
}) {
  await db
    .delete(subscriptions)
    .where(
      and(
        eq(subscriptions.followerId, input.followerId),
        eq(subscriptions.targetType, input.targetType),
        eq(subscriptions.targetId, input.targetId),
      ),
    );
}

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------
export async function listSeries() {
  return db
    .select()
    .from(videoSeries)
    .orderBy(desc(videoSeries.createdAt));
}

// ---------------------------------------------------------------------------
// Sponsorships
// ---------------------------------------------------------------------------
export async function createSponsorship(input: {
  videoId: string;
  sponsorName: string;
  amountCents?: number;
  expiresAt?: Date | null;
}) {
  return db
    .insert(sponsorships)
    .values({
      videoId: input.videoId,
      sponsorName: input.sponsorName,
      amountCents: input.amountCents ?? 0,
      expiresAt: input.expiresAt ?? null,
    })
    .returning();
}