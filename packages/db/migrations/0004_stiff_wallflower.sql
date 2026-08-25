CREATE TABLE "coupon" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"min_subtotal_minor" integer DEFAULT 0 NOT NULL,
	"max_discount_minor" integer,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"per_customer_limit" integer DEFAULT 1 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_redemption" (
	"id" text PRIMARY KEY NOT NULL,
	"coupon_id" text NOT NULL,
	"order_id" text NOT NULL,
	"phone_e164" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart" ADD COLUMN "phone_e164" text;--> statement-breakpoint
ALTER TABLE "cart" ADD COLUMN "recovered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_coupon_id_coupon_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_code_idx" ON "coupon" USING btree ("code");--> statement-breakpoint
CREATE INDEX "coupon_active_idx" ON "coupon" USING btree ("is_active","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "redemption_order_idx" ON "coupon_redemption" USING btree ("coupon_id","order_id");--> statement-breakpoint
CREATE INDEX "redemption_phone_idx" ON "coupon_redemption" USING btree ("coupon_id","phone_e164");--> statement-breakpoint
CREATE INDEX "cart_abandoned_idx" ON "cart" USING btree ("status","recovered_at","updated_at");