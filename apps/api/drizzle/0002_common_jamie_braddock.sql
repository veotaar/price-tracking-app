CREATE TYPE "public"."currency" AS ENUM('EUR', 'GBP', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'CHF', 'ISK', 'TRY', 'RSD', 'UAH');--> statement-breakpoint
CREATE TYPE "public"."strategy" AS ENUM('fetch', 'browser');--> statement-breakpoint
CREATE TABLE "country" (
	"id" text PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"currency" "currency" NOT NULL,
	"created_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "country_name_unique" UNIQUE("name"),
	CONSTRAINT "country_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" text PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"site_id" text NOT NULL,
	"url" text NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "item_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "price" (
	"item_id" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"time" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_item" (
	"id" text PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"product_id" text NOT NULL,
	"item_id" text NOT NULL,
	"created_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "product_item_product_id_item_id_unique" UNIQUE("product_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "site" (
	"id" text PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"hostname" text NOT NULL,
	"price_css_selector" text NOT NULL,
	"name_css_selector" text NOT NULL,
	"strategy" "strategy" DEFAULT 'fetch' NOT NULL,
	"country_id" text NOT NULL,
	"created_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"updated_at" timestamp DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "site_hostname_unique" UNIQUE("hostname")
);
--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price" ADD CONSTRAINT "price_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_item" ADD CONSTRAINT "product_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_item" ADD CONSTRAINT "product_item_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site" ADD CONSTRAINT "site_country_id_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_site_id_idx" ON "item" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "price_item_id_time_idx" ON "price" USING btree ("item_id","time");--> statement-breakpoint
CREATE INDEX "product_item_product_id_idx" ON "product_item" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_item_item_id_idx" ON "product_item" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "site_country_id_idx" ON "site" USING btree ("country_id");