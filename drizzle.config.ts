import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL?.trim()) {
  throw new Error(
    "Set DATABASE_URL in .env.local before running npm run db:push.",
  );
}
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
});
