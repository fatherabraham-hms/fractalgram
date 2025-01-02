import { integer, pgTable, timestamp, serial } from 'drizzle-orm/pg-core';
import { ConsensusGroupsPgTable } from '@/lib/postgres_drizzle/consensus_groups.orm';
import { UsersPgTable } from '@/lib/postgres_drizzle/users.orm';
import { ConsensusSessionsPgTable } from '@/lib/postgres_drizzle/consensus_sessions.orm';
import { smallint } from 'drizzle-orm/pg-core/columns/smallint';
import { sql } from 'drizzle-orm';

export const ConsensusVotesPgTable = pgTable('consensus_votes', {
  voteid: serial('voteid').primaryKey(),
  votedfor: integer('votedfor').references(() => UsersPgTable.id),
  sessionid: integer('sessionid').references(() => ConsensusSessionsPgTable.sessionid),
  groupid: integer('groupid').references(() => ConsensusGroupsPgTable.groupid),
  rankingvalue: smallint('rankingvalue'),
  modifiedbyid: integer('modifiedbyid').references(() => UsersPgTable.id),
  created: timestamp('created', { mode: 'date'}),
  updated: timestamp('updated', { mode: 'date' }).notNull().default(sql`now()`),
});
