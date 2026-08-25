CREATE TABLE "attribute" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"unit" text,
	"is_filterable" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_attribute" (
	"product_id" text NOT NULL,
	"attribute_id" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "product_attribute_product_id_attribute_id_pk" PRIMARY KEY("product_id","attribute_id")
);
--> statement-breakpoint
ALTER TABLE "attribute" ADD CONSTRAINT "attribute_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attribute" ADD CONSTRAINT "product_attribute_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attribute" ADD CONSTRAINT "product_attribute_attribute_id_attribute_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attribute"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attribute_code_idx" ON "attribute" USING btree ("category_id","code");--> statement-breakpoint
CREATE INDEX "attribute_category_idx" ON "attribute" USING btree ("category_id","sort");--> statement-breakpoint
CREATE INDEX "product_attribute_facet_idx" ON "product_attribute" USING btree ("attribute_id","value");