import { integer, pgTable, timestamp, smallint, serial, jsonb } from 'drizzle-orm/pg-core';
import { ConsensusSessionsPgTable } from '@/lib/postgres_drizzle/consensus_sessions.orm';
import { UsersPgTable } from '@/lib/postgres_drizzle/users.orm';
import { sql } from 'drizzle-orm';

export const OnchainProposalsPgTable = pgTable('onchain_proposals', {
  proposalsubmissionid: serial('proposalsubmissionid').primaryKey(),
  proposaljson: jsonb('proposaljson'),
  sessionid: integer('sessionid').references(() => ConsensusSessionsPgTable.sessionid),
  onchainproposalstatus: smallint('onchainproposalstatus'),
  modifiedbyid: integer('modifiedbyid').references(() => UsersPgTable.id),
  created: timestamp('created', { mode: 'date' }),
  updated: timestamp('updated', { mode: 'date' }).notNull().default(sql`now()`),
});
