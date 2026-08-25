CREATE TABLE "banner" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slot" text NOT NULL,
	"media_id" text,
	"mobile_media_id" text,
	"href" text,
	"alt" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "block" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"type" text NOT NULL,
	"props" jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_item" (
	"id" text PRIMARY KEY NOT NULL,
	"menu" text DEFAULT 'main' NOT NULL,
	"parent_id" text,
	"label" text NOT NULL,
	"href" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_home" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"unpublish_at" timestamp with time zone,
	"meta_title" text,
	"meta_description" text,
	"og_image_id" text,
	"theme_override" text,
	"pixel_id" text,
	"preview_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "banner" ADD CONSTRAINT "banner_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banner" ADD CONSTRAINT "banner_mobile_media_id_media_id_fk" FOREIGN KEY ("mobile_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_page_id_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "banner_slot_idx" ON "banner" USING btree ("slot","is_active","sort");--> statement-breakpoint
CREATE INDEX "block_page_idx" ON "block" USING btree ("page_id","sort");--> statement-breakpoint
CREATE INDEX "menu_item_idx" ON "menu_item" USING btree ("menu","parent_id","sort");--> statement-breakpoint
CREATE UNIQUE INDEX "page_slug_idx" ON "page" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "page_status_idx" ON "page" USING btree ("status","published_at");