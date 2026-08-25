CREATE TABLE "fraud_check" (
	"id" text PRIMARY KEY NOT NULL,
	"phone_e164" text NOT NULL,
	"provider" text NOT NULL,
	"delivered" integer DEFAULT 0 NOT NULL,
	"returned" integer DEFAULT 0 NOT NULL,
	"score" integer NOT NULL,
	"band" text NOT NULL,
	"raw" jsonb,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"to_address" text NOT NULL,
	"template" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"provider" text,
	"provider_ref" text,
	"error" text,
	"idempotency_key" text NOT NULL,
	"order_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fraud_phone_idx" ON "fraud_check" USING btree ("phone_e164","checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fraud_phone_provider_idx" ON "fraud_check" USING btree ("phone_e164","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "message_idem_idx" ON "message" USING btree ("channel","idempotency_key");--> statement-breakpoint
CREATE INDEX "message_order_idx" ON "message" USING btree ("order_id");