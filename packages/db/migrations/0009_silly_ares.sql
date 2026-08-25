CREATE TABLE "chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"direction" text NOT NULL,
	"body" text NOT NULL,
	"sent_by" text,
	"was_suggested" boolean DEFAULT false NOT NULL,
	"external_id" text,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delivered_at" timestamp with time zone,
	"failed_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"external_id" text NOT NULL,
	"display_name" text,
	"phone_e164" text,
	"last_order_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to" text,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_preview" text,
	"unread_count" text DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_sent_by_admin_user_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."admin_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_last_order_id_order_id_fk" FOREIGN KEY ("last_order_id") REFERENCES "public"."order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_assigned_to_admin_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."admin_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_message_thread_idx" ON "chat_message" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_message_external_idx" ON "chat_message" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_channel_external_idx" ON "conversation" USING btree ("channel","external_id");--> statement-breakpoint
CREATE INDEX "conversation_inbox_idx" ON "conversation" USING btree ("status","last_message_at");