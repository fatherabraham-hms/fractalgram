import { boolean, timestamp, integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const UsersPgTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  username: varchar('username', { length: 50 }),
  email: varchar('email', { length: 50 }),
  telegram: varchar('telegram', { length: 50 }),
  walletaddress: varchar('walletaddress', { length: 50 }),
  loggedin: boolean('loggedin'),
  lastlogin: timestamp('lastlogin').notNull().default(sql`now()`),
  permissions: integer('permissions'),
  privymapid: integer('privymapid'),
});
