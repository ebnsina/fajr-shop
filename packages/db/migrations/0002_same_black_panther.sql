CREATE TABLE "courier_settlement" (
	"id" text PRIMARY KEY NOT NULL,
	"courier" text NOT NULL,
	"reference" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"fee_minor" integer DEFAULT 0 NOT NULL,
	"settled_at" timestamp with time zone NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"courier" text NOT NULL,
	"consignment_id" text,
	"tracking_code" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"cod_amount_minor" integer DEFAULT 0 NOT NULL,
	"cod_settled_at" timestamp with time zone,
	"settlement_id" text,
	"delivery_fee_minor" integer,
	"label_url" text,
	"district" text,
	"thana" text,
	"failure_reason" text,
	"pushed_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"raw" jsonb,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_settlement_id_courier_settlement_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."courier_settlement"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_ref_idx" ON "courier_settlement" USING btree ("courier","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "shipment_idem_idx" ON "shipment" USING btree ("courier","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "shipment_consignment_idx" ON "shipment" USING btree ("courier","consignment_id");--> statement-breakpoint
CREATE INDEX "shipment_order_idx" ON "shipment" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "shipment_status_idx" ON "shipment" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "shipment_routing_idx" ON "shipment" USING btree ("courier","district","thana","status");--> statement-breakpoint
CREATE INDEX "shipment_unsettled_idx" ON "shipment" USING btree ("cod_settled_at");