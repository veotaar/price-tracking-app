CREATE TABLE "exchange_rate" (
	"currency" "currency" NOT NULL,
	"rate" numeric(16, 8) NOT NULL,
	"time" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "price" ADD COLUMN "currency" "currency" NOT NULL;--> statement-breakpoint
CREATE INDEX "exchange_rate_currency_time_idx" ON "exchange_rate" USING btree ("currency","time");