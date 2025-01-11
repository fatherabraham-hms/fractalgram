import { integer, pgTable, timestamp, varchar, text, serial } from "drizzle-orm/pg-core";

export const OrganizationsPgTable = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }),
  status: integer('status'),
  description: text('description'),
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  social_1: varchar('social_1', { length: 255 }),
  social_2: varchar('social_2', { length: 255 }),
  social_3: varchar('social_3', { length: 255 }),
  created: timestamp('created', { mode: 'date'}),
  updated: timestamp('updated', { mode: 'date' }).notNull().default(new Date())
});
