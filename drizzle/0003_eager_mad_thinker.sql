ALTER TABLE "users" ADD COLUMN "github_username" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "youtube_handle" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "twitch_username" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "vimeo_username" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "linkedin_slug" varchar(128);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "x_handle" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pending_email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_change_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_change_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_pending_email_uq" ON "users" USING btree ("pending_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_change_token_idx" ON "users" USING btree ("email_change_token");