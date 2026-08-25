CREATE TABLE "question" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"body" text NOT NULL,
	"asked_name" text NOT NULL,
	"asked_phone" text NOT NULL,
	"answer" text,
	"answered_by" text,
	"answered_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"author_name" text NOT NULL,
	"author_phone" text NOT NULL,
	"is_verified" text DEFAULT 'no' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reply" text,
	"replied_by" text,
	"replied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_answered_by_admin_user_id_fk" FOREIGN KEY ("answered_by") REFERENCES "public"."admin_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_replied_by_admin_user_id_fk" FOREIGN KEY ("replied_by") REFERENCES "public"."admin_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "question_product_idx" ON "question" USING btree ("product_id","status","created_at");--> statement-breakpoint
CREATE INDEX "review_product_idx" ON "review" USING btree ("product_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "review_product_phone_idx" ON "review" USING btree ("product_id","author_phone");