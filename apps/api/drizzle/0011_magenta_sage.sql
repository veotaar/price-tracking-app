ALTER TABLE "product" ADD COLUMN "comparison_basis" text;--> statement-breakpoint
ALTER TABLE "product_item" ADD COLUMN "normalization_factor" numeric(12, 6) DEFAULT '1' NOT NULL;