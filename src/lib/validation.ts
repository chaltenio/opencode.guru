import { z } from "zod";

export const shortDescSchema = z
  .string()
  .trim()
  .min(10, "Add a bit more detail (min 10 chars)")
  .max(150, "Short description must be 150 characters or fewer");

export const titleSchema = z
  .string()
  .trim()
  .min(3, "Title is too short")
  .max(200, "Title is too long");

export const urlSchema = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .max(500);

export const levelSchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);

export const tagNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-zA-Z0-9 .-]+$/, "Use letters, numbers, spaces, dashes, dots");

/** Top-5 supported spoken languages for tutorials. English is the default. */
export const SUPPORTED_LANGUAGES = ["EN", "ES", "PT", "HI", "ZH"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const languageSchema = z.enum(SUPPORTED_LANGUAGES);

export const commentBodySchema = z
  .string()
  .trim()
  .min(2, "Comment is too short")
  .max(2000, "Comment is too long");

export const submitVideoSchema = z.object({
  title: titleSchema,
  shortDescription: shortDescSchema,
  description: z.string().trim().max(20000).default(""),
  externalUrl: urlSchema,
  level: levelSchema,
  language: languageSchema.default("EN"),
  tagIds: z.array(z.string().uuid()).max(20).default([]),
  seriesId: z.string().uuid().optional().nullable(),
});

export type SubmitVideoInput = z.infer<typeof submitVideoSchema>;

export const reviewDecisionSchema = z.object({
  videoId: z.string().uuid(),
  decision: z.enum(["APPROVE", "REJECT"]),
  publish: z.boolean().default(true),
  rejectionReason: z.string().trim().max(1000).optional(),
});

export const updateVideoOrderSchema = z.object({
  videoId: z.string().uuid(),
  order: z.number().int().min(1).max(10),
  isSponsored: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const tagSchema = z.object({
  name: tagNameSchema,
  description: z.string().trim().max(500).optional().default(""),
  category: z.enum(["TOPIC", "TOOL", "LANGUAGE"]).default("TOPIC"),
});

export const commentSchema = z.object({
  videoId: z.string().uuid(),
  body: commentBodySchema,
});

export const likeSchema = z.object({
  videoId: z.string().uuid(),
  value: z.enum(["LIKE", "DISLIKE", "NONE"]),
});

export const reportSchema = z.object({
  targetType: z.enum(["VIDEO", "COMMENT", "USER"]),
  targetId: z.string().uuid(),
  reason: z.string().trim().min(10).max(1000),
});

export const profileSchema = z.object({
  displayName: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_-]+$/i, "Use letters, numbers, dashes, underscores")
    .optional(),
});

export const watchProgressSchema = z.object({
  videoId: z.string().uuid(),
  watchedSeconds: z.number().int().min(0).max(86400),
  totalDurationSec: z.number().int().min(0).max(86400).optional(),
});

export const videoLabelSchema = z.object({
  videoId: z.string().uuid(),
  // "NONE" clears the label; otherwise set the new label.
  label: z.enum(["TO_WATCH", "WATCHED", "TO_REWATCH", "NONE"]),
});

export const deleteVideoSchema = z.object({
  videoId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

/** Admin: change a video's level (also bumps updatedAt). */
export const updateVideoLevelSchema = z.object({
  videoId: z.string().uuid(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
});

/** Admin: unpublish a video (sets published=false, unpublishedAt=now). */
export const unpublishVideoSchema = z.object({
  videoId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

/** User: update their own social handles (all optional, max 64/128). */
export const HANDLE_REGEX = /^[a-zA-Z0-9._-]+$/;

export const socialProfileSchema = z.object({
  githubUsername: z
    .string()
    .trim()
    .max(64)
    .regex(HANDLE_REGEX, "Use letters, numbers, dots, dashes, underscores")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  youtubeHandle: z
    .string()
    .trim()
    .max(64)
    .regex(HANDLE_REGEX, "Use letters, numbers, dots, dashes, underscores")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  twitchUsername: z
    .string()
    .trim()
    .max(64)
    .regex(HANDLE_REGEX, "Use letters, numbers, dots, dashes, underscores")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  vimeoUsername: z
    .string()
    .trim()
    .max(64)
    .regex(HANDLE_REGEX, "Use letters, numbers, dots, dashes, underscores")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  xHandle: z
    .string()
    .trim()
    .max(64)
    .regex(HANDLE_REGEX, "Use letters, numbers, dots, dashes, underscores")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  linkedinSlug: z
    .string()
    .trim()
    .max(128)
    .regex(HANDLE_REGEX, "Use letters, numbers, dots, dashes, underscores")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  bio: z.string().trim().max(500).optional(),
  displayName: z.string().trim().max(80).optional(),
});

/** User: request email change. We send a confirmation link to the NEW email. */
export const requestEmailChangeSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email("Must be a valid email"),
  confirmEmail: z.string().trim().toLowerCase().email("Must be a valid email"),
});