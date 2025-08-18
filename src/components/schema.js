import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  hashed_password: text('hashed_password').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});
