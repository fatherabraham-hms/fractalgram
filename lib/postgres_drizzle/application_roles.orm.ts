import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const ApplicationRolesPgTable = pgTable('application_roles', {
  id: serial('id').primaryKey(),
  rolelabel: varchar('rolelabel', { length: 100 }),
  permissions: integer('permissions'),
  created: timestamp('created', { mode: 'date'}),
  updated: timestamp('updated', { mode: 'date' }).notNull().default(new Date()),
});
