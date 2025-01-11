import { pgTable, varchar } from "drizzle-orm/pg-core";
import { integer, serial, timestamp } from 'drizzle-orm/pg-core';
import { UsersPgTable } from '@/lib/postgres_drizzle/users.orm';
import { ConsensusSessionsPgTable } from '@/lib/postgres_drizzle/consensus_sessions.orm';
import { smallint } from 'drizzle-orm/pg-core/columns/smallint';
import { sql } from 'drizzle-orm';

export const ConsensusGroupsPgTable = pgTable('consensus_groups', {
  groupid: serial('groupid').primaryKey(),
  sessionid: integer('sessionid').references(() => ConsensusSessionsPgTable.sessionid),
  groupstatus: smallint('groupstatus'),
  grouplabel: varchar('grouplabel'),
  modifiedbyid: integer('modifiedbyid').references(() => UsersPgTable.id),
  created: timestamp('created', { mode: 'date'}),
  updated: timestamp('updated', { mode: 'date' }).notNull().default(sql`now()`),
});
