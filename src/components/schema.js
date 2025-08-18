import { pgTable, serial, text, timestamp, json } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  hashed_password: text('hashed_password'),        // Optional for OAuth
  verified: text('verified').default('true'),      // Set true for OAuth users
  oauth_provider: text('oauth_provider'),          // e.g., 'github', 'google'
  meta: json('meta'),                              // store profile info
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
