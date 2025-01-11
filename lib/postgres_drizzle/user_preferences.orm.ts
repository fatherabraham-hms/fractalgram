import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const UserPreferencesPgTable = pgTable('user_preferences', {
  userid: integer('userid'),
  preferencekey: varchar('preferencekey', { length: 50 }),
  preferencevalue: varchar('preferencevalue', { length: 50 }),
  created: timestamp('created', { mode: 'date'}),
  updated: timestamp('updated', { mode: 'date' }).notNull().default(new Date())
});
