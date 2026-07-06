CREATE TYPE "public"."video_user_label" AS ENUM('TO_WATCH', 'WATCHED', 'TO_REWATCH');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_labels" (
	"user_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"label" "video_user_label" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_labels_user_id_video_id_pk" PRIMARY KEY("user_id","video_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "video_labels" ADD CONSTRAINT "video_labels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "video_labels" ADD CONSTRAINT "video_labels_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_labels_user_label_idx" ON "video_labels" USING btree ("user_id","label");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_labels_video_idx" ON "video_labels" USING btree ("video_id");