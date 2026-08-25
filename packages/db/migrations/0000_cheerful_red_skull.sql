CREATE TABLE "admin_user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"phone_e164" text NOT NULL,
	"name" text,
	"email" text,
	"is_blacklisted" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp" (
	"phone_e164" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_type" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"meta" jsonb,
	"ip" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"payload" jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"processed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "setting" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"store_name" text DEFAULT 'Fajr Shop' NOT NULL,
	"logo_media_id" text,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"country" text DEFAULT 'BD' NOT NULL,
	"default_locale" text DEFAULT 'bn' NOT NULL,
	"timezone" text DEFAULT 'Asia/Dhaka' NOT NULL,
	"support_phone" text,
	"support_email" text,
	"vat_registered" boolean DEFAULT false NOT NULL,
	"vat_bin" text,
	"vat_rate_bp" integer DEFAULT 0 NOT NULL,
	"vat_inclusive_pricing" boolean DEFAULT false NOT NULL,
	"theme" text DEFAULT 'fashion' NOT NULL,
	"setup_step" text DEFAULT 'store',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo_media_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"path" text NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_media_id" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_media_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_product" (
	"collection_id" text NOT NULL,
	"product_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "collection_product_collection_id_product_id_pk" PRIMARY KEY("collection_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "option" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_value" (
	"id" text PRIMARY KEY NOT NULL,
	"option_id" text NOT NULL,
	"value" text NOT NULL,
	"swatch_hex" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"summary" text,
	"brand_id" text,
	"category_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"meta_title" text,
	"meta_description" text,
	"source" text,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"product_id" text NOT NULL,
	"media_id" text NOT NULL,
	"variant_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_media_product_id_media_id_pk" PRIMARY KEY("product_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "redirect" (
	"id" text PRIMARY KEY NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variant" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"sku" text,
	"barcode" text,
	"price_minor" integer NOT NULL,
	"compare_at_minor" integer,
	"cost_minor" integer,
	"stock_on_hand" integer DEFAULT 0 NOT NULL,
	"stock_reserved" integer DEFAULT 0 NOT NULL,
	"allow_backorder" boolean DEFAULT false NOT NULL,
	"weight_grams" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"source" text,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variant_option_value" (
	"variant_id" text NOT NULL,
	"option_value_id" text NOT NULL,
	CONSTRAINT "variant_option_value_variant_id_option_value_id_pk" PRIMARY KEY("variant_id","option_value_id")
);
--> statement-breakpoint
CREATE TABLE "address" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text,
	"name" text NOT NULL,
	"phone_e164" text NOT NULL,
	"country" text DEFAULT 'BD' NOT NULL,
	"division" text,
	"district" text,
	"thana" text,
	"area" text,
	"detail" text NOT NULL,
	"postcode" text,
	"fields" jsonb,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"customer_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"reserved_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_item" (
	"id" text PRIMARY KEY NOT NULL,
	"cart_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"reserved_qty" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" text PRIMARY KEY NOT NULL,
	"public_code" text NOT NULL,
	"customer_id" text,
	"phone_e164" text NOT NULL,
	"email" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"risk_score" integer,
	"risk_band" text,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"subtotal_minor" integer NOT NULL,
	"discount_minor" integer DEFAULT 0 NOT NULL,
	"shipping_minor" integer DEFAULT 0 NOT NULL,
	"tax_minor" integer DEFAULT 0 NOT NULL,
	"total_minor" integer NOT NULL,
	"advance_minor" integer DEFAULT 0 NOT NULL,
	"paid_minor" integer DEFAULT 0 NOT NULL,
	"payment_method" text DEFAULT 'cod' NOT NULL,
	"shipping_address_id" text,
	"note" text,
	"staff_note" text,
	"attribution" jsonb,
	"cancel_reason" text,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_event" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"type" text NOT NULL,
	"message" text,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"variant_id" text,
	"product_id" text,
	"title" text NOT NULL,
	"variant_title" text,
	"sku" text,
	"image_url" text,
	"unit_price_minor" integer NOT NULL,
	"qty" integer NOT NULL,
	"total_minor" integer NOT NULL,
	"unit_cost_minor" integer
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"provider" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reference" text,
	"idempotency_key" text NOT NULL,
	"raw" jsonb,
	"verified_by" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_zone" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"districts" text[] DEFAULT '{}' NOT NULL,
	"charge_minor" integer NOT NULL,
	"free_over_minor" integer,
	"advance_minor" integer DEFAULT 0 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_user" ADD CONSTRAINT "admin_user_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_admin_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admin_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand" ADD CONSTRAINT "brand_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_product" ADD CONSTRAINT "collection_product_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_product" ADD CONSTRAINT "collection_product_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option" ADD CONSTRAINT "option_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_value" ADD CONSTRAINT "option_value_option_id_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant" ADD CONSTRAINT "variant_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_option_value" ADD CONSTRAINT "variant_option_value_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_option_value" ADD CONSTRAINT "variant_option_value_option_value_id_option_value_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "public"."option_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cart_id_cart_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."cart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_shipping_address_id_address_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."address"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_user_email_idx" ON "admin_user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_phone_idx" ON "customer" USING btree ("phone_e164");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_type","user_id");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "media_created_idx" ON "media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "outbox_unprocessed_idx" ON "outbox" USING btree ("processed_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_idem_idx" ON "outbox" USING btree ("topic","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_slug_idx" ON "brand" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "category_slug_idx" ON "category" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "category_path_idx" ON "category" USING btree ("path");--> statement-breakpoint
CREATE INDEX "category_parent_idx" ON "category" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_slug_idx" ON "collection" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "collection_product_order_idx" ON "collection_product" USING btree ("collection_id","position");--> statement-breakpoint
CREATE INDEX "option_product_idx" ON "option" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "option_value_option_idx" ON "option_value" USING btree ("option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_slug_idx" ON "product" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "product_status_idx" ON "product" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "product_category_idx" ON "product" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_source_idx" ON "product" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "product_media_order_idx" ON "product_media" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "redirect_from_idx" ON "redirect" USING btree ("from_path");--> statement-breakpoint
CREATE INDEX "variant_product_idx" ON "variant" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "variant_sku_idx" ON "variant" USING btree ("sku");--> statement-breakpoint
CREATE UNIQUE INDEX "variant_source_idx" ON "variant" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "vov_value_idx" ON "variant_option_value" USING btree ("option_value_id");--> statement-breakpoint
CREATE INDEX "address_customer_idx" ON "address" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_token_idx" ON "cart" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "cart_stale_idx" ON "cart" USING btree ("status","reserved_until");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_item_variant_idx" ON "cart_item" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_code_idx" ON "order" USING btree ("public_code");--> statement-breakpoint
CREATE INDEX "order_phone_idx" ON "order" USING btree ("phone_e164");--> statement-breakpoint
CREATE INDEX "order_status_idx" ON "order" USING btree ("status","placed_at");--> statement-breakpoint
CREATE INDEX "order_verification_idx" ON "order" USING btree ("verification_status","placed_at");--> statement-breakpoint
CREATE INDEX "order_event_order_idx" ON "order_event" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_item_order_idx" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_idem_idx" ON "payment" USING btree ("provider","idempotency_key");--> statement-breakpoint
CREATE INDEX "payment_order_idx" ON "payment" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_reference_idx" ON "payment" USING btree ("reference");