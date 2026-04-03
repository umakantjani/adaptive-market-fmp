import { defineConfig } from 'prisma/config'
import path from 'node:path'

const localDbPath = path.resolve(process.cwd(), 'prisma', 'adaptive-market.db')

// In production (Vercel), TURSO_DATABASE_URL is set.
// In development, fall back to the local SQLite file.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.TURSO_DATABASE_URL ?? `file:${localDbPath}`,
  },
})
