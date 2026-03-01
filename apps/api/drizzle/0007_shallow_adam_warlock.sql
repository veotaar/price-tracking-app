ALTER TABLE "country" ALTER COLUMN "currency" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "exchange_rate" ALTER COLUMN "currency" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "price" ALTER COLUMN "currency" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."currency";--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('EUR', 'GBP', 'SEK', 'NOK', 'PLN', 'TRY', 'CZK', 'CHF', 'DKK', 'HUF', 'RON', 'AED', 'QAR', 'KWD', 'SGD', 'JPY', 'KRW', 'INR', 'MYR', 'THB', 'PHP', 'HKD', 'TWD', 'AUD', 'NZD', 'USD', 'CAD', 'MXN', 'BRL', 'ARS', 'CLP', 'COP');--> statement-breakpoint
ALTER TABLE "country" ALTER COLUMN "currency" SET DATA TYPE "public"."currency" USING "currency"::"public"."currency";--> statement-breakpoint
ALTER TABLE "exchange_rate" ALTER COLUMN "currency" SET DATA TYPE "public"."currency" USING "currency"::"public"."currency";--> statement-breakpoint
ALTER TABLE "price" ALTER COLUMN "currency" SET DATA TYPE "public"."currency" USING "currency"::"public"."currency";