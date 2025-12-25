CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"youtube_url" text,
	"youtube_video_id" text,
	"transcript" text,
	"language" text,
	"status" text DEFAULT 'processing',
	"progress" integer DEFAULT 0,
	"status_description" text DEFAULT 'Queued',
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lemon_squeezy_id" text NOT NULL,
	"status" text NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timestamps" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"time_seconds" integer NOT NULL,
	"time_formatted" text NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image_url" text,
	"subscription_plan" text DEFAULT 'Free',
	"subscription_status" text DEFAULT 'active',
	"subscription_id" text,
	"minutes_used" integer DEFAULT 0,
	"minutes_limit" integer DEFAULT 60,
	"addon_minutes" integer DEFAULT 0,
	"billing_cycle_start" timestamp DEFAULT now(),
	"billing_cycle_end" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timestamps" ADD CONSTRAINT "timestamps_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_id_idx" ON "timestamps" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "clerk_id_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "subscription_plan_idx" ON "users" USING btree ("subscription_plan");