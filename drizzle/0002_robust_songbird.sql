CREATE TYPE "public"."video_language" AS ENUM('EN', 'ES', 'PT', 'HI', 'ZH');--> statement-breakpoint
-- Convert existing 'en' (lowercase) values to 'EN' enum. Any value not in
-- the new enum defaults to 'EN'.
ALTER TABLE "videos"
  ALTER COLUMN "language" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "videos"
  ALTER COLUMN "language" SET DATA TYPE video_language
  USING (
    CASE upper(language)
      WHEN 'EN' THEN 'EN'::video_language
      WHEN 'ES' THEN 'ES'::video_language
      WHEN 'PT' THEN 'PT'::video_language
      WHEN 'HI' THEN 'HI'::video_language
      WHEN 'ZH' THEN 'ZH'::video_language
      ELSE 'EN'::video_language
    END
  );--> statement-breakpoint
ALTER TABLE "videos" ALTER COLUMN "language" SET DEFAULT 'EN';--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "deleted_by_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "videos" ADD CONSTRAINT "videos_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "videos_deleted_at_idx" ON "videos" USING btree ("deleted_at");