import { betterAuth } from "better-auth";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const authDatabaseUrl = databaseUrl.includes("?")
  ? `${databaseUrl}&options=-c%20search_path%3Dauth`
  : `${databaseUrl}?options=-c%20search_path%3Dauth`;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,

  database: new Pool({
    connectionString: authDatabaseUrl,
  }),

  emailAndPassword: {
    enabled: true,
  },

  advanced: {
    database: {
      joins: true,
    },
  },
});