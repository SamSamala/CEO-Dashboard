import "dotenv/config";
import { defineConfig } from "prisma/config";

// Neon pooler URLs contain "-pooler" in the hostname.
// Migrations need a direct (non-pooled) connection to acquire advisory locks.
// Auto-strip "-pooler" so non-technical users don't need a separate DIRECT_URL.
const dbUrl = process.env["DATABASE_URL"] ?? "";
const directUrl = process.env["DIRECT_URL"] ?? dbUrl.replace(/-pooler(\.\S)/g, "$1");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: directUrl || dbUrl,
  },
});
