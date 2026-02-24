import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { drizzle } from "drizzle-orm/node-postgres"
import { env } from "./env"
import * as schema from "./db/schemas/auth-schema"

const db = drizzle(env.DATABASE_URL)

export const auth = betterAuth({
  appName: "tables",

  database: drizzleAdapter(db, { provider: "pg", schema }),

  emailAndPassword: {
    enabled: false,
  },

  socialProviders: {
    gitlab: {
      clientId: env.GITLAB_CLIENT_ID,
      clientSecret: env.GITLAB_CLIENT_SECRET,
      issuer: env.GITLAB_ISSUER,
    },

    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
})
